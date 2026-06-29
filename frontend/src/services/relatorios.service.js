import { apiFetch } from "./api";
import { supabase } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

function exportUrl(path, params = {}) {
  const query = new URLSearchParams();
  if (params.data_inicio) query.set("data_inicio", params.data_inicio);
  if (params.data_fim) query.set("data_fim", params.data_fim);
  if (params.agrupar_por) query.set("agrupar_por", params.agrupar_por);
  const qs = query.toString();
  return `/api/relatorios/${path}${qs ? `?${qs}` : ""}`;
}

async function downloadBlob(url, filename) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${API_BASE}${url}`, {
      headers: {
        ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
      },
    });
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch (err) {
    console.error("Erro ao baixar:", err);
    alert("Erro ao baixar arquivo. Tente novamente.");
  }
}

export const relatoriosService = {
  geral: (params = {}) => {
    const query = new URLSearchParams();
    if (params.data_inicio) query.set("data_inicio", params.data_inicio);
    if (params.data_fim) query.set("data_fim", params.data_fim);
    if (params.agrupar_por) query.set("agrupar_por", params.agrupar_por);
    const qs = query.toString();
    return apiFetch(`/api/relatorios/geral${qs ? `?${qs}` : ""}`);
  },

  agendamentos: (params = {}) => {
    const query = new URLSearchParams();
    if (params.data_inicio) query.set("data_inicio", params.data_inicio);
    if (params.data_fim) query.set("data_fim", params.data_fim);
    if (params.agrupar_por) query.set("agrupar_por", params.agrupar_por);
    const qs = query.toString();
    return apiFetch(`/api/relatorios/agendamentos${qs ? `?${qs}` : ""}`);
  },

  servicos: (params = {}) => {
    const query = new URLSearchParams();
    if (params.data_inicio) query.set("data_inicio", params.data_inicio);
    if (params.data_fim) query.set("data_fim", params.data_fim);
    const qs = query.toString();
    return apiFetch(`/api/relatorios/servicos${qs ? `?${qs}` : ""}`);
  },

  financeiro: (params = {}) => {
    const query = new URLSearchParams();
    if (params.data_inicio) query.set("data_inicio", params.data_inicio);
    if (params.data_fim) query.set("data_fim", params.data_fim);
    const qs = query.toString();
    return apiFetch(`/api/relatorios/financeiro${qs ? `?${qs}` : ""}`);
  },

  status: (params = {}) => {
    const query = new URLSearchParams();
    if (params.data_inicio) query.set("data_inicio", params.data_inicio);
    if (params.data_fim) query.set("data_fim", params.data_fim);
    const qs = query.toString();
    return apiFetch(`/api/relatorios/status${qs ? `?${qs}` : ""}`);
  },

  clientesFrequentes: (params = {}) => {
    const query = new URLSearchParams();
    if (params.data_inicio) query.set("data_inicio", params.data_inicio);
    if (params.data_fim) query.set("data_fim", params.data_fim);
    const qs = query.toString();
    return apiFetch(`/api/relatorios/clientes-frequentes${qs ? `?${qs}` : ""}`);
  },

  exportarExcel: (params = {}) => {
    downloadBlob(exportUrl("exportar/excel", params), `relatorio-esteticar-${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  exportarPDF: (params = {}) => {
    downloadBlob(exportUrl("exportar/pdf", params), `relatorio-esteticar-${new Date().toISOString().slice(0, 10)}.pdf`);
  },
};
