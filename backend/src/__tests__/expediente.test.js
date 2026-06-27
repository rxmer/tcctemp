import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabaseAdmin } from "../config/supabase.js";
import { listarExpediente, upsertExpediente } from "../services/expediente.service.js";

function mockQuery(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
    ...overrides,
  };
}

const TENANT_ID = "tenant-1";

describe("expedienteService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listarExpediente", () => {
    it("deve listar expediente com 7 dias da semana", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery());

      const result = await listarExpediente(TENANT_ID);

      expect(result).toHaveLength(7);
      expect(result[0].dia_nome).toBe("Domingo");
      expect(result[6].dia_nome).toBe("Sábado");
    });

    it("deve preencher horarios do banco", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({
          data: [
            { dia_semana: 1, abertura: "08:00", fechamento: "18:00", ativo: true },
          ],
          error: null,
        }),
      }));

      const result = await listarExpediente(TENANT_ID);

      const segunda = result.find((d) => d.dia_semana === 1);
      expect(segunda.abertura).toBe("08:00");
      expect(segunda.fechamento).toBe("18:00");
      expect(segunda.ativo).toBe(true);
    });

    it("deve lancar erro se query falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("DB error") }),
      }));

      await expect(listarExpediente(TENANT_ID)).rejects.toThrow("Erro ao listar expediente");
    });
  });

  describe("upsertExpediente", () => {
    it("deve criar expediente novo", async () => {
      const expected = { expediente_id: 1, dia_semana: 1, abertura: "08:00", fechamento: "18:00" };
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await upsertExpediente(1, TENANT_ID, { abertura: "08:00", fechamento: "18:00" });

      expect(result).toEqual(expected);
    });

    it("deve atualizar expediente existente", async () => {
      const expected = { expediente_id: 1, dia_semana: 1, abertura: "09:00", fechamento: "17:00" };
      supabaseAdmin.from.mockImplementation(() => mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: { expediente_id: 1 }, error: null }),
        single: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await upsertExpediente(1, TENANT_ID, { abertura: "09:00", fechamento: "17:00" });

      expect(result).toEqual(expected);
    });

    it("deve retornar null se ativo=false e nao existe", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }));

      const result = await upsertExpediente(1, TENANT_ID, { ativo: false });

      expect(result).toBeNull();
    });

    it("deve lancar erro se horarios ausentes e ativo", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }));

      await expect(
        upsertExpediente(1, TENANT_ID, { abertura: null, fechamento: null, ativo: true })
      ).rejects.toThrow("Informe horários");
    });

    it("deve lancar erro se insert falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
      }));

      await expect(
        upsertExpediente(1, TENANT_ID, { abertura: "08:00", fechamento: "18:00" })
      ).rejects.toThrow("Erro ao criar expediente");
    });

    it("deve lancar erro se update falhar", async () => {
      supabaseAdmin.from.mockImplementation(() => mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: { expediente_id: 1 }, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
      }));

      await expect(
        upsertExpediente(1, TENANT_ID, { abertura: "08:00", fechamento: "18:00" })
      ).rejects.toThrow("Erro ao atualizar expediente");
    });
  });
});
