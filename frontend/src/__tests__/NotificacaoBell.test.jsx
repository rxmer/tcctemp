import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { NotificacaoBell } from "../components/NotificacaoBell";

vi.mock("../services/notificacoes.service", () => ({
  notificacoesService: {
    listar: vi.fn(),
    contar: vi.fn(),
    marcarLida: vi.fn(),
    marcarTodasLidas: vi.fn(),
  },
}));

vi.mock("../services/agendamentos.service", () => ({
  agendamentosService: {
    atualizar: vi.fn(),
  },
}));

import { notificacoesService } from "../services/notificacoes.service";
import { agendamentosService } from "../services/agendamentos.service";

const notifRevisao = {
  notificacao_id: 10,
  tipo: "revisao_agendamento_passado",
  titulo: "Revisar serviço realizado?",
  mensagem: "O agendamento de Ana continua confirmado e a data já passou.",
  referencia_id: "55",
  lida: false,
  criado_em: new Date().toISOString(),
};

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificacaoBell />
    </MemoryRouter>
  );
}

describe("NotificacaoBell - acoes de revisao de agendamento passado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificacoesService.listar.mockResolvedValue([notifRevisao]);
    notificacoesService.contar.mockResolvedValue({ count: 1 });
  });

  it("mostra botoes de acao na notificacao de revisao", async () => {
    renderBell();

    await waitFor(() => expect(notificacoesService.listar).toHaveBeenCalled());

    fireEvent.click(screen.getByTitle("Notificações"));

    expect(await screen.findByText("Cliente faltou")).toBeInTheDocument();
    expect(screen.getByText("Ver agenda")).toBeInTheDocument();
  });

  it("marca falta via API e remove a notificacao da lista", async () => {
    agendamentosService.atualizar.mockResolvedValue({});
    renderBell();

    await waitFor(() => expect(notificacoesService.listar).toHaveBeenCalled());
    fireEvent.click(screen.getByTitle("Notificações"));
    fireEvent.click(await screen.findByText("Cliente faltou"));

    await waitFor(() =>
      expect(agendamentosService.atualizar).toHaveBeenCalledWith("55", { status: "falta" })
    );
    await waitFor(() =>
      expect(screen.queryByText("Cliente faltou")).not.toBeInTheDocument()
    );
  });

  it("exibe erro quando a API falha ao marcar falta", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    agendamentosService.atualizar.mockRejectedValue(new Error("Transição não permitida"));
    renderBell();

    await waitFor(() => expect(notificacoesService.listar).toHaveBeenCalled());
    fireEvent.click(screen.getByTitle("Notificações"));
    fireEvent.click(await screen.findByText("Cliente faltou"));

    await waitFor(() =>
      expect(agendamentosService.atualizar).toHaveBeenCalledWith("55", { status: "falta" })
    );
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("Transição não permitida"));
    alertSpy.mockRestore();
  });

  it("remove silenciosamente quando o agendamento ja esta como falta", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    agendamentosService.atualizar.mockRejectedValue(
      new Error('Não é permitido mudar de "falta" para "falta"')
    );
    renderBell();

    await waitFor(() => expect(notificacoesService.listar).toHaveBeenCalled());
    fireEvent.click(screen.getByTitle("Notificações"));
    fireEvent.click(await screen.findByText("Cliente faltou"));

    await waitFor(() =>
      expect(screen.queryByText("Cliente faltou")).not.toBeInTheDocument()
    );
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("nao mostra botoes em notificacoes comuns", async () => {
    notificacoesService.listar.mockResolvedValue([
      { ...notifRevisao, notificacao_id: 11, tipo: "lembrete_falha" },
    ]);
    renderBell();

    await waitFor(() => expect(notificacoesService.listar).toHaveBeenCalled());
    fireEvent.click(screen.getByTitle("Notificações"));
    await screen.findByText(/continua confirmado|Lembrete não entregue/i);

    expect(screen.queryByText("Cliente faltou")).not.toBeInTheDocument();
  });
});
