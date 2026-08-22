import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Faturamentos } from "../pages/financeiro-faturamentos";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/financeiro.service", () => ({
  financeiroService: {
    listarFaturamentos: vi.fn(),
    receberFaturamento: vi.fn(),
  },
}));
vi.mock("../hooks/useFeedback", () => ({ useFeedback: vi.fn() }));

import { useAuth } from "../context/useAuth";
import { financeiroService } from "../services/financeiro.service";
import { useFeedback } from "../hooks/useFeedback";

function renderPage() {
  return render(<MemoryRouter><Faturamentos /></MemoryRouter>);
}

describe("Faturamentos page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ tenant: { id: "t1", nome: "Esteticar" } });
    useFeedback.mockReturnValue({ feedback: null, showFeedback: vi.fn() });
    financeiroService.listarFaturamentos.mockResolvedValue({ data: [], total: 0 });
  });

  it("renderiza titulo", () => {
    renderPage();
    expect(screen.getAllByText("Faturamentos").length).toBeGreaterThan(0);
  });

  it("renderiza lista vazia", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/nenhum faturamento gerado ainda/i)).toBeInTheDocument();
    });
  });

  it("carrega e exibe faturamentos", async () => {
    financeiroService.listarFaturamentos.mockResolvedValue({
      data: [
        { faturamento_id: 1, os_id: 5, valor_total: 250, criado_em: "2026-01-05T10:00:00", pago: true },
        { faturamento_id: 2, os_id: 6, valor_total: 180.5, criado_em: "2026-01-08T10:00:00", pago: false },
      ],
      total: 2,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("OS #5")).toBeInTheDocument();
      expect(screen.getByText("OS #6")).toBeInTheDocument();
      expect(screen.getByText("Recebido")).toBeInTheDocument();
      expect(screen.getByText("Pendente")).toBeInTheDocument();
    });
  });

  it("recebe faturamento ao clicar em receber", async () => {
    financeiroService.receberFaturamento.mockResolvedValue({});
    financeiroService.listarFaturamentos
      .mockResolvedValueOnce({
        data: [{ faturamento_id: 9, os_id: 3, valor_total: 300, criado_em: "2026-01-08T10:00:00", pago: false }],
        total: 1,
      })
      .mockResolvedValue({ data: [], total: 0 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTitle("Receber")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Receber"));

    await waitFor(() => {
      expect(financeiroService.receberFaturamento).toHaveBeenCalledWith(9, expect.any(String));
    });
  });
});
