import { describe, it, expect, vi, beforeEach } from "vitest";
import { funcionariosService } from "../services/funcionarios.service";

vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../services/api";

describe("funcionariosService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listar chama apiFetch com url correta", () => {
    funcionariosService.listar();
    expect(apiFetch).toHaveBeenCalledWith("/api/funcionarios");
  });

  it("criar chama apiFetch com POST e body", () => {
    const dados = { nome: "João", email: "joao@test.com" };
    funcionariosService.criar(dados);
    expect(apiFetch).toHaveBeenCalledWith("/api/funcionarios", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  });

  it("listar retorna o resultado de apiFetch", async () => {
    const mockData = { data: [{ id: 1, nome: "João" }] };
    apiFetch.mockResolvedValue(mockData);
    const result = await funcionariosService.listar();
    expect(result).toEqual(mockData);
  });
});
