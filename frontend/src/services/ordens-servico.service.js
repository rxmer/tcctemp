import { apiFetch } from "./api";

export const ordensServicoService = {
  listar: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.page) query.set("page", params.page);
    if (params.limit) query.set("limit", params.limit);
    const qs = query.toString();
    return apiFetch(`/api/ordens-servico${qs ? `?${qs}` : ""}`);
  },

  buscarPorId: (id) => apiFetch(`/api/ordens-servico/${id}`),

  criar: (data) =>
    apiFetch("/api/ordens-servico", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  atualizar: (id, data) =>
    apiFetch(`/api/ordens-servico/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deletar: (id) =>
    apiFetch(`/api/ordens-servico/${id}`, {
      method: "DELETE",
    }),

  adicionarItem: (osId, data) =>
    apiFetch(`/api/ordens-servico/${osId}/itens`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  removerItem: (osId, itemId) =>
    apiFetch(`/api/ordens-servico/${osId}/itens/${itemId}`, {
      method: "DELETE",
    }),
};
