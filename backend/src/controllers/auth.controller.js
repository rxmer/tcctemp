import * as authService from "../services/auth.service.js";

export async function signup(req, res) {
  const { nomeEmpresa, nome, email, senha } = req.body;

  if (!nomeEmpresa || !nome || !email || !senha) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  if (senha.length < 8) {
    return res.status(400).json({ error: "Senha deve ter no mínimo 8 caracteres" });
  }

  const result = await authService.signup({ nomeEmpresa, nome, email, senha });
  res.status(201).json(result);
}

export async function me(req, res) {
  const profile = await authService.getProfile(req.userId);
  res.json({
    user: {
      id: req.userId,
      email: req.userEmail,
      user_metadata: req.userMetadata,
    },
    ...profile,
  });
}
