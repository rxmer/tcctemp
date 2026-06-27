import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";

export async function criarNotificacao({ tenantId, tipo, titulo, mensagem, referenciaTipo, referenciaId }) {
  const { data, error } = await supabaseAdmin
    .from("notificacoes")
    .insert({
      tenant_id: tenantId,
      tipo,
      titulo,
      mensagem: mensagem ?? null,
      referencia_tipo: referenciaTipo ?? null,
      referencia_id: referenciaId ?? null,
    })
    .select()
    .single();

  if (error) throw new AppError(`Erro ao criar notificação: ${error.message}`);
  return data;
}

export async function listarNotificacoes(tenantId, { apenasNaoLidas } = {}) {
  let query = supabaseAdmin
    .from("notificacoes")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("criado_em", { ascending: false })
    .limit(50);

  if (apenasNaoLidas) {
    query = query.eq("lida", false);
  }

  const { data, error } = await query;
  if (error) throw new AppError(`Erro ao listar notificações: ${error.message}`);
  return data;
}

export async function marcarComoLida(id, tenantId) {
  const { data, error } = await supabaseAdmin
    .from("notificacoes")
    .update({ lida: true })
    .eq("notificacao_id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw new AppError(`Erro ao marcar notificação como lida: ${error.message}`);
  return data;
}

export async function marcarTodasComoLidas(tenantId) {
  const { error } = await supabaseAdmin
    .from("notificacoes")
    .update({ lida: true })
    .eq("tenant_id", tenantId)
    .eq("lida", false);

  if (error) throw new AppError(`Erro ao marcar notificações como lidas: ${error.message}`);
}

export async function contarNaoLidas(tenantId) {
  const { count, error } = await supabaseAdmin
    .from("notificacoes")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("lida", false);

  if (error) throw new AppError(`Erro ao contar notificações: ${error.message}`);
  return count;
}
