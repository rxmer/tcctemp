import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ChatWidget } from "../components/ChatWidget";

vi.mock("../services/whatsapp.service", () => ({
  whatsappService: {
    getStatus: vi.fn(),
    getUnreadCount: vi.fn(),
    listSessions: vi.fn(),
    getMensagens: vi.fn(),
    sendReply: vi.fn(),
    resetSessao: vi.fn(),
    getSession: vi.fn(),
  },
}));

vi.mock("../hooks/usePolling", () => ({
  usePolling: () => {},
}));

vi.mock("../components/ChatWidget.module.css", () => ({
  default: {
    widgetBtn: "widgetBtn",
    badge: "badge",
    panel: "panel",
    panelHeader: "panelHeader",
    panelTitle: "panelTitle",
    panelClose: "panelClose",
    sessionList: "sessionList",
    sessionItem: "sessionItem",
    emptyState: "emptyState",
    connectBtn: "connectBtn",
    sessionAvatar: "sessionAvatar",
    sessionInfo: "sessionInfo",
    sessionName: "sessionName",
    sessionPreview: "sessionPreview",
    sessionUnread: "sessionUnread",
    chatView: "chatView",
    chatHeader: "chatHeader",
    chatBack: "chatBack",
    chatHeaderInfo: "chatHeaderInfo",
    chatHeaderName: "chatHeaderName",
    chatHeaderState: "chatHeaderState",
    chatHeaderReset: "chatHeaderReset",
    bubbles: "bubbles",
    bubbleRow: "bubbleRow",
    bubbleRowCliente: "bubbleRowCliente",
    bubbleRowAtendente: "bubbleRowAtendente",
    bubble: "bubble",
    bubbleCliente: "bubbleCliente",
    bubbleAtendente: "bubbleAtendente",
    bubbleBot: "bubbleBot",
    bubbleAutor: "bubbleAutor",
    bubbleHora: "bubbleHora",
    chatInputRow: "chatInputRow",
    chatInput: "chatInput",
    chatSend: "chatSend",
    overlay: "overlay",
  },
}));

import { whatsappService } from "../services/whatsapp.service";

const CONECTADO = { status: "connected", tenantId: "t1", phoneNumber: "18999999999" };
const DESCONECTADO = { status: "disconnected", tenantId: null };

const sessoesMock = [
  {
    id: "s1",
    client_name: "Maria Silva",
    client_phone: "11999998888",
    state: "MENU_PRINCIPAL",
    ultima_atividade: "2026-01-01T10:00:00Z",
    ultima_mensagem: "Oi, quero agendar",
  },
];

function renderWidget() {
  return render(
    <MemoryRouter>
      <ChatWidget />
    </MemoryRouter>
  );
}

describe("ChatWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    whatsappService.getStatus.mockResolvedValue(CONECTADO);
    whatsappService.getUnreadCount.mockResolvedValue({
      total: 2,
      sessoes: [{ session_id: "s1", nao_lidas: 2 }],
    });
    whatsappService.listSessions.mockResolvedValue({ data: sessoesMock, total: 1 });
  });

  it("nao mostra badge de nao lidas quando WhatsApp desconectado", async () => {
    whatsappService.getStatus.mockResolvedValue(DESCONECTADO);
    whatsappService.getUnreadCount.mockResolvedValue({ total: 5, sessoes: [] });

    renderWidget();

    await waitFor(() => expect(whatsappService.getStatus).toHaveBeenCalled());
    expect(screen.queryByText("5")).not.toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

  it("mostra badge de nao lidas quando conectado", async () => {
    renderWidget();

    await waitFor(() => expect(whatsappService.getUnreadCount).toHaveBeenCalled());
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("oferece CTA para conectar quando abre sem numero conectado", async () => {
    whatsappService.getStatus.mockResolvedValue(DESCONECTADO);

    renderWidget();
    fireEvent.click(screen.getByTitle("Conversas WhatsApp"));

    expect(await screen.findByText("Conectar WhatsApp")).toBeInTheDocument();
    expect(screen.queryByText(/Nenhuma conversa ativa/)).not.toBeInTheDocument();
    expect(whatsappService.listSessions).not.toHaveBeenCalled();
  });

  it("lista conversas apenas quando conectado", async () => {
    renderWidget();
    fireEvent.click(screen.getByTitle("Conversas WhatsApp"));

    expect(await screen.findByText("Maria Silva")).toBeInTheDocument();
    expect(whatsappService.listSessions).toHaveBeenCalled();
  });

  it("mostra estado vazio quando conectado mas sem conversas", async () => {
    whatsappService.listSessions.mockResolvedValue({ data: [], total: 0 });

    renderWidget();
    fireEvent.click(screen.getByTitle("Conversas WhatsApp"));

    expect(await screen.findByText(/Nenhuma conversa ativa/)).toBeInTheDocument();
  });
});