import { describe, it, expect, vi, beforeEach } from "vitest";
import * as datasBloqueadasService from "../services/datas-bloqueadas.service.js";
import { supabaseAdmin } from "../config/supabase.js";

function q(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (r) => r({ data: [], error: null }),
    ...overrides,
  };
}

describe("datasBloqueadasService", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("deve listar datas bloqueadas", async () => {
    const expected = [{ id: 1, data: "2026-12-25", motivo: "Natal" }];
    supabaseAdmin.from.mockReturnValue(q({ then: (r) => r({ data: expected, error: null }) }));
    const result = await datasBloqueadasService.listarDatasBloqueadas("t1");
    expect(result).toEqual(expected);
  });

  it("deve criar data bloqueada", async () => {
    const expected = { id: 1, data: "2026-12-25", tenant_id: "t1" };
    supabaseAdmin.from.mockImplementation(() => q({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: expected, error: null }),
    }));
    const result = await datasBloqueadasService.criarDataBloqueada({ data: "2026-12-25", tenantId: "t1" });
    expect(result.data).toBe("2026-12-25");
  });

  it("deve rejeitar data duplicada", async () => {
    supabaseAdmin.from.mockReturnValue(q({
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
    }));
    await expect(datasBloqueadasService.criarDataBloqueada({ data: "2026-12-25", tenantId: "t1" })).rejects.toThrow("já está bloqueada");
  });

  it("deve remover data bloqueada", async () => {
    supabaseAdmin.from.mockReturnValue(q());
    await datasBloqueadasService.removerDataBloqueada(1, "t1");
  });

  it("deve verificar data bloqueada", async () => {
    supabaseAdmin.from.mockReturnValue(q({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }) }));
    expect(await datasBloqueadasService.verificarDataBloqueada("t1", "2026-12-25")).toBe(true);
  });
});
