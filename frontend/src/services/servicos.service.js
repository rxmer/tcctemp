import { apiFetch } from "./api";

export const servicosService = {
  listar: () => apiFetch("/api/servicos"),

  criar: (data) =>
    apiFetch("/api/servicos", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  atualizar: (id, data) =>
    apiFetch(`/api/servicos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deletar: (id) =>
    apiFetch(`/api/servicos/${id}`, {
      method: "DELETE",
    }),

  toggleAtivo: (id) =>
    apiFetch(`/api/servicos/${id}/toggle`, {
      method: "PATCH",
    }),
};
