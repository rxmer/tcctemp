import { describe, it, expect, vi, beforeEach } from "vitest";
import { servicosService } from "../services/servicos.service";

vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../services/api";

describe("servicosService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listar chama apiFetch com url basica sem parametros", () => {
    servicosService.listar();
    expect(apiFetch).toHaveBeenCalledWith("/api/servicos");
  });

  it("listar passa page, limit e search como query params", () => {
    servicosService.listar({ page: 1, limit: 20, search: "lavagem" });
    const url = apiFetch.mock.calls[0][0];
    expect(url).toContain("page=1");
    expect(url).toContain("limit=20");
    expect(url).toContain("search=lavagem");
  });

  it("criar chama apiFetch com POST e body", () => {
    const dados = { nome: "Lavagem", preco: 50 };
    servicosService.criar(dados);
    expect(apiFetch).toHaveBeenCalledWith("/api/servicos", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  });

  it("atualizar chama apiFetch com PUT e body", () => {
    const dados = { preco: 60 };
    servicosService.atualizar(1, dados);
    expect(apiFetch).toHaveBeenCalledWith("/api/servicos/1", {
      method: "PUT",
      body: JSON.stringify(dados),
    });
  });

  it("deletar chama apiFetch com DELETE", () => {
    servicosService.deletar(3);
    expect(apiFetch).toHaveBeenCalledWith("/api/servicos/3", {
      method: "DELETE",
    });
  });

  it("toggleAtivo chama apiFetch com PATCH", () => {
    servicosService.toggleAtivo(2);
    expect(apiFetch).toHaveBeenCalledWith("/api/servicos/2/toggle", {
      method: "PATCH",
    });
  });

  it("listar retorna o resultado de apiFetch", async () => {
    const mockData = { data: [], total: 0 };
    apiFetch.mockResolvedValue(mockData);
    const result = await servicosService.listar();
    expect(result).toEqual(mockData);
  });
});
