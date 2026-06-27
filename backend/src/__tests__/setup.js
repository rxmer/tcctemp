import { vi } from "vitest";

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.NODE_ENV = "test";

function buildQuery(returnValue) {
  const rv = { ...returnValue, count: returnValue.count ?? 0 };
  const q = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(rv),
    maybeSingle: vi.fn().mockResolvedValue(rv),
  };
  q.then = (resolve) => resolve(rv);
  return q;
}

const mockFrom = vi.fn((table) => buildQuery({ data: [], error: null }));

const mockAuthAdmin = {
  createUser: vi.fn(),
  deleteUser: vi.fn(),
};

vi.mock("../config/supabase.js", () => ({
  supabaseAdmin: {
    from: mockFrom,
    auth: { admin: mockAuthAdmin },
  },
}));

vi.mock("../config/env.js", () => ({
  env: {
    port: 3001,
    supabaseUrl: "https://test.supabase.co",
    supabaseServiceKey: "test-service-role-key",
    nodeEnv: "test",
  },
}));

export function mockSuccess(data) {
  const rv = { data, error: null };
  mockFrom.mockReturnValue(buildQuery(rv));
}

export function mockError(message) {
  const rv = { data: null, error: new Error(message) };
  mockFrom.mockReturnValue(buildQuery(rv));
}

export { mockFrom, mockAuthAdmin };
