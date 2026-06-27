import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";

const DIAS_SEMANA = [
  { id: 0, nome: "Domingo" },
  { id: 1, nome: "Segunda-feira" },
  { id: 2, nome: "Terça-feira" },
  { id: 3, nome: "Quarta-feira" },
  { id: 4, nome: "Quinta-feira" },
  { id: 5, nome: "Sexta-feira" },
  { id: 6, nome: "Sábado" },
];

export async function listarExpediente(tenantId) {
  const { data, error } = await supabaseAdmin
    .from("configuracao_expediente")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("dia_semana", { ascending: true });

  if (error) throw new AppError(`Erro ao listar expediente: ${error.message}`);

  const expedienteMap = {};
  for (const row of data) {
    expedienteMap[row.dia_semana] = row;
  }

  return DIAS_SEMANA.map((dia) => ({
    dia_semana: dia.id,
    dia_nome: dia.nome,
    expediente_id: expedienteMap[dia.id]?.expediente_id ?? null,
    abertura: expedienteMap[dia.id]?.abertura ?? null,
    fechamento: expedienteMap[dia.id]?.fechamento ?? null,
    ativo: expedienteMap[dia.id]?.ativo ?? false,
  }));
}

function normalizeTime(val) {
  if (val === "" || val == null) return null;
  return val;
}

export async function upsertExpediente(dia_semana, tenantId, { abertura, fechamento, ativo }) {
  const aberturaOk = normalizeTime(abertura);
  const fechamentoOk = normalizeTime(fechamento);

  const { data: existing } = await supabaseAdmin
    .from("configuracao_expediente")
    .select("expediente_id")
    .eq("dia_semana", dia_semana)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!existing && ativo === false) {
    return null;
  }

  if (aberturaOk == null || fechamentoOk == null) {
    if (ativo !== false) {
      throw new AppError(`Informe horários de abertura e fechamento para ativar ${DIAS_SEMANA[dia_semana]?.nome ?? "o dia"}`, 400);
    }
  }

  if (existing) {
    const updates = {};
    if (ativo !== undefined) updates.ativo = ativo;
    if (aberturaOk != null) updates.abertura = aberturaOk;
    if (fechamentoOk != null) updates.fechamento = fechamentoOk;

    const { data, error } = await supabaseAdmin
      .from("configuracao_expediente")
      .update(updates)
      .eq("expediente_id", existing.expediente_id)
      .select()
      .single();

    if (error) throw new AppError(`Erro ao atualizar expediente: ${error.message}`);
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from("configuracao_expediente")
    .insert({ dia_semana, abertura: aberturaOk, fechamento: fechamentoOk, ativo: ativo ?? true, tenant_id: tenantId })
    .select()
    .single();

  if (error) throw new AppError(`Erro ao criar expediente: ${error.message}`);
  return data;
}
