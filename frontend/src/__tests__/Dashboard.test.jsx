import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "../pages/Dashboard";

vi.mock("../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../services/dashboard.service", () => ({
  dashboardService: {
    resumo: vi.fn(),
  },
}));

vi.mock("../styles/pages/Dashboard.module.css", () => ({
  default: {
    dashLoading: "dashLoading",
    dashContent: "dashContent",
    lowerGrid: "lowerGrid",
    dashError: "dashError",
    dashErrorIcon: "dashErrorIcon",
    statGrid: "statGrid",
    statCard: "statCard",
    statIcon: "statIcon",
    statValue: "statValue",
    statLabel: "statLabel",
    proximosSection: "proximosSection",
    sectionTitle: "sectionTitle",
    proximosList: "proximosList",
    proximoCard: "proximoCard",
    proximoTime: "proximoTime",
    proximoDate: "proximoDate",
    proximoInfo: "proximoInfo",
    proximoCliente: "proximoCliente",
    proximoDetalhe: "proximoDetalhe",
    proximoStatus: "proximoStatus",
    statusConfirmado: "statusConfirmado",
    statusPendente: "statusPendente",
    emptyProximos: "emptyProximos",
    quickCol: "quickCol",
    quickTitle: "quickTitle",
    quickBtn: "quickBtn",
    quickChevron: "quickChevron",
    skeletonStatGrid: "skeletonStatGrid",
    skeletonStat: "skeletonStat",
    skeletonStatIcon: "skeletonStatIcon",
    skStatValue: "skStatValue",
    skStatLabel: "skStatLabel",
    skeletonLowerGrid: "skeletonLowerGrid",
    skeletonProximos: "skeletonProximos",
    skTitle: "skTitle",
    skeletonProximo: "skeletonProximo",
    skTime: "skTime",
    skListBody: "skListBody",
    skName: "skName",
    skDetail: "skDetail",
    skPill: "skPill",
    skeletonQuick: "skeletonQuick",
    skActionTitle: "skActionTitle",
    skAction: "skAction",
    debugCard: "debugCard",
    debugTitle: "debugTitle",
    debugGrid: "debugGrid",
    debugRow: "debugRow",
    debugKey: "debugKey",
    debugVal: "debugVal",
    debugValAccent: "debugValAccent",
    userChip: "userChip",
    userAvatar: "userAvatar",
    userName: "userName",
    userRole: "userRole",
  },
}));

import { useAuth } from "../context/useAuth";
import { dashboardService } from "../services/dashboard.service";

describe("Dashboard page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra loading enquanto carrega", () => {
    useAuth.mockReturnValue({ loading: true, usuario: null, tenant: null });
    dashboardService.resumo.mockReturnValue(new Promise(() => {}));

    const { container } = render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(container.querySelector(".dashLoading")).toBeInTheDocument();
  });

  it("mostra stats apos carregar", async () => {
    useAuth.mockReturnValue({
      loading: false,
      usuario: { id: "user-1", nome: "João Silva", perfil: "admin" },
      tenant: { id: "tenant-1", nome: "Esteticar" },
    });
    dashboardService.resumo.mockResolvedValue({
      agendamentos_hoje: 5,
      servicos_realizados: 12,
      total_clientes: 50,
      faturamento_mes: 15000,
    });

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("12")).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
    });
  });

  it("mostra erro quando dashboard falha", async () => {
    useAuth.mockReturnValue({
      loading: false,
      usuario: { id: "user-1", nome: "João Silva", perfil: "admin" },
      tenant: { id: "tenant-1", nome: "Esteticar" },
    });
    dashboardService.resumo.mockRejectedValue(new Error("API error"));

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText(/Erro no dashboard/)).toBeInTheDocument();
    });
  });

  it("mostra erro quando usuario e null", async () => {
    useAuth.mockReturnValue({
      loading: false,
      usuario: null,
      tenant: null,
    });
    dashboardService.resumo.mockResolvedValue({});

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar perfil/)).toBeInTheDocument();
    });
  });

  it("mostra a data no header", async () => {
    useAuth.mockReturnValue({
      loading: false,
      usuario: { id: "user-1", nome: "João Silva", perfil: "admin" },
      tenant: { id: "tenant-1", nome: "Esteticar" },
    });
    dashboardService.resumo.mockResolvedValue({
      agendamentos_hoje: 0,
      servicos_realizados: 0,
      total_clientes: 0,
      faturamento_mes: 0,
    });

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    await waitFor(() => {
      expect(screen.getByText(hoje)).toBeInTheDocument();
    });
  });

  it("mostra perfil do usuario", async () => {
    useAuth.mockReturnValue({
      loading: false,
      usuario: { id: "user-1", nome: "João Silva", perfil: "admin" },
      tenant: { id: "tenant-1", nome: "Esteticar" },
    });
    dashboardService.resumo.mockResolvedValue({
      agendamentos_hoje: 0,
      servicos_realizados: 0,
      total_clientes: 0,
      faturamento_mes: 0,
    });

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText("Administrador")).toBeInTheDocument();
    });
  });

  it("mostra funcionario quando perfil nao e admin", async () => {
    useAuth.mockReturnValue({
      loading: false,
      usuario: { id: "user-1", nome: "Maria", perfil: "funcionario" },
      tenant: { id: "tenant-1", nome: "Esteticar" },
    });
    dashboardService.resumo.mockResolvedValue({
      agendamentos_hoje: 0,
      servicos_realizados: 0,
      total_clientes: 0,
      faturamento_mes: 0,
    });

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText("Funcionário")).toBeInTheDocument();
    });
  });
});
