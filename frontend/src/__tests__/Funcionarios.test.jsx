import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Funcionario } from "../pages/funcionarios";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/funcionarios.service", () => ({
  funcionariosService: { criar: vi.fn(), listar: vi.fn(), redefinirSenha: vi.fn(), deletar: vi.fn(), atualizar: vi.fn() },
}));
vi.mock("../hooks/useFeedback", () => ({ useFeedback: vi.fn() }));
vi.mock("../hooks/useConfirm", () => ({ useConfirm: vi.fn() }));
vi.mock("../styles/pages/funcionarios.module.css", () => ({
  default: {
    funcGrid: "funcGrid", formCard: "formCard", cardHeader: "cardHeader", funcForm: "funcForm",
    formActions: "formActions", listCard: "listCard", tableWrapper: "tableWrapper", table: "table",
    emptyState: "emptyState", tenantChip: "tenantChip", tenantDot: "tenantDot",
  },
}));

import { useAuth } from "../context/useAuth";
import { funcionariosService } from "../services/funcionarios.service";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";

function renderPage() {
  return render(<MemoryRouter><Funcionario /></MemoryRouter>);
}

describe("Funcionario page", () => {
  const mockShowFeedback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ tenant: { id: "t1", nome: "Esteticar" } });
    useFeedback.mockReturnValue({ feedback: null, showFeedback: mockShowFeedback });
    useConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(true), ConfirmModal: () => null });
    funcionariosService.listar.mockResolvedValue([]);
  });

  it("renderiza titulo", async () => {
    renderPage();
    expect(screen.getByText("Funcionários")).toBeInTheDocument();
  });

  it("renderiza formulario", async () => {
    renderPage();
    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument();
  });

  it("mostra erro se senhas nao coincidem", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: "123456" } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: "654321" } });
    fireEvent.submit(screen.getByRole("button", { name: /cadastrar/i }).closest("form"));
    await waitFor(() => { expect(mockShowFeedback).toHaveBeenCalledWith("error", "As senhas não coincidem"); });
  });

  it("cria funcionario ao submeter", async () => {
    funcionariosService.criar.mockResolvedValue({ id: "u1" });
    renderPage();
    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: "Maria" } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "maria@test.com" } });
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: "123456" } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /cadastrar/i }));
    await waitFor(() => { expect(funcionariosService.criar).toHaveBeenCalled(); });
  });

  it("mostra sucesso ao criar", async () => {
    funcionariosService.criar.mockResolvedValue({ id: "u1" });
    renderPage();
    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: "Maria" } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "maria@test.com" } });
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: "123456" } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /cadastrar/i }));
    await waitFor(() => { expect(mockShowFeedback).toHaveBeenCalledWith("success", expect.stringContaining("sucesso")); });
  });

  it("mostra erro ao criar com falha na API", async () => {
    funcionariosService.criar.mockRejectedValue(new Error("Erro ao criar"));
    renderPage();
    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: "Maria" } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "maria@test.com" } });
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: "123456" } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /cadastrar/i }));
    await waitFor(() => { expect(mockShowFeedback).toHaveBeenCalledWith("error", "Erro ao criar"); });
  });

  it("redefine senha de um funcionario pelo modal", async () => {
    useConfirm.mockReturnValue({ confirm: vi.fn(), ConfirmModal: () => null });
    funcionariosService.listar.mockResolvedValue([
      { id: "f1", nome: "João", email: "joao@test.com", perfil: "funcionario" },
    ]);
    funcionariosService.redefinirSenha.mockResolvedValue({ id: "f1" });

    renderPage();
    await waitFor(() => { expect(screen.getByText("João")).toBeInTheDocument(); });

    fireEvent.click(screen.getByTitle("Redefinir senha"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    fireEvent.change(dialog.querySelector('input[name="senha"]'), { target: { value: "novaSenha123" } });
    fireEvent.change(dialog.querySelector('input[name="confirmar"]'), { target: { value: "novaSenha123" } });
    fireEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() => {
      expect(funcionariosService.redefinirSenha).toHaveBeenCalledWith("f1", "novaSenha123");
      expect(mockShowFeedback).toHaveBeenCalledWith("success", expect.stringContaining("redefinida"));
    });
  });

  it("valida senhas diferentes no modal de reset", async () => {
    useConfirm.mockReturnValue({ confirm: vi.fn(), ConfirmModal: () => null });
    funcionariosService.listar.mockResolvedValue([
      { id: "f1", nome: "João", email: "joao@test.com", perfil: "funcionario" },
    ]);

    renderPage();
    await waitFor(() => { expect(screen.getByText("João")).toBeInTheDocument(); });

    fireEvent.click(screen.getByTitle("Redefinir senha"));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(dialog.querySelector('input[name="senha"]'), { target: { value: "abc12345" } });
    fireEvent.change(dialog.querySelector('input[name="confirmar"]'), { target: { value: "xyz98765" } });
    fireEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() => {
      expect(mockShowFeedback).toHaveBeenCalledWith("error", "As senhas não coincidem");
    });
    expect(funcionariosService.redefinirSenha).not.toHaveBeenCalled();
  });
});
