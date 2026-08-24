import { apiFetch } from "./api";

export const authService = {
  signup: (data) =>
    apiFetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => apiFetch("/api/auth/me"),

  verificarEmail: (email) =>
    apiFetch("/api/auth/verificar-email", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
};
