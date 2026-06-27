import { apiFetch } from "./api";

export const dashboardService = {
  resumo: () => apiFetch("/api/dashboard/resumo"),
};
