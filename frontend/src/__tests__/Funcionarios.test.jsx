import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Funcionario } from "../pages/funcionarios";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/funcionarios.service", () => ({
  funcionariosService: { criar: vi.fn(), listar: vi.fn() },
}));
vi.mock("../hooks/useFeedback", () => ({ useFeedback: vi.fn() }));
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

function renderPage() {
  return render(<MemoryRouter><Funcionario /></MemoryRouter>);
}

describe("Funcionario page", () => {
  const mockShowFeedback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ tenant: { id: "t1", nome: "Esteticar" } });
    useFeedback.mockReturnValue({ feedback: null, showFeedback: mockShowFeedback });
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
});
