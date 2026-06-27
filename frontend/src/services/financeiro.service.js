import { apiFetch } from "./api";

export const financeiroService = {
  resumo: (params = {}) => {
    const query = new URLSearchParams();
    if (params.data_inicio) query.set("data_inicio", params.data_inicio);
    if (params.data_fim) query.set("data_fim", params.data_fim);
    const qs = query.toString();
    return apiFetch(`/api/financeiro/resumo${qs ? `?${qs}` : ""}`);
  },

  listarContas: (params = {}) => {
    const query = new URLSearchParams();
    if (params.data_inicio) query.set("data_inicio", params.data_inicio);
    if (params.data_fim) query.set("data_fim", params.data_fim);
    if (params.pago !== undefined) query.set("pago", params.pago);
    if (params.page) query.set("page", params.page);
    if (params.limit) query.set("limit", params.limit);
    const qs = query.toString();
    return apiFetch(`/api/financeiro/contas${qs ? `?${qs}` : ""}`);
  },

  criarConta: (data) =>
    apiFetch("/api/financeiro/contas", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  atualizarConta: (id, data) =>
    apiFetch(`/api/financeiro/contas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  pagarConta: (id) =>
    apiFetch(`/api/financeiro/contas/${id}/pagar`, {
      method: "PATCH",
    }),

  deletarConta: (id) =>
    apiFetch(`/api/financeiro/contas/${id}`, {
      method: "DELETE",
    }),

  listarFaturamentos: (params = {}) => {
    const query = new URLSearchParams();
    if (params.data_inicio) query.set("data_inicio", params.data_inicio);
    if (params.data_fim) query.set("data_fim", params.data_fim);
    if (params.pago !== undefined) query.set("pago", params.pago);
    if (params.page) query.set("page", params.page);
    if (params.limit) query.set("limit", params.limit);
    const qs = query.toString();
    return apiFetch(`/api/financeiro/faturamentos${qs ? `?${qs}` : ""}`);
  },

  receberFaturamento: (id, data_pagamento) =>
    apiFetch(`/api/financeiro/faturamentos/${id}/receber`, {
      method: "PATCH",
      body: JSON.stringify({ data_pagamento }),
    }),
};
