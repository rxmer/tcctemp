import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Financeiro } from "../pages/financeiro";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/financeiro.service", () => ({
  financeiroService: { resumo: vi.fn(), listarContas: vi.fn(), listarFaturamentos: vi.fn(), criarConta: vi.fn() },
}));
vi.mock("../hooks/useFeedback", () => ({ useFeedback: vi.fn() }));
vi.mock("../styles/pages/financeiro.module.css", () => ({
  default: {
    finGrid: "finGrid", resumoCard: "resumoCard", resumoTitle: "resumoTitle", resumoValue: "resumoValue",
    tabs: "tabs", tab: "tab", tabActive: "tabActive", formCard: "formCard", cardHeader: "cardHeader",
    finForm: "finForm", formActions: "formActions", listCard: "listCard", tableWrapper: "tableWrapper",
    table: "table", emptyState: "emptyState", tenantChip: "tenantChip", tenantDot: "tenantDot",
    statusPago: "statusPago", statusPendente: "statusPendente",
  },
}));

import { useAuth } from "../context/useAuth";
import { financeiroService } from "../services/financeiro.service";
import { useFeedback } from "../hooks/useFeedback";

function renderPage() {
  return render(<MemoryRouter><Financeiro /></MemoryRouter>);
}

describe("Financeiro page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ tenant: { id: "t1", nome: "Esteticar" } });
    useFeedback.mockReturnValue({ feedback: null, showFeedback: vi.fn() });
    financeiroService.resumo.mockResolvedValue({
      receitas: { total: 1000, recebido: 800, a_receber: 200 },
      despesas: { total: 500, pago: 300, a_pagar: 200 },
      saldo: 500,
    });
    financeiroService.listarContas.mockResolvedValue({ data: [], total: 0 });
    financeiroService.listarFaturamentos.mockResolvedValue({ data: [], total: 0 });
  });

  it("renderiza titulo", async () => {
    renderPage();
    expect(screen.getByText("Financeiro")).toBeInTheDocument();
  });

  it("renderiza abas", async () => {
    renderPage();
    expect(screen.getByText(/resumo/i)).toBeInTheDocument();
    expect(screen.getByText(/contas a pagar/i)).toBeInTheDocument();
    expect(screen.getByText(/faturamentos/i)).toBeInTheDocument();
  });

  it("carrega resumo ao montar", async () => {
    renderPage();
    await waitFor(() => { expect(financeiroService.resumo).toHaveBeenCalled(); });
  });

  it("exibe dados do resumo", async () => {
    renderPage();
    await waitFor(() => { expect(screen.getByText(/total receitas/i)).toBeInTheDocument(); });
  });

  it("mostra erro ao carregar", async () => {
    const showFeedback = vi.fn();
    useFeedback.mockReturnValue({ feedback: null, showFeedback });
    financeiroService.resumo.mockRejectedValue(new Error("Erro"));
    renderPage();
    await waitFor(() => { expect(showFeedback).toHaveBeenCalled(); });
  });
});
