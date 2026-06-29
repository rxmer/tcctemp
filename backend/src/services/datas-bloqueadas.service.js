import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";

export async function listarDatasBloqueadas(tenantId, ano = null) {
  let query = supabaseAdmin
    .from("datas_bloqueadas")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("data", { ascending: true });

  if (ano) {
    query = query.gte("data", `${ano}-01-01`).lte("data", `${ano}-12-31`);
  }

  const { data, error } = await query;
  if (error) throw new AppError(`Erro ao listar datas bloqueadas: ${error.message}`);
  return data ?? [];
}

export async function criarDataBloqueada({ data, motivo, tenantId }) {
  if (!data) throw new AppError("Data é obrigatória", 400);

  const { data: existing } = await supabaseAdmin
    .from("datas_bloqueadas")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("data", data)
    .maybeSingle();

  if (existing) throw new AppError("Esta data já está bloqueada", 409);

  const { data: created, error } = await supabaseAdmin
    .from("datas_bloqueadas")
    .insert({ data, motivo: motivo || null, tenant_id: tenantId })
    .select()
    .single();

  if (error) throw new AppError(`Erro ao bloquear data: ${error.message}`);
  return created;
}

export async function removerDataBloqueada(id, tenantId) {
  const { error } = await supabaseAdmin
    .from("datas_bloqueadas")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) throw new AppError(`Erro ao remover bloqueio: ${error.message}`);
}

export async function verificarDataBloqueada(tenantId, data) {
  const { data: bloqueio, error } = await supabaseAdmin
    .from("datas_bloqueadas")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("data", data)
    .maybeSingle();

  if (error) throw new AppError(`Erro ao verificar data bloqueada: ${error.message}`);
  return !!bloqueio;
}
