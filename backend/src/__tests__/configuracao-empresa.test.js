import { describe, it, expect, vi, beforeEach } from "vitest";
import * as configuracaoService from "../services/configuracao-empresa.service.js";
import { supabaseAdmin } from "../config/supabase.js";

function q(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
}

describe("configuracaoEmpresaService", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("deve buscar configuracao", async () => {
    const expected = { nome_fantasia: "Esteticar", tenant_id: "t1" };
    supabaseAdmin.from.mockReturnValue(q({ maybeSingle: vi.fn().mockResolvedValue({ data: expected, error: null }) }));
    const result = await configuracaoService.buscarConfiguracao("t1");
    expect(result.nome_fantasia).toBe("Esteticar");
  });

  it("deve criar configuracao se nao existir", async () => {
    const created = { nome_fantasia: "Minha Empresa", tenant_id: "t1" };
    supabaseAdmin.from.mockImplementation(() => q({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: created, error: null }),
    }));
    const result = await configuracaoService.salvarConfiguracao({ tenantId: "t1", nome_fantasia: "Minha Empresa" });
    expect(result.nome_fantasia).toBe("Minha Empresa");
  });

  it("deve atualizar configuracao se ja existir", async () => {
    supabaseAdmin.from.mockImplementation(() => q({
      maybeSingle: vi.fn().mockResolvedValue({ data: { nome_fantasia: "Antigo", tenant_id: "t1" }, error: null }),
      single: vi.fn().mockResolvedValue({ data: { nome_fantasia: "Novo", tenant_id: "t1" }, error: null }),
    }));
    const result = await configuracaoService.salvarConfiguracao({ tenantId: "t1", nome_fantasia: "Novo" });
    expect(result.nome_fantasia).toBe("Novo");
  });
});
