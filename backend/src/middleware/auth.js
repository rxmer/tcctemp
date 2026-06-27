import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";

export async function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError("Token não fornecido", 401);
  }

  const token = header.split(" ")[1];

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new AppError("Token inválido ou expirado", 401);
  }

  req.userId = user.id;
  req.userEmail = user.email;
  req.tenantId = user.user_metadata?.tenant_id;
  req.perfil = user.user_metadata?.perfil;
  req.userMetadata = user.user_metadata;

  if (!req.tenantId) {
    throw new AppError("Usuário sem vínculo com empresa", 403);
  }

  next();
}
