const TRADUCOES = [
  [/new password should be different/i, "A nova senha deve ser diferente da senha atual."],
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "E-mail ainda não confirmado. Verifique sua caixa de entrada."],
  [/already registered|already exists/i, "Já existe uma conta com este e-mail."],
  [/rate limit|too many requests/i, "Muitas tentativas. Aguarde alguns minutos e tente novamente."],
  [/password should be at least/i, "A senha não atende ao tamanho mínimo exigido."],
  [
    /user from sub claim|invalid claim|session missing|not authenticated|jwt/i,
    "Sessão inválida ou expirada. Solicite um novo link.",
  ],
  [
    /failed to fetch|fetch failed|networkerror|network error|load failed/i,
    "Não foi possível conectar ao servidor. Verifique sua conexão.",
  ],
  [/unable to validate email|invalid email|validate the email/i, "E-mail inválido."],
];

export function traduzirErroAuth(err) {
  const msg = typeof err === "string" ? err : (err?.message ?? "");
  if (!msg) return "Ocorreu um erro inesperado. Tente novamente.";

  const regra = TRADUCOES.find(([re]) => re.test(msg));
  return regra ? regra[1] : msg;
}
