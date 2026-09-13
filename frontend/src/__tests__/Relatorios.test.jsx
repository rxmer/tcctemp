import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Relatorios } from "../pages/relatorios";
import { RelatorioAgendamentos } from "../pages/relatorios-agendamentos";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/relatorios.service", () => ({
  relatoriosService: {
    status: vi.fn(),
    clientesFrequentes: vi.fn(),
    agendamentos: vi.fn(),
    exportarExcel: vi.fn(),
    exportarPDF: vi.fn(),
  },
}));

import { useAuth } from "../context/useAuth";
import { relatoriosService } from "../services/relatorios.service";

const STATUS = [
  { status: "pendente", quantidade: 3, label: "Pendente" },
  { status: "confirmado", quantidade: 5, label: "Confirmado" },
  { status: "em_andamento", quantidade: 2, label: "Em Andamento" },
  { status: "finalizado", quantidade: 10, label: "Finalizado" },
  { status: "cancelado", quantidade: 2, label: "Cancelado" },
];

const CLIENTES = [
  { cliente_id: "c1", nome: "João Silva", telefone: "(11) 99999-9999", quantidade: 6 },
  { cliente_id: "c2", nome: "Maria Souza", telefone: "(11) 88888-8888", quantidade: 4 },
];

describe("Relatorios (visão geral)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ tenant: { id: "t1", nome: "Esteticar" } });
    relatoriosService.status.mockResolvedValue(STATUS);
    relatoriosService.clientesFrequentes.mockResolvedValue(CLIENTES);
  });

  it("renderiza título, filtros e exportações", async () => {
    render(<Relatorios />);
    expect(screen.getByText("Relatórios")).toBeInTheDocument();
    expect(await screen.findByText("Cancelados")).toBeInTheDocument();
    expect(screen.getByLabelText("Mês")).toBeInTheDocument();
    expect(screen.getByText("Excel")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("exibe os KPIs derivados do status", async () => {
    render(<Relatorios />);
    expect(await screen.findByText("Pendentes")).toBeInTheDocument();
    expect(screen.getByText("Confirmados")).toBeInTheDocument();
    expect(screen.getByText("Concluídos")).toBeInTheDocument();
    expect(screen.getByText("Cancelados")).toBeInTheDocument();
  });

  it("mostra total de agendamentos no donut", async () => {
    render(<Relatorios />);
    expect(await screen.findByText("22 agendamentos")).toBeInTheDocument();
    expect(screen.getByText("agendamentos")).toBeInTheDocument();
  });

  it("lista legendas de status e ranking de clientes", async () => {
    render(<Relatorios />);
    expect(await screen.findByText("Finalizado")).toBeInTheDocument();
    expect(screen.getByText("Em Andamento")).toBeInTheDocument();
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("Maria Souza")).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há dados", async () => {
    relatoriosService.status.mockResolvedValue([]);
    relatoriosService.clientesFrequentes.mockResolvedValue([]);
    render(<Relatorios />);
    expect(await screen.findByText("Sem agendamentos no período")).toBeInTheDocument();
  });
});

describe("RelatorioAgendamentos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ tenant: { id: "t1", nome: "Esteticar" } });
    relatoriosService.agendamentos.mockResolvedValue([
      { periodo: "2026-09-01", total: 4 },
      { periodo: "2026-09-02", total: 7 },
    ]);
  });

  it("renderiza o card e o total do período", async () => {
    render(<RelatorioAgendamentos />);
    expect(await screen.findByText("11 agendamentos")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Agendamentos por período" })).toBeInTheDocument();
    expect(screen.getByLabelText("Agrupar")).toBeInTheDocument();
  });
});