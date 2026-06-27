import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Servicos } from "../pages/servicos";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/servicos.service", () => ({
  servicosService: { listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), deletar: vi.fn(), toggleAtivo: vi.fn() },
}));
vi.mock("../hooks/useFeedback", () => ({ useFeedback: vi.fn() }));
vi.mock("../hooks/useConfirm", () => ({ useConfirm: vi.fn() }));
vi.mock("../styles/pages/servicos.module.css", () => ({
  default: {
    servGrid: "servGrid", formCard: "formCard", cardHeader: "cardHeader", servForm: "servForm",
    formActions: "formActions", listCard: "listCard", searchBar: "searchBar", searchInput: "searchInput",
    emptyState: "emptyState", tableWrapper: "tableWrapper", table: "table", actionBtns: "actionBtns",
    actionBtn: "actionBtn", actionDelete: "actionDelete", tenantChip: "tenantChip", tenantDot: "tenantDot",
    toggleBtn: "toggleBtn", toggleAtivo: "toggleAtivo", toggleInativo: "toggleInativo",
  },
}));

import { useAuth } from "../context/useAuth";
import { servicosService } from "../services/servicos.service";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";

function renderPage() {
  return render(<MemoryRouter><Servicos /></MemoryRouter>);
}

describe("Servicos page", () => {
  const mockShowFeedback = vi.fn();
  const mockConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ tenant: { id: "t1", nome: "Esteticar" } });
    useFeedback.mockReturnValue({ feedback: null, showFeedback: mockShowFeedback });
    useConfirm.mockReturnValue({ confirm: mockConfirm, ConfirmModal: () => null });
    servicosService.listar.mockResolvedValue({ data: [], total: 0 });
  });

  it("renderiza titulo", async () => {
    renderPage();
    expect(screen.getByText("Serviços")).toBeInTheDocument();
  });

  it("renderiza formulario", async () => {
    renderPage();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cadastrar serviço/i })).toBeInTheDocument();
  });

  it("carrega e exibe servicos", async () => {
    servicosService.listar.mockResolvedValue({
      data: [{ servico_id: 1, nome_servico: "Lavagem", preco_base: 50, duracao_min: 30, ativo: true }],
      total: 1,
    });
    renderPage();
    await waitFor(() => { expect(screen.getByText("Lavagem")).toBeInTheDocument(); });
  });

  it("mostra erro ao criar sem nome", async () => {
    renderPage();
    await waitFor(() => { expect(screen.getByRole("button", { name: /cadastrar serviço/i })).toBeInTheDocument(); });
    fireEvent.submit(screen.getByRole("button", { name: /cadastrar serviço/i }).closest("form"));
    await waitFor(() => { expect(mockShowFeedback).toHaveBeenCalledWith("error", "Preencha todos os campos obrigatórios"); });
  });

  it("cria servico ao submeter", async () => {
    servicosService.criar.mockResolvedValue({ servico_id: 1 });
    servicosService.listar
      .mockResolvedValueOnce({ data: [], total: 0 })
      .mockResolvedValueOnce({ data: [{ servico_id: 1, nome_servico: "Lavagem", preco_base: 50 }], total: 1 });
    renderPage();
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Lavagem" } });
    fireEvent.change(screen.getByLabelText(/preço/i), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText(/duração/i), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: /cadastrar serviço/i }));
    await waitFor(() => { expect(servicosService.criar).toHaveBeenCalled(); });
  });

  it("mostra estado vazio", async () => {
    renderPage();
    await waitFor(() => { expect(screen.getByText(/nenhum serviço/i)).toBeInTheDocument(); });
  });
});
