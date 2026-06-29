import { apiFetch } from "./api";

export const datasBloqueadasService = {
  listar: (ano) => apiFetch(`/api/datas-bloqueadas${ano ? `?ano=${ano}` : ""}`),
  criar: (data, motivo) => apiFetch("/api/datas-bloqueadas", { method: "POST", body: JSON.stringify({ data, motivo }) }),
  remover: (id) => apiFetch(`/api/datas-bloqueadas/${id}`, { method: "DELETE" }),
};
