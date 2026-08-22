import { apiFetch } from "./api";

export const comunicadosService = {
  criar: ({ mensagem, filtro }) =>
    apiFetch("/api/comunicados", {
      method: "POST",
      body: JSON.stringify({ mensagem, filtro }),
    }),

  listar: () => apiFetch("/api/comunicados"),
};
