import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";

vi.mock("../config/supabase.js", () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "user-1",
            email: "test@test.com",
            user_metadata: {
              tenant_id: "tenant-1",
              perfil: "admin",
              nome: "Test User",
            },
          },
        },
        error: null,
      }),
    },
    from: vi.fn(),
  },
}));

vi.mock("../config/logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../config/cache.js", () => ({
  initCache: vi.fn(),
  getCache: vi.fn().mockReturnValue(null),
  setCache: vi.fn(),
  clearCache: vi.fn(),
}));

import { supabaseAdmin } from "../config/supabase.js";

function mockQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
  };
}

describe("Integração - Health", () => {
  it("GET /health retorna ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("Integração - Rotas protegidas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 sem token", async () => {
    const res = await request(app).get("/api/clientes");
    expect(res.status).toBe(401);
  });

  it("retorna 401 com token invalido", async () => {
    supabaseAdmin.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid token" },
    });
    const res = await request(app)
      .get("/api/clientes")
      .set("Authorization", "Bearer invalid-token");
    expect(res.status).toBe(401);
  });
});

describe("Integração - Clientes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/clientes retorna lista", async () => {
    const clientes = [
      { cliente_id: 1, nome: "João", telefone: "11999999999" },
    ];
    supabaseAdmin.from.mockReturnValue(mockQuery());
    supabaseAdmin.from.mockReturnValueOnce({
      ...mockQuery(),
      then: (resolve) => resolve({ data: clientes, error: null }),
    });

    const res = await request(app)
      .get("/api/clientes")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
  });

  it("POST /api/clientes cria cliente", async () => {
    const novoCliente = { cliente_id: 1, nome: "Maria", telefone: "11988888888" };
    supabaseAdmin.from.mockReturnValue({
      ...mockQuery(),
      single: vi.fn().mockResolvedValue({ data: novoCliente, error: null }),
    });

    const res = await request(app)
      .post("/api/clientes")
      .set("Authorization", "Bearer valid-token")
      .send({ nome: "Maria", telefone: "11988888888" });

    expect(res.status).toBe(201);
  });
});

describe("Integração - Serviços", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/servicos retorna lista", async () => {
    supabaseAdmin.from.mockReturnValue(mockQuery());

    const res = await request(app)
      .get("/api/servicos")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
  });
});

describe("Integração - Agendamentos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/agendamentos retorna lista", async () => {
    supabaseAdmin.from.mockReturnValue(mockQuery());

    const res = await request(app)
      .get("/api/agendamentos")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
  });
});

describe("Integração - Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/dashboard/resumo retorna dados", async () => {
    supabaseAdmin.from.mockReturnValue(mockQuery());

    const res = await request(app)
      .get("/api/dashboard/resumo")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
  });
});
