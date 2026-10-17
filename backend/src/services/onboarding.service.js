import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";
import { logger } from "../config/logger.js";

export const TERMOS_VERSAO = "2026-01";

const SERVICOS_PADRAO = [
  { nome_servico: "Lavagem Simples", descricao: "Lavagem externa e secagem", preco_base: 40, duracao_min: 30 },
  { nome_servico: "Lavagem Completa", descricao: "Lavagem externa, interna e cera", preco_base: 80, duracao_min: 60 },
  { nome_servico: "Enceramento", descricao: "Aplicação de cera protetora", preco_base: 120, duracao_min: 90 },
  { nome_servico: "Polimento Técnico", descricao: "Correção e polimento da pintura", preco_base: 350, duracao_min: 180 },
  { nome_servico: "Higienização Interna", descricao: "Limpeza profunda do interior", preco_base: 200, duracao_min: 120 },
];

const DIAS_UTEIS = [1, 2, 3, 4, 5];

export async function seedTenantDefaults(tenantId) {
  const servicos = SERVICOS_PADRAO.map((s) => ({ ...s, tenant_id: tenantId }));
  const expediente = DIAS_UTEIS.map((dia) => ({
    dia_semana: dia,
    abertura: "08:00",
    fechamento: "18:00",
    ativo: true,
    tenant_id: tenantId,
  }));

  const [{ error: servicoError }, { error: expedienteError }] = await Promise.all([
    supabaseAdmin.from("servico").insert(servicos),
    supabaseAdmin.from("configuracao_expediente").insert(expediente),
  ]);

  if (servicoError) {
    logger.warn({ err: servicoError }, "Erro ao criar serviços padrão do onboarding");
  }
  if (expedienteError) {
    logger.warn({ err: expedienteError }, "Erro ao criar expediente padrão do onboarding");
  }
}

export async function statusOnboarding(tenantId) {
  try {
    const [servicosRes, expedienteRes, empresaRes] = await Promise.all([
      supabaseAdmin
        .from("servico")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .is("deletado_em", null),
      supabaseAdmin
        .from("configuracao_expediente")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("ativo", true),
      supabaseAdmin
        .from("configuracao_empresa")
        .select("telefone, endereco, cnpj")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);

    if (servicosRes.error) throw servicosRes.error;
    if (expedienteRes.error) throw expedienteRes.error;
    if (empresaRes.error) throw empresaRes.error;

    const empresa = empresaRes.data ?? {};

    return {
      servicos: (servicosRes.count ?? 0) > 0,
      expediente: (expedienteRes.count ?? 0) > 0,
      empresa: Boolean(empresa.telefone || empresa.endereco || empresa.cnpj),
    };
  } catch (err) {
    throw new AppError(`Erro ao carregar status do onboarding: ${err.message}`);
  }
}
