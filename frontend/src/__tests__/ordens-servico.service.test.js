import { describe, it, expect, vi, beforeEach } from "vitest";
import { ordensServicoService } from "../services/ordens-servico.service";

vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../services/api";

describe("ordensServicoService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listar chama apiFetch com url basica", () => {
    ordensServicoService.listar();
    expect(apiFetch).toHaveBeenCalledWith("/api/ordens-servico");
  });

  it("listar passa status, page e limit como query params", () => {
    ordensServicoService.listar({ status: "aberta", page: 1, limit: 5 });
    const url = apiFetch.mock.calls[0][0];
    expect(url).toContain("status=aberta");
    expect(url).toContain("page=1");
    expect(url).toContain("limit=5");
  });

  it("buscarPorId chama apiFetch com url correta", () => {
    ordensServicoService.buscarPorId(42);
    expect(apiFetch).toHaveBeenCalledWith("/api/ordens-servico/42");
  });

  it("criar chama apiFetch com POST e body", () => {
    const dados = { cliente_id: 1, veiculo_id: 2 };
    ordensServicoService.criar(dados);
    expect(apiFetch).toHaveBeenCalledWith("/api/ordens-servico", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  });

  it("atualizar chama apiFetch com PUT e body", () => {
    const dados = { status: "finalizada" };
    ordensServicoService.atualizar(1, dados);
    expect(apiFetch).toHaveBeenCalledWith("/api/ordens-servico/1", {
      method: "PUT",
      body: JSON.stringify(dados),
    });
  });

  it("deletar chama apiFetch com DELETE", () => {
    ordensServicoService.deletar(3);
    expect(apiFetch).toHaveBeenCalledWith("/api/ordens-servico/3", {
      method: "DELETE",
    });
  });

  it("adicionarItem chama apiFetch com POST e body", () => {
    const dados = { servico_id: 5, quantidade: 1, valor: 100 };
    ordensServicoService.adicionarItem(10, dados);
    expect(apiFetch).toHaveBeenCalledWith("/api/ordens-servico/10/itens", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  });

  it("removerItem chama apiFetch com DELETE", () => {
    ordensServicoService.removerItem(10, 7);
    expect(apiFetch).toHaveBeenCalledWith("/api/ordens-servico/10/itens/7", {
      method: "DELETE",
    });
  });

  it("listar retorna o resultado de apiFetch", async () => {
    const mockData = { data: [], total: 0 };
    apiFetch.mockResolvedValue(mockData);
    const result = await ordensServicoService.listar();
    expect(result).toEqual(mockData);
  });
});
