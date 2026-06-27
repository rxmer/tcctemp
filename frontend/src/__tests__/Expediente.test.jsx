import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Expediente } from "../pages/expediente";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/expediente.service", () => ({
  expedienteService: { listar: vi.fn(), upsertAll: vi.fn() },
}));
vi.mock("../hooks/useFeedback", () => ({ useFeedback: vi.fn() }));
vi.mock("../styles/pages/expediente.module.css", () => ({
  default: {
    expGrid: "expGrid", diaCard: "diaCard", diaHeader: "diaHeader", diaNome: "diaNome",
    diaToggle: "diaToggle", horarios: "horarios", horarioGroup: "horarioGroup",
    horarioLabel: "horarioLabel", horarioInput: "horarioInput", saveBar: "saveBar",
    tenantChip: "tenantChip", tenantDot: "tenantDot",
  },
}));

import { useAuth } from "../context/useAuth";
import { expedienteService } from "../services/expediente.service";
import { useFeedback } from "../hooks/useFeedback";

function renderPage() {
  return render(<Expediente />);
}

describe("Expediente page", () => {
  const mockShowFeedback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ tenant: { id: "t1", nome: "Esteticar" } });
    useFeedback.mockReturnValue({ feedback: null, showFeedback: mockShowFeedback });
    expedienteService.listar.mockResolvedValue([]);
  });

  it("renderiza titulo", async () => {
    renderPage();
    expect(screen.getByText("Expediente")).toBeInTheDocument();
  });

  it("renderiza dias da semana", async () => {
    renderPage();
    expect(screen.getByText("Segunda-feira")).toBeInTheDocument();
    expect(screen.getByText("Sexta-feira")).toBeInTheDocument();
    expect(screen.getByText("Domingo")).toBeInTheDocument();
  });

  it("renderiza botao salvar", async () => {
    renderPage();
    expect(screen.getByRole("button", { name: /salvar/i })).toBeInTheDocument();
  });

  it("salva expediente ao clicar em salvar", async () => {
    expedienteService.upsertAll.mockResolvedValue();
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));
    await waitFor(() => { expect(expedienteService.upsertAll).toHaveBeenCalled(); });
  });

  it("mostra sucesso ao salvar", async () => {
    expedienteService.upsertAll.mockResolvedValue();
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));
    await waitFor(() => { expect(mockShowFeedback).toHaveBeenCalledWith("success", expect.stringContaining("sucesso")); });
  });

  it("mostra erro ao salvar", async () => {
    expedienteService.upsertAll.mockRejectedValue(new Error("Erro"));
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));
    await waitFor(() => { expect(mockShowFeedback).toHaveBeenCalledWith("error", "Erro"); });
  });
});
