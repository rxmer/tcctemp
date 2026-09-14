import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsApp } from "../pages/whatsapp";

vi.mock("../services/whatsapp.service", () => ({
  whatsappService: { getStatus: vi.fn(), connect: vi.fn(), disconnect: vi.fn().mockResolvedValue({}) },
}));
vi.mock("../hooks/useFeedback", () => ({ useFeedback: vi.fn() }));
vi.mock("../hooks/useConfirm", () => ({ useConfirm: vi.fn() }));
vi.mock("../styles/pages/whatsapp.module.css", () => ({
  default: {
    waGrid: "waGrid", statusCard: "statusCard", statusLabel: "statusLabel",
    disconnected: "disconnected", connected: "connected", awaitingQr: "awaitingQr",
    reconnecting: "reconnecting", actions: "actions", qrCard: "qrCard",
    tenantChip: "tenantChip", tenantDot: "tenantDot", qrExpired: "qrExpired",
    qrExpiredAction: "qrExpiredAction", qrExpiredText: "qrExpiredText", qrExpiredIcon: "qrExpiredIcon",
  },
}));

import { whatsappService } from "../services/whatsapp.service";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";

function renderPage() {
  return render(<WhatsApp />);
}

describe("WhatsApp page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFeedback.mockReturnValue({ feedback: null, showFeedback: vi.fn() });
    useConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(true), ConfirmModal: () => null });
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
      expect(screen.getByText("(11) 98888-7777")).toBeInTheDocument();
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

  it("exibe QR expirado com texto de recarregar e recarregar chama connect", async () => {
    whatsappService.getStatus.mockResolvedValue({ status: "qr_expired" });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Selecione para recarregar o QRCode")).toBeInTheDocument();
    });
    const btn = screen.getByRole("button", { name: /Selecione para recarregar o QRCode/i });
    fireEvent.click(btn);
    await waitFor(() => { expect(whatsappService.connect).toHaveBeenCalled(); });
  });

  it("mostra erro ao carregar status", async () => {
    const showFeedback = vi.fn();
    useFeedback.mockReturnValue({ feedback: null, showFeedback });
    whatsappService.getStatus.mockRejectedValue(new Error("Erro"));
    renderPage();
    await waitFor(() => { expect(showFeedback).toHaveBeenCalled(); });
  });

  it("exibe botao de desconectar, confirma e chama disconnect", async () => {
    whatsappService.getStatus.mockResolvedValue({ status: "connected" });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Desconectar" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Desconectar" }));
    await waitFor(() => { expect(whatsappService.disconnect).toHaveBeenCalled(); });
  });

  it("cancela dialogo de desconectar e nao desconecta", async () => {
    const confirm = vi.fn().mockResolvedValue(false);
    useConfirm.mockReturnValue({ confirm, ConfirmModal: () => null });
    whatsappService.getStatus.mockResolvedValue({ status: "connected" });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Desconectar" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Desconectar" }));
    await waitFor(() => { expect(confirm).toHaveBeenCalled(); });
    expect(whatsappService.disconnect).not.toHaveBeenCalled();
  });
});
