import { apiFetch } from "./api";

export const expedienteService = {
  listar: () => apiFetch("/api/expediente"),

  upsertAll: (dias) =>
    apiFetch("/api/expediente", {
      method: "PUT",
      body: JSON.stringify({ dias }),
    }),

  upsert: (dia_semana, data) =>
    apiFetch(`/api/expediente/${dia_semana}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};
