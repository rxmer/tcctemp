import { describe, it, expect, vi, beforeEach } from "vitest";
import { agendamentosService } from "../services/agendamentos.service";

vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../services/api";

describe("agendamentosService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listar chama apiFetch com url basica sem parametros", () => {
    agendamentosService.listar();
    expect(apiFetch).toHaveBeenCalledWith("/api/agendamentos");
  });

  it("listar passa data_inicio e data_fim como query params", () => {
    agendamentosService.listar({ data_inicio: "2026-01-01", data_fim: "2026-12-31" });
    const url = apiFetch.mock.calls[0][0];
    expect(url).toContain("data_inicio=2026-01-01");
    expect(url).toContain("data_fim=2026-12-31");
  });

  it("listar passa status como query param", () => {
    agendamentosService.listar({ status: "pendente" });
    expect(apiFetch).toHaveBeenCalledWith("/api/agendamentos?status=pendente");
  });

  it("listar passa cliente_id como query param", () => {
    agendamentosService.listar({ cliente_id: 5 });
    expect(apiFetch).toHaveBeenCalledWith("/api/agendamentos?cliente_id=5");
  });

  it("listar passa page e limit como query params", () => {
    agendamentosService.listar({ page: 2, limit: 10 });
    const url = apiFetch.mock.calls[0][0];
    expect(url).toContain("page=2");
    expect(url).toContain("limit=10");
  });

  it("criar chama apiFetch com POST e body", () => {
    const dados = { cliente_id: 1, servico_id: 2, data: "2026-07-01" };
    agendamentosService.criar(dados);
    expect(apiFetch).toHaveBeenCalledWith("/api/agendamentos", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  });

  it("atualizar chama apiFetch com PUT e body", () => {
    const dados = { status: "confirmado" };
    agendamentosService.atualizar(1, dados);
    expect(apiFetch).toHaveBeenCalledWith("/api/agendamentos/1", {
      method: "PUT",
      body: JSON.stringify(dados),
    });
  });

  it("deletar chama apiFetch com DELETE", () => {
    agendamentosService.deletar(5);
    expect(apiFetch).toHaveBeenCalledWith("/api/agendamentos/5", {
      method: "DELETE",
    });
  });

  it("listar retorna o resultado de apiFetch", async () => {
    const mockData = { data: [], total: 0 };
    apiFetch.mockResolvedValue(mockData);
    const result = await agendamentosService.listar();
    expect(result).toEqual(mockData);
  });
});
