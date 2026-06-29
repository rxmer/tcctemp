import { apiFetch } from "./api";

export const configuracaoEmpresaService = {
  buscar: () => apiFetch("/api/configuracao-empresa"),
  salvar: (data) => apiFetch("/api/configuracao-empresa", { method: "PUT", body: JSON.stringify(data) }),
};
