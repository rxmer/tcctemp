import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { WhatsAppConversas } from "../pages/whatsapp-conversas";

vi.mock("../services/whatsapp.service", () => ({
  whatsappService: {
    listSessions: vi.fn(),
    getStatus: vi.fn().mockResolvedValue({ status: "connected" }),
    getSession: vi.fn(),
    getMensagens: vi.fn(),
    sendReply: vi.fn(),
    sendAudio: vi.fn(),
    resetSessao: vi.fn(),
  },
}));

vi.mock("../hooks/useFeedback", () => ({ useFeedback: vi.fn() }));

vi.mock("../hooks/useConfirm", () => ({ useConfirm: vi.fn() }));

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

vi.mock("../styles/pages/whatsapp.module.css", () => {
  const keys = [
    "card",
    "cardHeader",
    "emptyState",
    "toolbar",
    "toolbarSearch",
    "toolbarField",
    "toolbarSelect",
    "convLayout",
    "convList",
    "convListCheia",
    "convListMobileOculta",
    "convPainel",
    "convTabs",
    "convTab",
    "convTabAtivo",
    "convRows",
    "convRow",
    "convRowAtiva",
    "convRowNaoLida",
    "convAvatar",
    "convRowCorpo",
    "convRowTop",
    "convRowNome",
    "convRowTempo",
    "convBadgeNao",
    "convRowFundo",
    "convRowMsg",
    "estadoBadge",
    "estadoBadgeAtendente",
    "estadoBadgeMenu",
    "estadoBadgeAgendando",
  ];
  return { default: Object.fromEntries(keys.map((k) => [k, k])) };
});

import { whatsappService } from "../services/whatsapp.service";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";

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
    useConfirm.mockReturnValue({ confirm: vi.fn(), ConfirmModal: () => null });
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

  it("exibe badge e destaque quando ha mensagens nao lidas", async () => {
    whatsappService.listSessions.mockResolvedValue({
      data: [
        {
          ...sessoesMock[0],
          nao_lidas: 4,
          ultima_mensagem_remetente: "cliente",
          ultima_mensagem_previa: "Oi, quero agendar",
        },
      ],
      total: 1,
      naoLidasTotal: 4,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    });
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Não lidas (4)")).toBeInTheDocument();
  });

  it("mostra o remetente na previa da ultima mensagem", async () => {
    whatsappService.listSessions.mockResolvedValue({
      data: [
        {
          ...sessoesMock[0],
          ultima_mensagem_remetente: "atendente",
          ultima_mensagem_previa: "Obrigado pelo agendamento!",
        },
      ],
      total: 1,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Você: Obrigado pelo agendamento!/)).toBeInTheDocument();
    });
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

  it("filtra por abas ao trocar a situacao", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Com atendente" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Com atendente" }));

    await waitFor(() => {
      expect(whatsappService.listSessions).toHaveBeenCalledWith(
        expect.objectContaining({ estado: "atendente", page: 1 })
      );
    });
  });

  it("filtra apenas nao lidas ao trocar para a aba correspondente", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Não lidas" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Não lidas" }));

    await waitFor(() => {
      expect(whatsappService.listSessions).toHaveBeenCalledWith(
        expect.objectContaining({ naoLidas: true, page: 1 })
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

  it("abre a conversa no painel ao clicar na linha", async () => {
    whatsappService.getSession.mockResolvedValue({ ...sessoesMock[0] });
    whatsappService.getMensagens.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Maria Silva/i }));

    await waitFor(() => {
      expect(whatsappService.getSession).toHaveBeenCalledWith("s1");
      expect(screen.getByRole("button", { name: /voltar para a lista/i })).toBeInTheDocument();
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