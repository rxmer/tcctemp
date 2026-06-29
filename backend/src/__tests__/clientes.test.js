import { describe, it, expect, vi, beforeEach } from "vitest";
import * as clienteService from "../services/clientes.service.js";
import { supabaseAdmin } from "../config/supabase.js";

const TENANT_ID = "tenant-1";

function mockQuery(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
    ...overrides,
  };
}

describe("clienteService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("criarCliente", () => {
    it("deve criar cliente sem telefone", async () => {
      const expected = { cliente_id: 1, nome: "João", telefone: null };
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await clienteService.criarCliente({ nome: "João", tenantId: TENANT_ID });

      expect(result).toEqual(expected);
    });

    it("deve lancar 409 se telefone ja existir", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: { cliente_id: 1 }, error: null }),
      }));

      await expect(
        clienteService.criarCliente({ nome: "João", telefone: "11999999999", tenantId: TENANT_ID })
      ).rejects.toThrow("Já existe um cliente com este telefone");
    });

    it("deve criar cliente com telefone unico", async () => {
      const expected = { cliente_id: 2, nome: "Maria", telefone: "11988888888" };
      supabaseAdmin.from.mockImplementation(() => mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await clienteService.criarCliente({
        nome: "Maria", telefone: "11988888888", tenantId: TENANT_ID,
      });

      expect(result).toEqual(expected);
    });

    it("deve lancar erro se insert falhar", async () => {
      supabaseAdmin.from.mockImplementation(() => mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("Insert error") }),
      }));

      await expect(
        clienteService.criarCliente({ nome: "X", telefone: "11977777777", tenantId: TENANT_ID })
      ).rejects.toThrow("Erro ao criar cliente");
    });
  });

  describe("listarClientes", () => {
    it("deve listar clientes do tenant", async () => {
      const expected = [{ cliente_id: 1, nome: "João" }];
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: expected, error: null }),
      }));

      const result = await clienteService.listarClientes(TENANT_ID);

      expect(result.data).toEqual(expected);
    });

    it("deve retornar total e pagina", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: [], error: null, count: 0 }),
      }));

      const result = await clienteService.listarClientes(TENANT_ID, { page: 1, limit: 10 });

      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("deve passar search como filtro", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: [], error: null, count: 0 }),
      }));

      await clienteService.listarClientes(TENANT_ID, { search: "joao" });

      expect(supabaseAdmin.from).toHaveBeenCalledWith("clientes");
    });

    it("deve lancar erro se listar falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("DB error"), count: null }),
      }));

      await expect(clienteService.listarClientes(TENANT_ID)).rejects.toThrow("Erro ao listar clientes");
    });
  });

  describe("atualizarCliente", () => {
    it("deve verificar telefone duplicado excluindo proprio id", async () => {
      const expected = { cliente_id: 1, nome: "Atualizado" };
      supabaseAdmin.from.mockImplementation(() => mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await clienteService.atualizarCliente(1, TENANT_ID, { nome: "Atualizado" });

      expect(result.nome).toBe("Atualizado");
    });

    it("deve lancar 409 se telefone pertencer a outro cliente", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: { cliente_id: 2 }, error: null }),
      }));

      await expect(
        clienteService.atualizarCliente(1, TENANT_ID, { telefone: "11999999999" })
      ).rejects.toThrow("Já existe outro cliente com este telefone");
    });

    it("deve lancar erro se update falhar", async () => {
      supabaseAdmin.from.mockImplementation(() => mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
      }));

      await expect(
        clienteService.atualizarCliente(1, TENANT_ID, { nome: "X" })
      ).rejects.toThrow("Erro ao atualizar cliente");
    });
  });

  describe("deletarCliente", () => {
    it("deve soft-deletar cliente", async () => {
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        const q = mockQuery();
        q.then = (resolve) => resolve({ data: [], error: null, count: 0 });
        if (cc === 1) return q;
        if (cc === 2) { q.then = (resolve) => resolve({ data: [], error: null }); return q; }
        if (cc === 3) { q.then = (resolve) => resolve({ data: [], error: null, count: 0 }); return q; }
        return mockQuery();
      });

      await clienteService.deletarCliente(1, TENANT_ID);
    });

    it("deve lancar erro se delete falhar", async () => {
      let cc = 0;
      supabaseAdmin.from.mockImplementation(() => {
        cc++;
        const q = mockQuery();
        q.then = (resolve) => resolve({ data: [], error: null, count: 0 });
        if (cc <= 3) return q;
        return mockQuery({ then: (resolve) => resolve({ data: null, error: new Error("DB error") }) });
      });

      await expect(clienteService.deletarCliente(1, TENANT_ID)).rejects.toThrow("Erro ao deletar cliente");
    });
  });
});
