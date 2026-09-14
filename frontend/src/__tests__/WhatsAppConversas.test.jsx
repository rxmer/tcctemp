import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { WhatsAppConversas } from "../pages/whatsapp-conversas";

vi.mock("../services/whatsapp.service", () => ({
  whatsappService: {
    listSessions: vi.fn(),
    getStatus: vi.fn().mockResolvedValue({ status: "connected" }),
  },
}));

vi.mock("../hooks/useFeedback", () => ({ useFeedback: vi.fn() }));

vi.mock("../hooks/useDebouncedEffect", () => {
  const React = require("react");
  return {
    useDebouncedEffect: (effect, deps) => {
      const ref = React.useRef(effect);
      ref.current = effect;
      React.useEffect(() => {
        ref.current();
      }, deps);
    },
  };
});

vi.mock("../styles/pages/whatsapp.module.css", () => ({
  default: {
    card: "card",
    cardHeader: "cardHeader",
    emptyState: "emptyState",
    sessionsGrid: "sessionsGrid",
    sessionCard: "sessionCard",
    convCard: "convCard",
    sessionName: "sessionName",
    sessionPhone: "sessionPhone",
    sessionMeta: "sessionMeta",
    estadoBadge: "estadoBadge",
    sessionLastMsg: "sessionLastMsg",
    toolbar: "toolbar",
    toolbarSearch: "toolbarSearch",
    toolbarField: "toolbarField",
    toolbarSelect: "toolbarSelect",
  },
}));

import { whatsappService } from "../services/whatsapp.service";
import { useFeedback } from "../hooks/useFeedback";

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

function renderPage() {
  return render(
    <MemoryRouter>
      <WhatsAppConversas />
    </MemoryRouter>
  );
}

describe("WhatsAppConversas page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFeedback.mockReturnValue({ feedback: null, showFeedback: vi.fn() });
    whatsappService.listSessions.mockResolvedValue({ data: sessoesMock, total: 1 });
  });

  it("renderiza titulo e lista as conversas", async () => {
    renderPage();
    expect(screen.getByText("Conversas WhatsApp")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    });
    expect(screen.getByText("1 conversa(s) encontrada(s)")).toBeInTheDocument();
    expect(whatsappService.listSessions).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, ordem: "recentes", estado: "", busca: "" })
    );
  });

  it("exibe estado vazio quando nao ha conversas", async () => {
    whatsappService.listSessions.mockResolvedValue({ data: [], total: 0 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Nenhuma conversa ainda/)).toBeInTheDocument();
    });
  });

  it("pagina a lista quando ha mais itens que o limite", async () => {
    whatsappService.listSessions.mockResolvedValue({ data: [], total: 45 });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Próxima"));

    await waitFor(() => {
      expect(whatsappService.listSessions).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
  });

  it("ordena por nome A-Z ao trocar a ordenacao", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText("Ordenar conversas")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Ordenar conversas"), { target: { value: "nome" } });

    await waitFor(() => {
      expect(whatsappService.listSessions).toHaveBeenCalledWith(
        expect.objectContaining({ ordem: "nome", page: 1 })
      );
    });
  });

  it("filtra por estado ao escolher uma situacao", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText("Filtrar por situação")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Filtrar por situação"), {
      target: { value: "atendente" },
    });

    await waitFor(() => {
      expect(whatsappService.listSessions).toHaveBeenCalledWith(
        expect.objectContaining({ estado: "atendente", page: 1 })
      );
    });
  });

  it("busca por nome e volta para a primeira pagina", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Buscar conversas"), {
      target: { value: "Maria" },
    });

    await waitFor(() => {
      expect(whatsappService.listSessions).toHaveBeenCalledWith(
        expect.objectContaining({ busca: "Maria", page: 1 })
      );
    });
  });

  it("mostra estado de desconectado com botao Conectar WhatsApp", async () => {
    whatsappService.getStatus.mockResolvedValue({ status: "disconnected" });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/WhatsApp não conectado/)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /conectar whatsapp/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Buscar conversas")).not.toBeInTheDocument();
    expect(whatsappService.listSessions).not.toHaveBeenCalled();
  });

  it("navega para /whatsapp ao clicar em Conectar WhatsApp", async () => {
    whatsappService.getStatus.mockResolvedValue({ status: "disconnected" });
    render(
      <MemoryRouter initialEntries={["/whatsapp/conversas"]}>
        <Routes>
          <Route path="/whatsapp/conversas" element={<WhatsAppConversas />} />
          <Route path="/whatsapp" element={<div>PAGINA WHATSAPP</div>} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /conectar whatsapp/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /conectar whatsapp/i }));
    await waitFor(() => {
      expect(screen.getByText("PAGINA WHATSAPP")).toBeInTheDocument();
    });
  });
});