import { describe, it, expect, vi, beforeEach } from "vitest";
import { expedienteService } from "../services/expediente.service";

vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../services/api";

describe("expedienteService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listar chama apiFetch com url correta", () => {
    expedienteService.listar();
    expect(apiFetch).toHaveBeenCalledWith("/api/expediente");
  });

  it("upsertAll chama apiFetch com PUT e dias", () => {
    const dias = [{ dia_semana: 1, abertura: "08:00", fechamento: "18:00" }];
    expedienteService.upsertAll(dias);
    expect(apiFetch).toHaveBeenCalledWith("/api/expediente", {
      method: "PUT",
      body: JSON.stringify({ dias }),
    });
  });

  it("upsert chama apiFetch com PUT e dados do dia", () => {
    const dados = { abertura: "09:00", fechamento: "17:00" };
    expedienteService.upsert(2, dados);
    expect(apiFetch).toHaveBeenCalledWith("/api/expediente/2", {
      method: "PUT",
      body: JSON.stringify(dados),
    });
  });

  it("listar retorna o resultado de apiFetch", async () => {
    const mockData = { data: [] };
    apiFetch.mockResolvedValue(mockData);
    const result = await expedienteService.listar();
    expect(result).toEqual(mockData);
  });
});
