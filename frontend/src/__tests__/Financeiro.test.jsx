import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Financeiro } from "../pages/financeiro";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/financeiro.service", () => ({
  financeiroService: { resumo: vi.fn() },
}));
vi.mock("../hooks/useFeedback", () => ({ useFeedback: vi.fn() }));

import { useAuth } from "../context/useAuth";
import { financeiroService } from "../services/financeiro.service";
import { useFeedback } from "../hooks/useFeedback";

function renderPage() {
  return render(<MemoryRouter><Financeiro /></MemoryRouter>);
}

describe("Financeiro page (visão geral)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ tenant: { id: "t1", nome: "Esteticar" } });
    useFeedback.mockReturnValue({ feedback: null, showFeedback: vi.fn() });
    financeiroService.resumo.mockResolvedValue({
      receitas: { total: 1000, recebido: 800, a_receber: 200 },
      despesas: { total: 500, pago: 300, a_pagar: 200 },
      saldo: 500,
    });
  });

  it("renderiza titulo", () => {
    renderPage();
    expect(screen.getByText("Financeiro")).toBeInTheDocument();
  });

  it("carrega resumo ao montar", async () => {
    renderPage();
    await waitFor(() => { expect(financeiroService.resumo).toHaveBeenCalled(); });
  });

  it("exibe dados do resumo", async () => {
    renderPage();
    await waitFor(() => { expect(screen.getByText(/total receitas/i)).toBeInTheDocument(); });
    expect(screen.getByText(/saldo/i)).toBeInTheDocument();
  });

  it("envia filtro de data ao selecionar", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const { container } = renderPage();
    const input = container.querySelector('input[type="date"]');
    fireEvent.change(input, { target: { value: "2026-01-15" } });
    await waitFor(() => {
      expect(financeiroService.resumo).toHaveBeenLastCalledWith({
        data_inicio: "2026-01-15",
        data_fim: "2026-01-15",
      });
    });
  });

  it("mostra erro ao carregar", async () => {
    const showFeedback = vi.fn();
    useFeedback.mockReturnValue({ feedback: null, showFeedback });
    financeiroService.resumo.mockRejectedValue(new Error("Erro"));
    renderPage();
    await waitFor(() => { expect(showFeedback).toHaveBeenCalled(); });
  });
});
