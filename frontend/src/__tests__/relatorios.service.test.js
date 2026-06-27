import { describe, it, expect, vi, beforeEach } from "vitest";
import { relatoriosService } from "../services/relatorios.service";

vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

import { apiFetch } from "../services/api";

describe("relatoriosService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("geral chama apiFetch com url basica", () => {
    relatoriosService.geral();
    expect(apiFetch).toHaveBeenCalledWith("/api/relatorios/geral");
  });

  it("geral passa datas e agrupar_por como query params", () => {
    relatoriosService.geral({ data_inicio: "2026-01-01", data_fim: "2026-12-31", agrupar_por: "mes" });
    const url = apiFetch.mock.calls[0][0];
    expect(url).toContain("data_inicio=2026-01-01");
    expect(url).toContain("data_fim=2026-12-31");
    expect(url).toContain("agrupar_por=mes");
  });

  it("agendamentos chama apiFetch com url basica", () => {
    relatoriosService.agendamentos();
    expect(apiFetch).toHaveBeenCalledWith("/api/relatorios/agendamentos");
  });

  it("agendamentos passa datas como query params", () => {
    relatoriosService.agendamentos({ data_inicio: "2026-01-01", data_fim: "2026-12-31" });
    const url = apiFetch.mock.calls[0][0];
    expect(url).toContain("data_inicio=2026-01-01");
    expect(url).toContain("data_fim=2026-12-31");
  });

  it("servicos chama apiFetch com url basica", () => {
    relatoriosService.servicos();
    expect(apiFetch).toHaveBeenCalledWith("/api/relatorios/servicos");
  });

  it("financeiro chama apiFetch com url basica", () => {
    relatoriosService.financeiro();
    expect(apiFetch).toHaveBeenCalledWith("/api/relatorios/financeiro");
  });

  it("status chama apiFetch com url basica", () => {
    relatoriosService.status();
    expect(apiFetch).toHaveBeenCalledWith("/api/relatorios/status");
  });

  it("geral retorna o resultado de apiFetch", async () => {
    const mockData = { data: [] };
    apiFetch.mockResolvedValue(mockData);
    const result = await relatoriosService.geral();
    expect(result).toEqual(mockData);
  });
});
