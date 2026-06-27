import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabaseAdmin } from "../config/supabase.js";
import { criarFuncionario, listarFuncionarios } from "../services/funcionarios.service.js";

function mockQuery(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
    ...overrides,
  };
}

const TENANT_ID = "tenant-1";

describe("funcionariosService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("criarFuncionario", () => {
    it("deve criar funcionario com sucesso", async () => {
      supabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "func@test.com" } },
        error: null,
      });
      supabaseAdmin.from.mockReturnValue(mockQuery());

      const result = await criarFuncionario({
        nome: "Maria", email: "func@test.com", senha: "123456", tenantId: TENANT_ID,
      });

      expect(result.id).toBe("user-1");
      expect(result.nome).toBe("Maria");
      expect(result.perfil).toBe("funcionario");
    });

    it("deve usar perfil customizado", async () => {
      supabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "func@test.com" } },
        error: null,
      });
      supabaseAdmin.from.mockReturnValue(mockQuery());

      const result = await criarFuncionario({
        nome: "Maria", email: "func@test.com", senha: "123456", perfil: "gerente", tenantId: TENANT_ID,
      });

      expect(result.perfil).toBe("gerente");
    });

    it("deve lancar erro se createUser falhar", async () => {
      supabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: new Error("Email already exists"),
      });

      await expect(
        criarFuncionario({ nome: "Maria", email: "func@test.com", senha: "123456", tenantId: TENANT_ID })
      ).rejects.toThrow("Erro ao criar usuário");
    });

    it("deve fazer rollback se upsert falhar", async () => {
      supabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "func@test.com" } },
        error: null,
      });
      supabaseAdmin.auth.admin.deleteUser.mockResolvedValue({});
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("Upsert error") }),
      }));

      await expect(
        criarFuncionario({ nome: "Maria", email: "func@test.com", senha: "123456", tenantId: TENANT_ID })
      ).rejects.toThrow("Erro ao salvar funcionário");

      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith("user-1");
    });
  });

  describe("listarFuncionarios", () => {
    it("deve listar funcionarios do tenant", async () => {
      const expected = [{ id: "user-1", nome: "Maria", email: "func@test.com", perfil: "funcionario" }];
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: expected, error: null }),
      }));

      const result = await listarFuncionarios(TENANT_ID);

      expect(result).toEqual(expected);
    });

    it("deve lancar erro se listar falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("DB error") }),
      }));

      await expect(listarFuncionarios(TENANT_ID)).rejects.toThrow("Erro ao listar funcionários");
    });
  });
});
