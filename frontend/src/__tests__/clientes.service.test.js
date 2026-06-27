import { describe, it, expect, vi, beforeEach } from "vitest";
import { clientesService } from "../services/clientes.service";

vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../services/api";

describe("clientesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listar chama apiFetch com url basica sem parametros", () => {
    clientesService.listar();
    expect(apiFetch).toHaveBeenCalledWith("/api/clientes");
  });

  it("listar passa page e limit como query params", () => {
    clientesService.listar({ page: 2, limit: 10 });
    expect(apiFetch).toHaveBeenCalledWith("/api/clientes?page=2&limit=10");
  });

  it("listar passa search como query param", () => {
    clientesService.listar({ search: "joao" });
    expect(apiFetch).toHaveBeenCalledWith("/api/clientes?search=joao");
  });

  it("listar combina todos os parametros", () => {
    clientesService.listar({ page: 1, limit: 20, search: "maria" });
    const url = apiFetch.mock.calls[0][0];
    expect(url).toContain("page=1");
    expect(url).toContain("limit=20");
    expect(url).toContain("search=maria");
  });

  it("criar chama apiFetch com POST e body", () => {
    const dados = { nome: "João", telefone: "11999999999" };
    clientesService.criar(dados);
    expect(apiFetch).toHaveBeenCalledWith("/api/clientes", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  });

  it("atualizar chama apiFetch com PUT e body", () => {
    const dados = { nome: "João Atualizado" };
    clientesService.atualizar(1, dados);
    expect(apiFetch).toHaveBeenCalledWith("/api/clientes/1", {
      method: "PUT",
      body: JSON.stringify(dados),
    });
  });

  it("deletar chama apiFetch com DELETE", () => {
    clientesService.deletar(5);
    expect(apiFetch).toHaveBeenCalledWith("/api/clientes/5", {
      method: "DELETE",
    });
  });

  it("listar retorna o resultado de apiFetch", async () => {
    const mockData = { data: [{ cliente_id: 1, nome: "João" }], total: 1, page: 1, limit: 20 };
    apiFetch.mockResolvedValue(mockData);
    const result = await clientesService.listar();
    expect(result).toEqual(mockData);
  });
});
