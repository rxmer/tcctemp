import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsApp } from "../pages/whatsapp";

vi.mock("../services/whatsapp.service", () => ({
  whatsappService: { getStatus: vi.fn(), connect: vi.fn(), disconnect: vi.fn() },
}));
vi.mock("../hooks/useFeedback", () => ({ useFeedback: vi.fn() }));
vi.mock("../styles/pages/whatsapp.module.css", () => ({
  default: {
    waGrid: "waGrid", statusCard: "statusCard", statusLabel: "statusLabel",
    disconnected: "disconnected", connected: "connected", awaitingQr: "awaitingQr",
    reconnecting: "reconnecting", actions: "actions", qrCard: "qrCard",
    tenantChip: "tenantChip", tenantDot: "tenantDot",
  },
}));

import { whatsappService } from "../services/whatsapp.service";
import { useFeedback } from "../hooks/useFeedback";

function renderPage() {
  return render(<WhatsApp />);
}

describe("WhatsApp page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFeedback.mockReturnValue({ feedback: null, showFeedback: vi.fn() });
    whatsappService.getStatus.mockResolvedValue({ status: "disconnected" });
  });

  it("renderiza titulo", async () => {
    renderPage();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
  });

  it("carrega status ao montar", async () => {
    renderPage();
    await waitFor(() => { expect(whatsappService.getStatus).toHaveBeenCalled(); });
  });

  it("exibe status desconectado", async () => {
    renderPage();
    await waitFor(() => { expect(screen.getByText("Desconectado")).toBeInTheDocument(); });
  });

  it("exibe status conectado", async () => {
    whatsappService.getStatus.mockResolvedValue({ status: "connected" });
    renderPage();
    await waitFor(() => {
      const labels = screen.getAllByText("Conectado");
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  it("exibe o numero formatado quando conectado", async () => {
    whatsappService.getStatus.mockResolvedValue({ status: "connected", phoneNumber: "5511988887777" });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("+55 (11) 98888-7777")).toBeInTheDocument();
    });
  });

  it("nao exibe numero quando desconectado", async () => {
    whatsappService.getStatus.mockResolvedValue({ status: "disconnected", phoneNumber: null });
    renderPage();
    await waitFor(() => { expect(screen.getByText("Desconectado")).toBeInTheDocument(); });
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument();
  });

  it("exibe status aguardando QR", async () => {
    whatsappService.getStatus.mockResolvedValue({ status: "awaiting_qr", qr: "data:image/png;base64,abc" });
    renderPage();
    await waitFor(() => { expect(screen.getByText("Aguardando QR Code")).toBeInTheDocument(); });
  });

  it("mostra erro ao carregar status", async () => {
    const showFeedback = vi.fn();
    useFeedback.mockReturnValue({ feedback: null, showFeedback });
    whatsappService.getStatus.mockRejectedValue(new Error("Erro"));
    renderPage();
    await waitFor(() => { expect(showFeedback).toHaveBeenCalled(); });
  });
});
