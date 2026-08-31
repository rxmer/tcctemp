import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/notificacoes.service.js", () => ({
  criarNotificacao: vi.fn().mockResolvedValue({}),
}));

import { normalizarNumero, ehNumeroProprio } from "../chatbot/baileys.client.js";

describe("normalizarNumero", () => {
  it("extrai o numero de um jid comum", () => {
    expect(normalizarNumero("5511999999999@s.whatsapp.net")).toBe("11999999999");
  });

  it("extrai o numero de um jid com device (:porta)", () => {
    expect(normalizarNumero("5511999999999:15@s.whatsapp.net")).toBe("11999999999");
  });

  it("nao remove o DDI quando nao ha DDI (ex.: jid sem pais)", () => {
    expect(normalizarNumero("1199999999@s.whatsapp.net")).toBe("1199999999");
  });

  it("retorna null para entradas vazias", () => {
    expect(normalizarNumero(null)).toBeNull();
    expect(normalizarNumero(undefined)).toBeNull();
    expect(normalizarNumero("")).toBeNull();
  });

  it("extrai numero de um jid @lid (sem mapping retorna o token cru)", () => {
    const numero = normalizarNumero("38912345678@lid");
    expect(numero).toBe("38912345678");
  });
});

describe("ehNumeroProprio", () => {
  it("retorna true quando o remetente e o proprio numero conectado", () => {
    expect(ehNumeroProprio("5511999999999@s.whatsapp.net", "11999999999")).toBe(true);
  });

  it("retorna true quando o remoteJid vem com @lid do proprio numero", () => {
    expect(ehNumeroProprio("5511999999999@lid", "11999999999")).toBe(true);
  });

  it("retorna false para numero de outro cliente", () => {
    expect(ehNumeroProprio("5511988887777@s.whatsapp.net", "11999999999")).toBe(false);
  });

  it("retorna false quando ownNumber nao esta disponivel", () => {
    expect(ehNumeroProprio("5511999999999@s.whatsapp.net", null)).toBe(false);
    expect(ehNumeroProprio("5511999999999@s.whatsapp.net", undefined)).toBe(false);
  });

  it("retorna false para entradas invalidas", () => {
    expect(ehNumeroProprio(null, "11999999999")).toBe(false);
    expect(ehNumeroProprio("", "11999999999")).toBe(false);
  });
});
