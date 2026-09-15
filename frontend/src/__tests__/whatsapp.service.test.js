import { describe, it, expect, vi, beforeEach } from "vitest";
import { whatsappService } from "../services/whatsapp.service";

vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../services/api";

describe("whatsappService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getStatus chama apiFetch com timestamp", () => {
    whatsappService.getStatus();
    const url = apiFetch.mock.calls[0][0];
    expect(url).toMatch(/^\/api\/chatbot\/status\?_=\d+$/);
  });

  it("connect chama apiFetch com POST", () => {
    whatsappService.connect();
    expect(apiFetch).toHaveBeenCalledWith("/api/chatbot/connect", {
      method: "POST",
    });
  });

  it("disconnect chama apiFetch com POST", () => {
    whatsappService.disconnect();
    expect(apiFetch).toHaveBeenCalledWith("/api/chatbot/disconnect", {
      method: "POST",
    });
  });

  it("listSessions chama apiFetch com parametros de paginacao, ordenacao e filtros", () => {
    whatsappService.listSessions({ page: 2, limit: 10, ordem: "nome", estado: "atendente", busca: "João" });
    const url = apiFetch.mock.calls[0][0];
    expect(url).toMatch(/^\/api\/chatbot\/sessions\?_=\d+&page=2&limit=10&ordem=nome&estado=atendente&busca=Jo(%C3%A3|ã)o$/);
  });

  it("listSessions usa padroes quando sem argumentos", () => {
    whatsappService.listSessions();
    const url = apiFetch.mock.calls[0][0];
    expect(url).toMatch(/^\/api\/chatbot\/sessions\?_=\d+&page=1&limit=20&ordem=recentes$/);
    expect(url).not.toContain("estado=");
    expect(url).not.toContain("busca=");
    expect(url).not.toContain("naoLidas=");
  });

  it("listSessions inclui naoLidas quando solicitado", () => {
    whatsappService.listSessions({ naoLidas: true });
    const url = apiFetch.mock.calls[0][0];
    expect(url).toMatch(
      /^\/api\/chatbot\/sessions\?_=\d+&page=1&limit=20&ordem=recentes&naoLidas=true$/
    );
  });

  it("getSession chama apiFetch com id e timestamp", () => {
    whatsappService.getSession("abc-123");
    const url = apiFetch.mock.calls[0][0];
    expect(url).toMatch(/^\/api\/chatbot\/sessions\/abc-123\?_=\d+$/);
  });

  it("sendReply chama apiFetch com POST e mensagem", () => {
    whatsappService.sendReply("session-1", "Olá!");
    expect(apiFetch).toHaveBeenCalledWith("/api/chatbot/sessions/session-1/reply", {
      method: "POST",
      body: JSON.stringify({ mensagem: "Olá!" }),
    });
  });

  it("sendAudio envia FormData com o blob e timeout longo", () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/ogg" });
    whatsappService.sendAudio("session-1", blob);

    expect(apiFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = apiFetch.mock.calls[0];
    expect(url).toBe("/api/chatbot/sessions/session-1/reply-audio");
    expect(opts.method).toBe("POST");
    expect(opts.timeout).toBe(60000);
    expect(opts.body).toBeInstanceOf(FormData);
    const file = opts.body.get("audio");
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("audio.ogg");
    expect(file.type).toBe("audio/ogg");
    expect(file.size).toBe(blob.size);
  });

  it("getMensagens chama apiFetch com id e timestamp", () => {
    whatsappService.getMensagens("abc-123");
    const url = apiFetch.mock.calls[0][0];
    expect(url).toMatch(/^\/api\/chatbot\/sessions\/abc-123\/mensagens\?_=\d+$/);
  });

  it("resetSessao chama apiFetch com POST", () => {
    whatsappService.resetSessao("session-1");
    expect(apiFetch).toHaveBeenCalledWith("/api/chatbot/sessions/session-1/reset", {
      method: "POST",
    });
  });

  it("getStatus retorna o resultado de apiFetch", async () => {
    const mockData = { connected: true };
    apiFetch.mockResolvedValue(mockData);
    const result = await whatsappService.getStatus();
    expect(result).toEqual(mockData);
  });
});
