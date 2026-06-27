import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Veiculos } from "../pages/veiculos";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/veiculos.service", () => ({
  veiculosService: { listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), deletar: vi.fn() },
}));
vi.mock("../services/clientes.service", () => ({
  clientesService: { listar: vi.fn() },
}));
vi.mock("../hooks/useFeedback", () => ({ useFeedback: vi.fn() }));
vi.mock("../hooks/useConfirm", () => ({ useConfirm: vi.fn() }));
vi.mock("../styles/pages/veiculos.module.css", () => ({
  default: {
    veicGrid: "veicGrid", formCard: "formCard", cardHeader: "cardHeader", veicForm: "veicForm",
    formActions: "formActions", listCard: "listCard", searchBar: "searchBar", searchInput: "searchInput",
    emptyState: "emptyState", tableWrapper: "tableWrapper", table: "table", actionBtns: "actionBtns",
    actionBtn: "actionBtn", actionDelete: "actionDelete", tenantChip: "tenantChip", tenantDot: "tenantDot",
  },
}));

import { useAuth } from "../context/useAuth";
import { veiculosService } from "../services/veiculos.service";
import { clientesService } from "../services/clientes.service";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";

function renderPage() {
  return render(<MemoryRouter><Veiculos /></MemoryRouter>);
}

describe("Veiculos page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ tenant: { id: "t1", nome: "Esteticar" } });
    useFeedback.mockReturnValue({ feedback: null, showFeedback: vi.fn() });
    useConfirm.mockReturnValue({ confirm: vi.fn(), ConfirmModal: () => null });
    veiculosService.listar.mockResolvedValue({ data: [], total: 0 });
    clientesService.listar.mockResolvedValue({ data: [] });
  });

  it("renderiza titulo", async () => {
    renderPage();
    expect(screen.getByText("Veículos")).toBeInTheDocument();
  });

  it("renderiza formulario", async () => {
    renderPage();
    expect(screen.getByLabelText(/placa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/marca/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/modelo/i)).toBeInTheDocument();
  });

  it("carrega veiculos e clientes ao montar", async () => {
    renderPage();
    await waitFor(() => {
      expect(veiculosService.listar).toHaveBeenCalled();
      expect(clientesService.listar).toHaveBeenCalled();
    });
  });

  it("exibe veiculos carregados", async () => {
    veiculosService.listar.mockResolvedValue({
      data: [{ veiculo_id: 1, placa: "ABC1234", marca: "Fiat", modelo: "Uno", ano: 2020, cor: "Prata" }],
      total: 1,
    });
    renderPage();
    await waitFor(() => { expect(screen.getByText("ABC1234")).toBeInTheDocument(); });
  });

  it("mostra estado vazio", async () => {
    renderPage();
    await waitFor(() => { expect(screen.getByText(/nenhum veículo/i)).toBeInTheDocument(); });
  });

  it("mostra erro ao carregar", async () => {
    const showFeedback = vi.fn();
    useFeedback.mockReturnValue({ feedback: null, showFeedback });
    veiculosService.listar.mockRejectedValue(new Error("Erro"));
    renderPage();
    await waitFor(() => { expect(showFeedback).toHaveBeenCalled(); });
  });
});
