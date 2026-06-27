import { describe, it, expect, vi, beforeEach } from "vitest";
import { veiculosService } from "../services/veiculos.service";

vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../services/api";

describe("veiculosService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listar chama apiFetch com url basica", () => {
    veiculosService.listar();
    expect(apiFetch).toHaveBeenCalledWith("/api/veiculos");
  });

  it("listar passa page, limit e search como query params", () => {
    veiculosService.listar({ page: 1, limit: 10, search: "Fiat" });
    const url = apiFetch.mock.calls[0][0];
    expect(url).toContain("page=1");
    expect(url).toContain("limit=10");
    expect(url).toContain("search=Fiat");
  });

  it("criar chama apiFetch com POST e body", () => {
    const dados = { marca: "Fiat", modelo: "Uno", placa: "ABC1234" };
    veiculosService.criar(dados);
    expect(apiFetch).toHaveBeenCalledWith("/api/veiculos", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  });

  it("atualizar chama apiFetch com PUT e body", () => {
    const dados = { modelo: "Uno Mille" };
    veiculosService.atualizar(1, dados);
    expect(apiFetch).toHaveBeenCalledWith("/api/veiculos/1", {
      method: "PUT",
      body: JSON.stringify(dados),
    });
  });

  it("deletar chama apiFetch com DELETE", () => {
    veiculosService.deletar(2);
    expect(apiFetch).toHaveBeenCalledWith("/api/veiculos/2", {
      method: "DELETE",
    });
  });
});
