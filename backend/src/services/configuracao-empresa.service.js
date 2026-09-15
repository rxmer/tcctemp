import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";

const BUCKET_LOGOS = "logos";

async function persistirLogoUrl(tenantId, logoUrl) {
  if (logoUrl == null) return null;
  if (!logoUrl.startsWith("data:")) return logoUrl;

  const match = logoUrl.match(/^data:(image\/[\w.+-]+);base64,([\s\S]+)$/);
  if (!match) throw new AppError("Logo em base64 inválida");

  const base64 = match[2].replace(/\s+/g, "");
  if (base64.length > 700_000) throw new AppError("Logo muito grande (máx. ~500KB)");

  const buffer = Buffer.from(base64, "base64");
  const path = `tnt_${tenantId}/logo`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET_LOGOS)
    .upload(path, buffer, { contentType: match[1], upsert: true });

  if (error) throw new AppError(`Erro ao salvar logo: ${error.message}`);

  return supabaseAdmin.storage.from(BUCKET_LOGOS).getPublicUrl(path).data.publicUrl;
}

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
    if (logo_url !== undefined) updates.logo_url = await persistirLogoUrl(tenantId, logo_url);

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
      logo_url: logo_url === undefined ? null : await persistirLogoUrl(tenantId, logo_url),
    })
    .select()
    .single();

  if (error) throw new AppError(`Erro ao criar configuração: ${error.message}`);
  return data;
}
