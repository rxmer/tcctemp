import { apiFetch } from "./api";

export const whatsappService = {
  getStatus: () => apiFetch(`/api/chatbot/status?_=${Date.now()}`),

  connect: () =>
    apiFetch("/api/chatbot/connect", {
      method: "POST",
    }),

  disconnect: () =>
    apiFetch("/api/chatbot/disconnect", {
      method: "POST",
    }),

  listSessions: ({ page = 1, limit = 20, ordem = "recentes", estado = "", busca = "" } = {}) => {
    const params = new URLSearchParams({ _: Date.now(), page, limit, ordem });
    if (estado) params.set("estado", estado);
    if (busca) params.set("busca", busca);
    return apiFetch(`/api/chatbot/sessions?${params}`);
  },

  getUnreadCount: () => apiFetch(`/api/chatbot/sessions/unread?_=${Date.now()}`),

  getSession: (id) => apiFetch(`/api/chatbot/sessions/${id}?_=${Date.now()}`),

  sendReply: (id, mensagem) =>
    apiFetch(`/api/chatbot/sessions/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ mensagem }),
    }),

  getMensagens: (id) => apiFetch(`/api/chatbot/sessions/${id}/mensagens?_=${Date.now()}`),

  resetSessao: (id) =>
    apiFetch(`/api/chatbot/sessions/${id}/reset`, {
      method: "POST",
    }),
};
