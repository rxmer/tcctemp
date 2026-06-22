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

export async function listarServicos(tenantId) {
  const { data, error } = await supabaseAdmin
    .from("servico")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("deletado_em", null)
    .order("servico_id", { ascending: false });

  if (error) throw new AppError(`Erro ao listar serviços: ${error.message}`);
  return data;
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
