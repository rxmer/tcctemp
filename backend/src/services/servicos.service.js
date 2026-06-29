import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";

export async function criarServico({ nome_servico, descricao, preco_base, duracao_min, tenantId }) {
  const { data, error } = await supabaseAdmin
    .from("servico")
    .insert({
      nome_servico,
      descricao,
      preco_base,
      duracao_min,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) throw new AppError(`Erro ao criar serviço: ${error.message}`);
  return data;
}

export async function listarServicos(tenantId, { page = 1, limit = 20, search = "" } = {}) {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("servico")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .is("deletado_em", null);

  if (search) {
    const s = search.replace(/[,%()\\;]/g, "").trim().slice(0, 100);
    if (s) {
      query = query.or(`nome_servico.ilike.%${s}%,descricao.ilike.%${s}%`);
    }
  }

  const { data, error, count } = await query
    .order("servico_id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new AppError(`Erro ao listar serviços: ${error.message}`);
  return { data, total: count, page, limit };
}

export async function atualizarServico(id, tenantId, updates) {
  const { data, error } = await supabaseAdmin
    .from("servico")
    .update(updates)
    .eq("servico_id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw new AppError(`Erro ao atualizar serviço: ${error.message}`);
  return data;
}

export async function deletarServico(id, tenantId) {
  const { count: osAndamento } = await supabaseAdmin
    .from("itens_ordem_servico")
    .select("*", { count: "exact", head: true })
    .eq("servico_id", id)
    .eq("tenant_id", tenantId)
    .is("deletado_em", null);

  if (osAndamento > 0) {
    const { data: itens } = await supabaseAdmin
      .from("itens_ordem_servico")
      .select("os_id")
      .eq("servico_id", id)
      .eq("tenant_id", tenantId)
      .is("deletado_em", null);

    const osIds = (itens ?? []).map((i) => i.os_id);

    if (osIds.length > 0) {
      const { count: osAtivas } = await supabaseAdmin
        .from("ordens_servico")
        .select("*", { count: "exact", head: true })
        .in("os_id", osIds)
        .eq("tenant_id", tenantId)
        .is("deletado_em", null)
        .eq("status", "em_andamento");

      if (osAtivas > 0) {
        throw new AppError("Não é possível excluir um serviço que está em uma OS em andamento", 400);
      }
    }
  }

  const { error } = await supabaseAdmin
    .from("servico")
    .update({ deletado_em: new Date().toISOString() })
    .eq("servico_id", id)
    .eq("tenant_id", tenantId);

  if (error) throw new AppError(`Erro ao deletar serviço: ${error.message}`);
}

export async function toggleAtivoServico(id, tenantId) {
  const { data: current, error: fetchError } = await supabaseAdmin
    .from("servico")
    .select("ativo")
    .eq("servico_id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError) throw new AppError(`Erro ao buscar serviço: ${fetchError.message}`);

  const { data, error } = await supabaseAdmin
    .from("servico")
    .update({ ativo: !current.ativo })
    .eq("servico_id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw new AppError(`Erro ao alterar status: ${error.message}`);
  return data;
}
