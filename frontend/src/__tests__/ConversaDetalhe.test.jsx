import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ConversaDetalhe } from "../pages/whatsapp-conversa-detalhe";

vi.mock("../services/whatsapp.service", () => ({
  whatsappService: {
    getSession: vi.fn(),
    getMensagens: vi.fn(),
    sendReply: vi.fn(),
    resetSessao: vi.fn(),
  },
}));
vi.mock("../hooks/useFeedback", () => ({ useFeedback: vi.fn() }));
vi.mock("../hooks/useConfirm", () => ({ useConfirm: vi.fn() }));
vi.mock("../styles/pages/whatsapp.module.css", () => ({
  default: new Proxy({}, { get: (_, prop) => String(prop) }),
}));

import { whatsappService } from "../services/whatsapp.service";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";

const SESSION_ID = "sess-1";
const MENSAGENS = [
  { id: "m1", remetente: "cliente", texto: "Quero agendar", criado_em: "2026-01-10T10:00:00Z" },
  { id: "m2", remetente: "bot", texto: "Escolha uma opção:", criado_em: "2026-01-10T10:00:05Z" },
  { id: "m3", remetente: "atendente", texto: "Olá! Já vou te atender.", criado_em: "2026-01-10T10:01:00Z" },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/whatsapp/conversas/${SESSION_ID}`]}>
      <Routes>
        <Route path="/whatsapp/conversas/:id" element={<ConversaDetalhe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ConversaDetalhe page", () => {
  const mockShowFeedback = vi.fn();
  const mockConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useFeedback.mockReturnValue({ feedback: null, showFeedback: mockShowFeedback });
    useConfirm.mockReturnValue({ confirm: mockConfirm, ConfirmModal: () => null });
    whatsappService.getSession.mockResolvedValue({
      id: SESSION_ID,
      client_name: "João",
      client_phone: "5511999999999",
      state: "MENU_PRINCIPAL",
    });
    whatsappService.getMensagens.mockResolvedValue(MENSAGENS);
  });

  it("renderiza nome do cliente e estado do bot", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText("João").length).toBeGreaterThan(0);
      expect(screen.getByText(/menu principal/i)).toBeInTheDocument();
    });
  });

  it("exibe mensagens da conversa por remetente", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Quero agendar")).toBeInTheDocument();
    });
    expect(screen.getByText(/vou te atender/i)).toBeInTheDocument();
    expect(screen.getByText("Atendente")).toBeInTheDocument();
    expect(screen.getAllByText("Bot").length).toBeGreaterThan(0);
  });

  it("envia resposta como atendente", async () => {
    whatsappService.sendReply.mockResolvedValue({ message: "Mensagem enviada" });
    renderPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/responder como atendente/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/responder como atendente/i), {
      target: { value: "Texto do atendente" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() => {
      expect(whatsappService.sendReply).toHaveBeenCalledWith(SESSION_ID, "Texto do atendente");
    });
  });

  it("nao envia mensagem vazia", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /enviar/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));
    expect(whatsappService.sendReply).not.toHaveBeenCalled();
  });

  it("reinicia bot apos confirmacao", async () => {
    mockConfirm.mockResolvedValue(true);
    whatsappService.resetSessao.mockResolvedValue({ message: "Sessão reiniciada" });
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /reiniciar bot/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /reiniciar bot/i }));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
      expect(whatsappService.resetSessao).toHaveBeenCalledWith(SESSION_ID);
    });
  });

  it("nao reinicia se usuario cancelar", async () => {
    mockConfirm.mockResolvedValue(false);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /reiniciar bot/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /reiniciar bot/i }));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
    });
    expect(whatsappService.resetSessao).not.toHaveBeenCalled();
  });
});
