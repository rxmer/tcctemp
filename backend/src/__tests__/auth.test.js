import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabaseAdmin } from "../config/supabase.js";
import { signup, getProfile } from "../services/auth.service.js";

vi.mock("node:crypto", () => ({
  randomUUID: () => "12345678-1234-1234-1234-123456789abc",
}));

function q(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
    ...overrides,
  };
}

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signup", () => {
    const input = {
      nomeEmpresa: "Minha Oficina",
      nome: "Admin",
      email: "admin@oficina.com",
      senha: "123456",
    };

    it("deve criar tenant, usuario auth e upsert perfil com sucesso", async () => {
      const tenantData = { id: "tenant-1", nome: "Minha Oficina", slug: "minha-oficina-12345678" };

      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return q({ single: vi.fn().mockResolvedValue({ data: tenantData, error: null }) });
        }
        if (callCount === 2) {
          return q();
        }
        return q({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) });
      });

      (supabaseAdmin.auth.admin.createUser).mockResolvedValue({
        data: { user: { id: "user-1", email: "admin@oficina.com" } },
        error: null,
      });

      const result = await signup(input);

      expect(result.id).toBe("user-1");
      expect(result.email).toBe("admin@oficina.com");
      expect(result.tenant).toEqual(tenantData);

      const insertArg = supabaseAdmin.from.mock.results[0].value.insert.mock.calls[0][0];
      expect(insertArg.slug).toBe("minha-oficina-12345678");
      expect(insertArg.nome).toBe("Minha Oficina");

      expect(supabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
        email: "admin@oficina.com",
        password: "123456",
        email_confirm: true,
        user_metadata: { nome: "Admin", tenant_id: "tenant-1", perfil: "admin" },
      });

      const upsertArg = supabaseAdmin.from.mock.results[1].value.upsert.mock.calls[0][0];
      expect(upsertArg).toMatchObject({
        id: "user-1",
        nome: "Admin",
        email: "admin@oficina.com",
        tenant_id: "tenant-1",
        perfil: "admin",
      });
    });

    it("deve lançar erro se criação de tenant falhar", async () => {
      supabaseAdmin.from.mockReturnValue(
        q({ single: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }) })
      );

      await expect(signup(input)).rejects.toThrow("Erro ao criar tenant");
    });

    it("deve fazer rollback do tenant se criação de auth falhar", async () => {
      const tenantData = { id: "tenant-1", nome: "Minha Oficina", slug: "minha-oficina-12345678" };

      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return q({ single: vi.fn().mockResolvedValue({ data: tenantData, error: null }) });
        }
        return q();
      });

      (supabaseAdmin.auth.admin.createUser).mockResolvedValue({
        data: null,
        error: new Error("Email already registered"),
      });

      await expect(signup(input)).rejects.toThrow("Erro ao criar usuário");

      expect(supabaseAdmin.from.mock.calls[1][0]).toBe("tenants");
      expect(supabaseAdmin.from.mock.results[1].value.delete).toHaveBeenCalled();
    });

    it("deve fazer rollback de auth e tenant se upsert de perfil falhar", async () => {
      const tenantData = { id: "tenant-1", nome: "Minha Oficina", slug: "minha-oficina-12345678" };

      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return q({ single: vi.fn().mockResolvedValue({ data: tenantData, error: null }) });
        }
        if (callCount === 2) {
          return q({ then: (resolve) => resolve({ data: null, error: new Error("Upsert error") }) });
        }
        return q();
      });

      (supabaseAdmin.auth.admin.createUser).mockResolvedValue({
        data: { user: { id: "user-1", email: "admin@oficina.com" } },
        error: null,
      });
      (supabaseAdmin.auth.admin.deleteUser).mockResolvedValue({});

      await expect(signup(input)).rejects.toThrow("Erro ao salvar perfil");

      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith("user-1");
      expect(supabaseAdmin.from.mock.calls[2][0]).toBe("tenants");
      expect(supabaseAdmin.from.mock.results[2].value.delete).toHaveBeenCalled();
    });
  });

  describe("getProfile", () => {
    it("deve retornar usuario e tenant", async () => {
      const usuario = { id: "user-1", nome: "Admin", tenant_id: "tenant-1" };
      const tenant = { id: "tenant-1", nome: "Minha Oficina" };

      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return q({ maybeSingle: vi.fn().mockResolvedValue({ data: usuario, error: null }) });
        }
        return q({ maybeSingle: vi.fn().mockResolvedValue({ data: tenant, error: null }) });
      });

      const result = await getProfile("user-1");

      expect(result.usuario).toEqual(usuario);
      expect(result.tenant).toEqual(tenant);
    });

    it("deve retornar tenant null se usuario nao tem tenant_id", async () => {
      const usuario = { id: "user-1", nome: "Admin", tenant_id: null };
      supabaseAdmin.from.mockReturnValue(
        q({ maybeSingle: vi.fn().mockResolvedValue({ data: usuario, error: null }) })
      );

      const result = await getProfile("user-1");

      expect(result.usuario).toEqual(usuario);
      expect(result.tenant).toBeNull();
    });

    it("deve retornar usuario null se nao encontrado", async () => {
      supabaseAdmin.from.mockReturnValue(
        q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
      );

      const result = await getProfile("user-inexistente");

      expect(result.usuario).toBeNull();
      expect(result.tenant).toBeNull();
    });

    it("deve lancar erro se busca de usuario falhar", async () => {
      supabaseAdmin.from.mockReturnValue(
        q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }) })
      );

      await expect(getProfile("user-1")).rejects.toThrow("Erro ao buscar perfil");
    });

    it("deve lancar erro se busca de tenant falhar", async () => {
      const usuario = { id: "user-1", nome: "Admin", tenant_id: "tenant-1" };

      let callCount = 0;
      supabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return q({ maybeSingle: vi.fn().mockResolvedValue({ data: usuario, error: null }) });
        }
        return q({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }) });
      });

      await expect(getProfile("user-1")).rejects.toThrow("Erro ao buscar tenant");
    });
  });
});
