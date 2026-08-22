import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Comunicados } from "../pages/comunicados";

vi.mock("../hooks/useFeedback", () => ({
  useFeedback: vi.fn(),
}));

vi.mock("../services/comunicados.service", () => ({
  comunicadosService: {
    criar: vi.fn(),
    listar: vi.fn(),
  },
}));

import { useFeedback } from "../hooks/useFeedback";
import { comunicadosService } from "../services/comunicados.service";

function renderPage() {
  return render(
    <MemoryRouter>
      <Comunicados />
    </MemoryRouter>
  );
}

describe("Comunicados page", () => {
  const mockShowFeedback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useFeedback.mockReturnValue({ feedback: null, showFeedback: mockShowFeedback });
    comunicadosService.listar.mockResolvedValue([]);
  });

  it("renderiza titulo e formulario", async () => {
    renderPage();
    expect(screen.getByText("Comunicados")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar comunicado/i })).toBeInTheDocument();
  });

  it("valida mensagem minima antes de enviar", async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/informamos que/i), {
      target: { value: "oi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar comunicado/i }));
    await waitFor(() => {
      expect(mockShowFeedback).toHaveBeenCalledWith("error", expect.stringContaining("mínimo"));
    });
    expect(comunicadosService.criar).not.toHaveBeenCalled();
  });

  it("envia comunicado com filtro selecionado", async () => {
    comunicadosService.criar.mockResolvedValue({ comunicado_id: 1 });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/informamos que/i), {
      target: { value: "Fecharemos dia 25 de dezembro" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar comunicado/i }));
    await waitFor(() => {
      expect(comunicadosService.criar).toHaveBeenCalledWith({
        mensagem: "Fecharemos dia 25 de dezembro",
        filtro: "todos",
      });
    });
  });

  it("lista historico de disparos", async () => {
    comunicadosService.listar.mockResolvedValue([
      {
        comunicado_id: 1,
        mensagem: "Aviso de feriado",
        status: "concluido",
        total_destinatarios: 10,
        enviados: 10,
        falhas: 0,
        criado_em: "2026-08-22T03:00:00Z",
      },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("10/10 entregues")).toBeInTheDocument();
    });
  });
});
