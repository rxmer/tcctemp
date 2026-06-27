import { apiFetch } from "./api";

export const veiculosService = {
  listar: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page);
    if (params.limit) query.set("limit", params.limit);
    if (params.search) query.set("search", params.search);
    const qs = query.toString();
    return apiFetch(`/api/veiculos${qs ? `?${qs}` : ""}`);
  },

  criar: (data) =>
    apiFetch("/api/veiculos", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  atualizar: (id, data) =>
    apiFetch(`/api/veiculos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deletar: (id) =>
    apiFetch(`/api/veiculos/${id}`, {
      method: "DELETE",
    }),
};
