import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Clientes } from "../pages/clientes";

vi.mock("../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../services/clientes.service", () => ({
  clientesService: {
    listar: vi.fn(),
    criar: vi.fn(),
    atualizar: vi.fn(),
    deletar: vi.fn(),
  },
}));

vi.mock("../hooks/useFeedback", () => ({
  useFeedback: vi.fn(),
}));

vi.mock("../hooks/useConfirm", () => ({
  useConfirm: vi.fn(),
}));

vi.mock("../styles/pages/clientes.module.css", () => ({
  default: {
    cliGrid: "cliGrid",
    formCard: "formCard",
    cardHeader: "cardHeader",
    cliForm: "cliForm",
    formActions: "formActions",
    listCard: "listCard",
    searchBar: "searchBar",
    searchInput: "searchInput",
    emptyState: "emptyState",
    tableWrapper: "tableWrapper",
    table: "table",
    cliNome: "cliNome",
    actionBtns: "actionBtns",
    actionBtn: "actionBtn",
    actionDelete: "actionDelete",
    tenantChip: "tenantChip",
    tenantDot: "tenantDot",
  },
}));

import { useAuth } from "../context/useAuth";
import { clientesService } from "../services/clientes.service";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";

function renderClientes() {
  return render(
    <MemoryRouter>
      <Clientes />
    </MemoryRouter>
  );
}

describe("Clientes page", () => {
  const mockShowFeedback = vi.fn();
  const mockConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ tenant: { id: "tenant-1", nome: "Esteticar" } });
    useFeedback.mockReturnValue({ feedback: null, showFeedback: mockShowFeedback });
    useConfirm.mockReturnValue({ confirm: mockConfirm, ConfirmModal: () => null });
    clientesService.listar.mockResolvedValue({ data: [], total: 0 });
  });

  it("renderiza titulo da pagina", async () => {
    renderClientes();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
  });

  it("renderiza formulario de cadastro", async () => {
    renderClientes();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/telefone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cadastrar cliente/i })).toBeInTheDocument();
  });

  it("renderiza lista vazia", async () => {
    renderClientes();
    await waitFor(() => {
      expect(screen.getByText(/nenhum cliente cadastrado/i)).toBeInTheDocument();
    });
  });

  it("carrega e exibe clientes", async () => {
    clientesService.listar.mockResolvedValue({
      data: [
        { cliente_id: 1, nome: "João", telefone: "11999999999", email: "joao@test.com" },
        { cliente_id: 2, nome: "Maria", telefone: "11988888888", email: null },
      ],
      total: 2,
    });

    renderClientes();

    await waitFor(() => {
      expect(screen.getByText("João")).toBeInTheDocument();
      expect(screen.getByText("Maria")).toBeInTheDocument();
    });
  });

  it("cria cliente ao submeter formulario", async () => {
    clientesService.criar.mockResolvedValue({ cliente_id: 1 });
    clientesService.listar
      .mockResolvedValueOnce({ data: [], total: 0 })
      .mockResolvedValueOnce({ data: [{ cliente_id: 1, nome: "Novo", telefone: "11999999999", email: null }], total: 1 });

    renderClientes();

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Novo" } });
    fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: "11999999999" } });
    fireEvent.click(screen.getByRole("button", { name: /cadastrar cliente/i }));

    await waitFor(() => {
      expect(clientesService.criar).toHaveBeenCalledWith({
        nome: "Novo",
        telefone: "11999999999",
        email: null,
      });
    });
  });

  it("mostra erro ao criar cliente sem nome", async () => {
    renderClientes();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cadastrar cliente/i })).toBeInTheDocument();
    });

    fireEvent.submit(screen.getByRole("button", { name: /cadastrar cliente/i }).closest("form"));

    await waitFor(() => {
      expect(mockShowFeedback).toHaveBeenCalledWith("error", "Preencha o nome do cliente");
    });
  });

  it("mostra erro ao criar cliente com falha na API", async () => {
    clientesService.criar.mockRejectedValue(new Error("Erro ao criar"));

    renderClientes();

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Novo" } });
    fireEvent.click(screen.getByRole("button", { name: /cadastrar cliente/i }));

    await waitFor(() => {
      expect(mockShowFeedback).toHaveBeenCalledWith("error", "Erro ao criar");
    });
  });

  it("abre modo edicao ao clicar em editar", async () => {
    clientesService.listar.mockResolvedValue({
      data: [{ cliente_id: 1, nome: "João", telefone: "11999999999", email: "joao@test.com" }],
      total: 1,
    });

    renderClientes();

    await waitFor(() => {
      expect(screen.getByText("João")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Editar"));

    expect(screen.getByDisplayValue("João")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salvar alterações/i })).toBeInTheDocument();
  });

  it("confirma exclusao ao clicar em remover", async () => {
    mockConfirm.mockResolvedValue(true);
    clientesService.deletar.mockResolvedValue();
    clientesService.listar
      .mockResolvedValueOnce({ data: [{ cliente_id: 1, nome: "João", telefone: null, email: null }], total: 1 })
      .mockResolvedValueOnce({ data: [], total: 0 });

    renderClientes();

    await waitFor(() => {
      expect(screen.getByText("João")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Remover"));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith('Remover cliente "João"?');
      expect(clientesService.deletar).toHaveBeenCalledWith(1);
    });
  });

  it("nao deleta se usuario cancelar confirmacao", async () => {
    mockConfirm.mockResolvedValue(false);
    clientesService.listar.mockResolvedValue({
      data: [{ cliente_id: 1, nome: "João", telefone: null, email: null }],
      total: 1,
    });

    renderClientes();

    await waitFor(() => {
      expect(screen.getByText("João")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Remover"));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
      expect(clientesService.deletar).not.toHaveBeenCalled();
    });
  });

  it("atualiza campos do formulario", async () => {
    renderClientes();

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Teste" } });
    expect(screen.getByLabelText(/nome/i).value).toBe("Teste");
  });
});
