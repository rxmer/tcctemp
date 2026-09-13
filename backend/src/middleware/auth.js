import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";
import { cacheGetOrSet, buildCacheKey } from "../utils/cache.js";

const AUTH_PROFILE_TTL = 60;

async function carregarUsuario(userId) {
  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .select("id, tenant_id, perfil")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new AppError(`Erro ao carregar perfil do usuário: ${error.message}`, 500);
  }

  return data;
}

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError("Token não fornecido", 401);
    }

    const token = header.replace(/^Bearer\s+/i, "").trim();

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw new AppError("Token inválido ou expirado", 401);
    }

    const usuario = await cacheGetOrSet(
      buildCacheKey("auth", user.id),
      () => carregarUsuario(user.id),
      AUTH_PROFILE_TTL
    );

    if (!usuario?.tenant_id) {
      throw new AppError("Usuário sem vínculo com empresa", 403);
    }

    req.userId = user.id;
    req.userEmail = user.email;
    req.tenantId = usuario.tenant_id;
    req.perfil = usuario.perfil ?? "funcionario";
    req.userMetadata = user.user_metadata;

    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req, _res, next) {
  if (req.perfil !== "admin") {
    throw new AppError("Acesso restrito a administradores", 403);
  }
  next();
}