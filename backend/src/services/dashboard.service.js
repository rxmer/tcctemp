import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";

export async function resumoDashboard(tenantId) {
  const hoje = new Date().toISOString().split("T")[0];
  const mesAtual = hoje.slice(0, 7);

  try {
    const { count: agendamentosHoje } = await supabaseAdmin
      .from("agendamentos")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("data_agendamento", hoje)
      .neq("status", "cancelado")
      .is("deletado_em", null);

    const { count: servicosRealizados } = await supabaseAdmin
      .from("ordens_servico")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "finalizado")
      .is("deletado_em", null);

    const { count: totalClientes } = await supabaseAdmin
      .from("clientes")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deletado_em", null);

    const proximoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
      .toISOString().split("T")[0];
    const { data: faturamentoMes } = await supabaseAdmin
      .from("faturamentos")
      .select("valor_total")
      .eq("tenant_id", tenantId)
      .gte("criado_em", `${mesAtual}-01`)
      .lt("criado_em", proximoMes);

    const faturamentoTotal = (faturamentoMes ?? []).reduce(
      (acc, f) => acc + Number(f.valor_total),
      0
    );

    const { data: proximosAgendamentos } = await supabaseAdmin
      .from("agendamentos")
      .select("*, cliente:clientes(nome), veiculo:veiculos(marca, modelo, placa), servico:servico(nome_servico)")
      .eq("tenant_id", tenantId)
      .gte("data_agendamento", hoje)
      .in("status", ["pendente", "confirmado"])
      .is("deletado_em", null)
      .order("data_agendamento", { ascending: true })
      .order("hora_agendamento", { ascending: true })
      .limit(5);

    return {
      agendamentos_hoje: agendamentosHoje ?? 0,
      servicos_realizados: servicosRealizados ?? 0,
      total_clientes: totalClientes ?? 0,
      faturamento_mes: faturamentoTotal,
      proximos_agendamentos: proximosAgendamentos ?? [],
    };
  } catch (err) {
    throw new AppError(`Erro ao carregar dashboard: ${err.message}`);
  }
}
