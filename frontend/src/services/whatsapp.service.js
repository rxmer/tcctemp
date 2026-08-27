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

  listSessions: () => apiFetch(`/api/chatbot/sessions?_=${Date.now()}`),

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
