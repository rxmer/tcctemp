import { describe, it, expect } from "vitest";
import { traduzirErroAuth } from "../lib/authErrors";

describe("traduzirErroAuth", () => {
  it("traduz senha igual a anterior", () => {
    const err = new Error("New password should be different from the old password.");
    expect(traduzirErroAuth(err)).toBe("A nova senha deve ser diferente da senha atual.");
  });

  it("traduz credenciais invalidas", () => {
    expect(traduzirErroAuth(new Error("Invalid login credentials"))).toBe(
      "E-mail ou senha incorretos."
    );
  });

  it("traduz email nao confirmado", () => {
    expect(traduzirErroAuth(new Error("Email not confirmed"))).toContain("não confirmado");
  });

  it("traduz limite de requisicoes", () => {
    expect(traduzirErroAuth(new Error("Over email send rate limit"))).toContain("Muitas tentativas");
  });

  it("traduz falha de conexao", () => {
    expect(traduzirErroAuth(new Error("Failed to fetch"))).toContain(
      "Não foi possível conectar ao servidor"
    );
  });

  it("traduz sessao invalida ou expirada", () => {
    const err = new Error("User from sub claim in JWT does not exist");
    expect(traduzirErroAuth(err)).toBe("Sessão inválida ou expirada. Solicite um novo link.");
  });

  it("mantem mensagens em portugues do backend sem alteracao", () => {
    expect(traduzirErroAuth(new Error("Este e-mail não está cadastrado no sistema."))).toBe(
      "Este e-mail não está cadastrado no sistema."
    );
  });

  it("aceita string direta", () => {
    expect(traduzirErroAuth("Invalid login credentials")).toBe("E-mail ou senha incorretos.");
  });

  it("usa mensagem padrao quando vazio", () => {
    expect(traduzirErroAuth(null)).toBe("Ocorreu um erro inesperado. Tente novamente.");
    expect(traduzirErroAuth(new Error(""))).toBe("Ocorreu um erro inesperado. Tente novamente.");
  });
});
