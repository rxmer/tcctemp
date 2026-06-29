import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";

export async function buscarConfiguracao(tenantId) {
  const { data, error } = await supabaseAdmin
    .from("configuracao_empresa")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw new AppError(`Erro ao buscar configuração: ${error.message}`);
  return data ?? null;
}

export async function salvarConfiguracao({ tenantId, nome_fantasia, cnpj, telefone, email, endereco, logo_url }) {
  const existing = await buscarConfiguracao(tenantId);

  if (existing) {
    const updates = {};
    if (nome_fantasia !== undefined) updates.nome_fantasia = nome_fantasia;
    if (cnpj !== undefined) updates.cnpj = cnpj;
    if (telefone !== undefined) updates.telefone = telefone;
    if (email !== undefined) updates.email = email;
    if (endereco !== undefined) updates.endereco = endereco;
    if (logo_url !== undefined) updates.logo_url = logo_url;

    const { data, error } = await supabaseAdmin
      .from("configuracao_empresa")
      .update(updates)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) throw new AppError(`Erro ao atualizar configuração: ${error.message}`);
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from("configuracao_empresa")
    .insert({
      tenant_id: tenantId,
      nome_fantasia: nome_fantasia || null,
      cnpj: cnpj || null,
      telefone: telefone || null,
      email: email || null,
      endereco: endereco || null,
      logo_url: logo_url || null,
    })
    .select()
    .single();

  if (error) throw new AppError(`Erro ao criar configuração: ${error.message}`);
  return data;
}
