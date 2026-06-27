import { describe, it, expect, vi, beforeEach } from "vitest";
import { authService } from "../services/auth.service";

vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../services/api";

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signup chama apiFetch com POST e body", () => {
    const dados = { email: "test@test.com", password: "123456", nome: "João" };
    authService.signup(dados);
    expect(apiFetch).toHaveBeenCalledWith("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  });

  it("me chama apiFetch com url correta", () => {
    authService.me();
    expect(apiFetch).toHaveBeenCalledWith("/api/auth/me");
  });

  it("me retorna o resultado de apiFetch", async () => {
    const mockData = { id: 1, email: "test@test.com", nome: "João" };
    apiFetch.mockResolvedValue(mockData);
    const result = await authService.me();
    expect(result).toEqual(mockData);
  });
});
