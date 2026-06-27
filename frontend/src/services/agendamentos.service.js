import { apiFetch } from "./api";

export const agendamentosService = {
  listar: (params = {}) => {
    const query = new URLSearchParams();
    if (params.data_inicio) query.set("data_inicio", params.data_inicio);
    if (params.data_fim) query.set("data_fim", params.data_fim);
    if (params.status) query.set("status", params.status);
    if (params.cliente_id) query.set("cliente_id", params.cliente_id);
    if (params.page) query.set("page", params.page);
    if (params.limit) query.set("limit", params.limit);
    const qs = query.toString();
    return apiFetch(`/api/agendamentos${qs ? `?${qs}` : ""}`);
  },

  criar: (data) =>
    apiFetch("/api/agendamentos", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  atualizar: (id, data) =>
    apiFetch(`/api/agendamentos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deletar: (id) =>
    apiFetch(`/api/agendamentos/${id}`, {
      method: "DELETE",
    }),
};
