import { apiFetch } from "./api";

export const notificacoesService = {
  listar: (apenasNaoLidas = false) => {
    const qs = apenasNaoLidas ? "?apenas_nao_lidas=true" : "";
    return apiFetch(`/api/notificacoes${qs}`);
  },

  contar: () => apiFetch("/api/notificacoes/contar"),

  marcarLida: (id) =>
    apiFetch(`/api/notificacoes/${id}/lida`, { method: "PATCH" }),

  marcarTodasLidas: () =>
    apiFetch("/api/notificacoes/marcar-todas-lidas", { method: "POST" }),
};
