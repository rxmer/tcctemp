import * as authService from "../services/auth.service.js";

export async function signup(req, res) {
  const { nomeEmpresa, nome, email, senha } = req.body;
  const result = await authService.signup({ nomeEmpresa, nome, email, senha });
  res.status(201).json(result);
}

export async function verificarEmail(req, res) {
  const result = await authService.verificarEmail(req.body);
  res.json(result);
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
