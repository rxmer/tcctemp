import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ContasPagar } from "../pages/financeiro-contas";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/financeiro.service", () => ({
  financeiroService: {
    listarContas: vi.fn(),
    criarConta: vi.fn(),
    atualizarConta: vi.fn(),
    pagarConta: vi.fn(),
  },
}));
vi.mock("../hooks/useFeedback", () => ({ useFeedback: vi.fn() }));

import { useAuth } from "../context/useAuth";
import { financeiroService } from "../services/financeiro.service";
import { useFeedback } from "../hooks/useFeedback";

function renderPage() {
  return render(<MemoryRouter><ContasPagar /></MemoryRouter>);
}

describe("Contas a Pagar page", () => {
  const mockShowFeedback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ tenant: { id: "t1", nome: "Esteticar" } });
    useFeedback.mockReturnValue({ feedback: null, showFeedback: mockShowFeedback });
    financeiroService.listarContas.mockResolvedValue({ data: [], total: 0 });
  });

  it("renderiza titulo e formulario", async () => {
    renderPage();
    expect(screen.getByText("Contas a Pagar")).toBeInTheDocument();
    expect(screen.getByLabelText(/descri/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/valor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vencimento/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cadastrar/i })).toBeInTheDocument();
  });

  it("renderiza lista vazia", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/nenhuma conta cadastrada/i)).toBeInTheDocument();
    });
  });

  it("carrega e exibe contas", async () => {
    financeiroService.listarContas.mockResolvedValue({
      data: [
        { conta_id: 1, descricao: "Aluguel", valor: 1500, data_vencimento: "2026-01-10", pago: true },
        { conta_id: 2, descricao: "Luz", valor: 200.5, data_vencimento: "2026-01-15", pago: false },
      ],
      total: 2,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Aluguel")).toBeInTheDocument();
      expect(screen.getByText("Luz")).toBeInTheDocument();
      expect(screen.getByText("Pago")).toBeInTheDocument();
      expect(screen.getByText("Pendente")).toBeInTheDocument();
    });
  });

  it("cria conta ao submeter formulario", async () => {
    financeiroService.criarConta.mockResolvedValue({ conta_id: 1 });
    financeiroService.listarContas.mockResolvedValue({ data: [], total: 0 });

    renderPage();

    fireEvent.change(screen.getByLabelText(/descri/i), { target: { value: "Internet" } });
    fireEvent.change(screen.getByLabelText(/valor/i), { target: { value: "99.9" } });
    fireEvent.change(screen.getByLabelText(/vencimento/i), { target: { value: "2026-02-01" } });
    fireEvent.click(screen.getByRole("button", { name: /cadastrar/i }));

    await waitFor(() => {
      expect(financeiroService.criarConta).toHaveBeenCalledWith({
        descricao: "Internet",
        valor: 99.9,
        data_vencimento: "2026-02-01",
        observacoes: null,
      });
    });
  });

  it("paga conta ao clicar em pagar", async () => {
    financeiroService.pagarConta.mockResolvedValue({});
    financeiroService.listarContas.mockResolvedValue({
      data: [{ conta_id: 7, descricao: "Luz", valor: 200, data_vencimento: "2026-01-15", pago: false }],
      total: 1,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Luz")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Pagar"));

    await waitFor(() => {
      expect(financeiroService.pagarConta).toHaveBeenCalledWith(7);
    });
  });

  it("mostra erro ao criar conta com falha na API", async () => {
    financeiroService.criarConta.mockRejectedValue(new Error("Erro ao criar"));

    renderPage();

    fireEvent.change(screen.getByLabelText(/descri/i), { target: { value: "Internet" } });
    fireEvent.change(screen.getByLabelText(/valor/i), { target: { value: "99.9" } });
    fireEvent.change(screen.getByLabelText(/vencimento/i), { target: { value: "2026-02-01" } });
    fireEvent.click(screen.getByRole("button", { name: /cadastrar/i }));

    await waitFor(() => {
      expect(mockShowFeedback).toHaveBeenCalledWith("error", "Erro ao criar");
    });
  });
});
