import { apiFetch } from "./api";

export const servicosService = {
  listar: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page);
    if (params.limit) query.set("limit", params.limit);
    if (params.search) query.set("search", params.search);
    const qs = query.toString();
    return apiFetch(`/api/servicos${qs ? `?${qs}` : ""}`);
  },

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
