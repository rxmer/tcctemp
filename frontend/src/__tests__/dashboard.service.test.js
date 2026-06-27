import { describe, it, expect, vi, beforeEach } from "vitest";
import { dashboardService } from "../services/dashboard.service";

vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../services/api";

describe("dashboardService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resumo chama apiFetch com url correta", () => {
    dashboardService.resumo();
    expect(apiFetch).toHaveBeenCalledWith("/api/dashboard/resumo");
  });

  it("resumo retorna o resultado de apiFetch", async () => {
    const mockData = { total_agendamentos: 10, total_clientes: 50 };
    apiFetch.mockResolvedValue(mockData);
    const result = await dashboardService.resumo();
    expect(result).toEqual(mockData);
  });
});
