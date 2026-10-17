import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabaseAdmin } from "../config/supabase.js";
import { seedTenantDefaults, statusOnboarding } from "../services/onboarding.service.js";

function q({ count = 0, data = [], error = null, maybeSingle } = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: maybeSingle ?? vi.fn().mockResolvedValue({ data, error }),
    then: (resolve) => resolve({ data, error, count }),
  };
}

describe("onboardingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("seedTenantDefaults", () => {
    it("semeia serviços e expediente padrão com o tenant_id", async () => {
      const inserts = {};
      supabaseAdmin.from.mockImplementation((table) => {
        const query = q();
        query.insert = vi.fn((payload) => {
          inserts[table] = payload;
          return query;
        });
        return query;
      });

      await seedTenantDefaults("tenant-1");

      expect(inserts.servico).toHaveLength(5);
      expect(inserts.servico[0]).toMatchObject({ tenant_id: "tenant-1", nome_servico: "Lavagem Simples" });
      expect(inserts.configuracao_expediente).toHaveLength(5);
      expect(inserts.configuracao_expediente[0]).toMatchObject({
        dia_semana: 1,
        abertura: "08:00",
        fechamento: "18:00",
        ativo: true,
        tenant_id: "tenant-1",
      });
    });

    it("não lança erro se o seed falhar (best-effort)", async () => {
      supabaseAdmin.from.mockImplementation(() =>
        q({ error: new Error("DB error") })
      );

      await expect(seedTenantDefaults("tenant-1")).resolves.toBeUndefined();
    });
  });

  describe("statusOnboarding", () => {
    it("retorna as flags quando tudo está configurado", async () => {
      let call = 0;
      supabaseAdmin.from.mockImplementation(() => {
        call++;
        if (call <= 2) return q({ count: 5 });
        return q({ maybeSingle: vi.fn().mockResolvedValue({ data: { telefone: "11999", endereco: null, cnpj: null }, error: null }) });
      });

      const result = await statusOnboarding("tenant-1");

      expect(result).toEqual({ servicos: true, expediente: true, empresa: true });
    });

    it("retorna false quando nada está configurado", async () => {
      let call = 0;
      supabaseAdmin.from.mockImplementation(() => {
        call++;
        if (call <= 2) return q({ count: 0 });
        return q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
      });

      const result = await statusOnboarding("tenant-1");

      expect(result).toEqual({ servicos: false, expediente: false, empresa: false });
    });

    it("lança AppError se a consulta falhar", async () => {
      supabaseAdmin.from.mockImplementation(() => q({ error: new Error("DB error") }));

      await expect(statusOnboarding("tenant-1")).rejects.toThrow("Erro ao carregar status do onboarding");
    });
  });
});
