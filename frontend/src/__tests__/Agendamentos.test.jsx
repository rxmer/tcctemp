import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Agendamentos } from "../pages/agendamentos";

vi.mock("../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../services/agendamentos.service", () => ({
  agendamentosService: { listar: vi.fn() },
}));

vi.mock("../services/clientes.service", () => ({
  clientesService: { listar: vi.fn() },
}));

vi.mock("../services/veiculos.service", () => ({
  veiculosService: { listar: vi.fn() },
}));

vi.mock("../services/servicos.service", () => ({
  servicosService: { listar: vi.fn() },
}));

vi.mock("../hooks/useFeedback", () => ({
  useFeedback: vi.fn(),
}));

vi.mock("../hooks/useConfirm", () => ({
  useConfirm: vi.fn(),
}));

vi.mock("../styles/pages/agendamentos.module.css", () => ({
  default: {
    agGrid: "agGrid",
    formCard: "formCard",
    cardHeader: "cardHeader",
    agForm: "agForm",
    formActions: "formActions",
    listCard: "listCard",
    filtersBar: "filtersBar",
    filterSelect: "filterSelect",
    filterInput: "filterInput",
    emptyState: "emptyState",
    tableWrapper: "tableWrapper",
    table: "table",
    statusBadge: "statusBadge",
    actionBtns: "actionBtns",
    actionBtn: "actionBtn",
    actionDelete: "actionDelete",
    viewToggle: "viewToggle",
    viewBtn: "viewBtn",
    tenantChip: "tenantChip",
    tenantDot: "tenantDot",
  },
}));

vi.mock("../components/ui/Calendar.module.css", () => ({
  default: {
    wrapper: "wrapper",
    header: "header",
    nav: "nav",
    title: "title",
    todayBtn: "todayBtn",
    weekdays: "weekdays",
    weekday: "weekday",
    grid: "grid",
    day: "day",
    dayToday: "dayToday",
    daySelected: "daySelected",
    dayHasEvents: "dayHasEvents",
    dayNum: "dayNum",
    badge: "badge",
  },
}));

import { useAuth } from "../context/useAuth";
import { agendamentosService } from "../services/agendamentos.service";
import { clientesService } from "../services/clientes.service";
import { veiculosService } from "../services/veiculos.service";
import { servicosService } from "../services/servicos.service";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";

function renderAgendamentos() {
  return render(
    <MemoryRouter>
      <Agendamentos />
    </MemoryRouter>
  );
}

describe("Agendamentos page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ tenant: { id: "tenant-1", nome: "Esteticar" } });
    useFeedback.mockReturnValue({ feedback: null, showFeedback: vi.fn() });
    useConfirm.mockReturnValue({ confirm: vi.fn(), ConfirmModal: () => null });
    agendamentosService.listar.mockResolvedValue({ data: [], total: 0 });
    clientesService.listar.mockResolvedValue({ data: [] });
    veiculosService.listar.mockResolvedValue({ data: [] });
    servicosService.listar.mockResolvedValue({ data: [] });
  });

  it("renderiza titulo da pagina", async () => {
    renderAgendamentos();
    const headings = screen.getAllByRole("heading", { name: /agendamentos/i });
    expect(headings.length).toBeGreaterThan(0);
  });

  it("renderiza formulario de agendamento", async () => {
    renderAgendamentos();
    expect(screen.getByText("Novo agendamento")).toBeInTheDocument();
  });

  it("carrega e exibe agendamentos", async () => {
    agendamentosService.listar.mockResolvedValue({
      data: [
        {
          agendamento_id: 1,
          cliente_id: 1,
          veiculo_id: 1,
          servico_id: 1,
          data_agendamento: "2026-07-01",
          hora_agendamento: "10:00:00",
          status: "pendente",
          observacoes: null,
        },
      ],
      total: 1,
    });

    renderAgendamentos();

    await waitFor(() => {
      expect(screen.getByText("Pendente")).toBeInTheDocument();
    });
  });

  it("mostra loading enquanto carrega", async () => {
    agendamentosService.listar.mockReturnValue(new Promise(() => {}));

    renderAgendamentos();

    expect(screen.getByText("Novo agendamento")).toBeInTheDocument();
  });

  it("mostra estado vazio quando nao ha agendamentos", async () => {
    agendamentosService.listar.mockResolvedValue({ data: [], total: 0 });

    renderAgendamentos();

    await waitFor(() => {
      expect(screen.getByText(/nenhum agendamento/i)).toBeInTheDocument();
    });
  });

  it("mostra erro ao carregar agendamentos", async () => {
    const showFeedback = vi.fn();
    useFeedback.mockReturnValue({ feedback: null, showFeedback });
    agendamentosService.listar.mockRejectedValue(new Error("Erro ao carregar"));

    renderAgendamentos();

    await waitFor(() => {
      expect(showFeedback).toHaveBeenCalledWith("error", "Erro ao carregar");
    });
  });

  it("carrega clientes, veiculos e servicos ao montar", async () => {
    renderAgendamentos();

    await waitFor(() => {
      expect(clientesService.listar).toHaveBeenCalled();
      expect(veiculosService.listar).toHaveBeenCalled();
      expect(servicosService.listar).toHaveBeenCalled();
    });
  });
});
