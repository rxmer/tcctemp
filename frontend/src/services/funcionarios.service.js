import { apiFetch } from "./api";

export const funcionariosService = {
  listar: () => apiFetch("/api/funcionarios"),

  criar: (data) =>
    apiFetch("/api/funcionarios", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
