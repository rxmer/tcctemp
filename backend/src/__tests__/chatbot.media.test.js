import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabaseAdmin } from "../config/supabase.js";
import { salvarAudio, obterUrlAssinada, garantirBucket } from "../chatbot/chatbot.media.js";

function storageQuery(overrides = {}) {
  return {
    upload: vi.fn().mockResolvedValue({ data: { path: "tenant/sess/file.ogg" }, error: null }),
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.test/audio.ogg?token=abc" }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://public.test/audio.ogg" } }),
    remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    list: vi.fn().mockResolvedValue({ data: [], error: null }),
    ...overrides,
  };
}

describe("chatbot.media", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseAdmin.storage.from.mockReturnValue(storageQuery());
    supabaseAdmin.storage.getBucket.mockResolvedValue({ data: { name: "chatbot-audios" }, error: null });
    supabaseAdmin.storage.createBucket.mockResolvedValue({ data: { name: "chatbot-audios" }, error: null });
  });

  describe("salvarAudio", () => {
    it("salva buffer no bucket chatbot-audios com o contentType", async () => {
      const query = storageQuery();
      supabaseAdmin.storage.from.mockReturnValue(query);

      const caminho = await salvarAudio({
        tenantId: "tenant-1",
        sessionId: "sess-1",
        buffer: Buffer.from("audio"),
        mimetype: "audio/ogg; codecs=opus",
      });

      expect(supabaseAdmin.storage.from).toHaveBeenCalledWith("chatbot-audios");
      expect(query.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^tenant-1\/sess-1\/.*\.ogg$/),
        Buffer.from("audio"),
        expect.objectContaining({ contentType: "audio/ogg", upsert: false })
      );
      expect(caminho).toMatch(/^tenant-1\/sess-1\/.+\.ogg$/);
    });

    it("usa o mimetype completo quando não tem parâmetros", async () => {
      const query = storageQuery();
      supabaseAdmin.storage.from.mockReturnValue(query);

      await salvarAudio({ tenantId: "t", sessionId: "s", buffer: Buffer.from("x"), mimetype: "audio/webm" });

      expect(query.upload).toHaveBeenCalledWith(
        expect.stringMatching(/\.webm$/),
        Buffer.from("x"),
        expect.objectContaining({ contentType: "audio/webm" })
      );
    });

    it("cria o bucket quando não existir", async () => {
      supabaseAdmin.storage.getBucket.mockResolvedValue({ data: null, error: null });
      supabaseAdmin.storage.from.mockReturnValue(storageQuery());

      await salvarAudio({ tenantId: "t", sessionId: "s", buffer: Buffer.from("x"), mimetype: "audio/ogg" });

      expect(supabaseAdmin.storage.createBucket).toHaveBeenCalledWith(
        "chatbot-audios",
        expect.objectContaining({ public: false })
      );
    });

    it("lança erro para buffer vazio", async () => {
      await expect(
        salvarAudio({ tenantId: "t", sessionId: "s", buffer: Buffer.alloc(0), mimetype: "audio/ogg" })
      ).rejects.toThrow("Áudio vazio");
    });

    it("lança erro quando o upload falha", async () => {
      const query = storageQuery({
        upload: vi.fn().mockResolvedValue({ data: null, error: new Error("bucket offline") }),
      });
      supabaseAdmin.storage.from.mockReturnValue(query);

      await expect(
        salvarAudio({ tenantId: "t", sessionId: "s", buffer: Buffer.from("x"), mimetype: "audio/ogg" })
      ).rejects.toThrow("bucket offline");
    });
  });

  describe("obterUrlAssinada", () => {
    it("retorna a URL assinada", async () => {
      const url = await obterUrlAssinada("tenant/sess/file.ogg");
      expect(url).toBe("https://signed.test/audio.ogg?token=abc");
      expect(supabaseAdmin.storage.from).toHaveBeenCalledWith("chatbot-audios");
    });

    it("retorna null quando a url falha", async () => {
      const query = storageQuery({
        createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: new Error("missing") }),
      });
      supabaseAdmin.storage.from.mockReturnValue(query);

      const url = await obterUrlAssinada("tenant/sess/file.ogg");
      expect(url).toBeNull();
    });

    it("retorna null para caminho vazio", async () => {
      expect(await obterUrlAssinada(null)).toBeNull();
      expect(await obterUrlAssinada("")).toBeNull();
    });
  });

  describe("garantirBucket", () => {
    it("não cria novamente quando o bucket já existe", async () => {
      await garantirBucket();
      expect(supabaseAdmin.storage.createBucket).not.toHaveBeenCalled();
    });

    it("cria o bucket quando não existe", async () => {
      supabaseAdmin.storage.getBucket.mockResolvedValue({ data: null, error: null });
      await expect(garantirBucket()).resolves.toBe(true);
      expect(supabaseAdmin.storage.createBucket).toHaveBeenCalled();
    });
  });
});