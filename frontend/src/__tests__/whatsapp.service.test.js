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

  it("listSessions chama apiFetch com timestamp", () => {
    whatsappService.listSessions();
    const url = apiFetch.mock.calls[0][0];
    expect(url).toMatch(/^\/api\/chatbot\/sessions\?_=\d+$/);
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

  it("getStatus retorna o resultado de apiFetch", async () => {
    const mockData = { connected: true };
    apiFetch.mockResolvedValue(mockData);
    const result = await whatsappService.getStatus();
    expect(result).toEqual(mockData);
  });
});
