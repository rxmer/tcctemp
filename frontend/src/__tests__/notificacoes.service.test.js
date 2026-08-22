import { describe, it, expect, vi, beforeEach } from "vitest";
import { notificacoesService } from "../services/notificacoes.service";

vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../services/api";

describe("notificacoesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listar chama apiFetch com url basica", () => {
    notificacoesService.listar();
    expect(apiFetch).toHaveBeenCalledWith("/api/notificacoes");
  });

  it("listar com apenasNaoLidas=true passa query param", () => {
    notificacoesService.listar(true);
    expect(apiFetch).toHaveBeenCalledWith("/api/notificacoes?apenas_nao_lidas=true");
  });

  it("listar com apenasNaoLidas=false nao passa query param", () => {
    notificacoesService.listar(false);
    expect(apiFetch).toHaveBeenCalledWith("/api/notificacoes");
  });

  it("contar chama apiFetch com url correta", () => {
    notificacoesService.contar();
    expect(apiFetch).toHaveBeenCalledWith("/api/notificacoes/contagem");
  });

  it("marcarLida chama apiFetch com PATCH", () => {
    notificacoesService.marcarLida(7);
    expect(apiFetch).toHaveBeenCalledWith("/api/notificacoes/7/lida", {
      method: "PATCH",
    });
  });

  it("marcarTodasLidas chama apiFetch com POST", () => {
    notificacoesService.marcarTodasLidas();
    expect(apiFetch).toHaveBeenCalledWith("/api/notificacoes/marcar-todas-lidas", {
      method: "POST",
    });
  });

  it("listar retorna o resultado de apiFetch", async () => {
    const mockData = { data: [] };
    apiFetch.mockResolvedValue(mockData);
    const result = await notificacoesService.listar();
    expect(result).toEqual(mockData);
  });
});
