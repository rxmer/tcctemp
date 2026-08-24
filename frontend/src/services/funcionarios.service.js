import { apiFetch } from "./api";

export const funcionariosService = {
  listar: () => apiFetch("/api/funcionarios"),

  criar: (data) =>
    apiFetch("/api/funcionarios", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  atualizar: (id, data) =>
    apiFetch(`/api/funcionarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  redefinirSenha: (id, senha) =>
    apiFetch(`/api/funcionarios/${id}/senha`, {
      method: "PUT",
      body: JSON.stringify({ senha }),
    }),

  deletar: (id) =>
    apiFetch(`/api/funcionarios/${id}`, {
      method: "DELETE",
    }),
};
