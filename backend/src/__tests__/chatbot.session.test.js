import { describe, it, expect, vi, beforeEach } from "vitest";
import * as sessionService from "../chatbot/chatbot.session.js";
import { supabaseAdmin } from "../config/supabase.js";

const TENANT_ID = "tenant-1";
const REMOTE_JID = "5511999999999@s.whatsapp.net";
const SESSION_ID = "uuid-session-1";

function mockQuery(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
    ...overrides,
  };
}

describe("chatbot.session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("criarSessao", () => {
    it("deve criar nova sessao quando nao existe ativa", async () => {
      const expected = { id: SESSION_ID, state: "MENU_PRINCIPAL", state_data: {} };
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await sessionService.criarSessao({
        tenantId: TENANT_ID,
        remoteJid: REMOTE_JID,
        clientPhone: "5511999999999",
        clientName: "João",
      });

      expect(result).toEqual(expected);
    });

    it("deve desativar sessao anterior antes de criar nova", async () => {
      const oldSession = { id: "old-session" };
      const newSession = { id: SESSION_ID };

      const query1 = mockQuery({ maybeSingle: vi.fn().mockResolvedValue({ data: oldSession, error: null }) });
      const query2 = mockQuery({ single: vi.fn().mockResolvedValue({ data: oldSession, error: null }) });
      const query3 = mockQuery({ single: vi.fn().mockResolvedValue({ data: newSession, error: null }) });

      supabaseAdmin.from
        .mockReturnValueOnce(query1)
        .mockReturnValueOnce(query2)
        .mockReturnValueOnce(query3);

      const result = await sessionService.criarSessao({
        tenantId: TENANT_ID,
        remoteJid: REMOTE_JID,
        clientPhone: "5511999999999",
        clientName: "João",
      });

      expect(result).toEqual(newSession);
      expect(query2.update).toHaveBeenCalledWith({ ativo: false });
    });

    it("deve lancar erro se insert falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
      }));

      await expect(
        sessionService.criarSessao({
          tenantId: TENANT_ID,
          remoteJid: REMOTE_JID,
          clientPhone: "5511999999999",
          clientName: "João",
        })
      ).rejects.toThrow("Erro ao criar sessão");
    });
  });

  describe("buscarSessao", () => {
    it("deve retornar sessao ativa", async () => {
      const expected = { id: SESSION_ID, state: "MENU_PRINCIPAL", ativo: true };
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await sessionService.buscarSessao(TENANT_ID, REMOTE_JID);
      expect(result).toEqual(expected);
    });

    it("deve retornar null quando nao existe", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }));

      const result = await sessionService.buscarSessao(TENANT_ID, REMOTE_JID);
      expect(result).toBeNull();
    });

    it("deve lancar erro na falha", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error("Query error") }),
      }));

      await expect(
        sessionService.buscarSessao(TENANT_ID, REMOTE_JID)
      ).rejects.toThrow("Erro ao buscar sessão");
    });
  });

  describe("atualizarSessao", () => {
    it("deve atualizar e definir ultima_atividade", async () => {
      const expected = { id: SESSION_ID, state: "MENU_PRINCIPAL" };
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await sessionService.atualizarSessao(SESSION_ID, { state: "MENU_PRINCIPAL" });
      expect(result).toEqual(expected);
    });

    it("deve lancar erro na falha", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("Update error") }),
      }));

      await expect(
        sessionService.atualizarSessao(SESSION_ID, { state: "MENU_PRINCIPAL" })
      ).rejects.toThrow("Erro ao atualizar sessão");
    });
  });

  describe("listarSessoes", () => {
    it("deve listar sessoes do tenant", async () => {
      const expected = [{ id: SESSION_ID }];
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: expected, error: null }),
      }));

      const result = await sessionService.listarSessoes(TENANT_ID);
      expect(result).toEqual(expected);
    });

    it("deve lancar erro na falha", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("List error") }),
      }));

      await expect(
        sessionService.listarSessoes(TENANT_ID)
      ).rejects.toThrow("Erro ao listar sessões");
    });
  });

  describe("desativarSessao", () => {
    it("deve marcar sessao como inativa", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: null }),
      }));

      await sessionService.desativarSessao(SESSION_ID);
      expect(supabaseAdmin.from).toHaveBeenCalledWith("chatbot_session");
    });

    it("deve lancar erro na falha", async () => {
      const updateMock = vi.fn().mockReturnThis();
      supabaseAdmin.from.mockReturnValue(mockQuery({
        eq: updateMock,
      }));
      updateMock.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("Update error") }),
      }));

      await expect(
        sessionService.desativarSessao(SESSION_ID)
      ).rejects.toThrow("Erro ao desativar sessão");
    });
  });

  describe("registrarMensagem", () => {
    it("deve inserir mensagem na tabela chatbot_mensagem", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: null }),
      }));

      await sessionService.registrarMensagem({
        tenantId: TENANT_ID,
        sessionId: SESSION_ID,
        remetente: "cliente",
        texto: "Olá",
      });

      expect(supabaseAdmin.from).toHaveBeenCalledWith("chatbot_mensagem");
    });

    it("nao deve lancar erro se insert falhar", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("Insert error") }),
      }));

      await expect(
        sessionService.registrarMensagem({
          tenantId: TENANT_ID,
          sessionId: SESSION_ID,
          remetente: "bot",
          texto: "Oi",
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("registrarMensagemPorJid", () => {
    it("deve registrar mensagem da sessao encontrada", async () => {
      const sessao = { id: SESSION_ID, tenant_id: TENANT_ID };

      const query1 = mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: sessao, error: null }),
      });
      const query2 = mockQuery({
        then: (resolve) => resolve({ data: null, error: null }),
      });

      supabaseAdmin.from
        .mockReturnValueOnce(query1)
        .mockReturnValueOnce(query2);

      await sessionService.registrarMensagemPorJid(REMOTE_JID, "Texto", "atendente");

      expect(query2.insert).toHaveBeenCalledWith({
        tenant_id: TENANT_ID,
        session_id: SESSION_ID,
        remetente: "atendente",
        texto: "Texto",
      });
    });

    it("deve ignorar quando nao ha sessao para o jid", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }));

      await sessionService.registrarMensagemPorJid(REMOTE_JID, "Texto");

      expect(supabaseAdmin.from).toHaveBeenCalledTimes(1);
    });
  });

  describe("listarMensagens", () => {
    it("deve listar mensagens da sessao ordenadas", async () => {
      const expected = [{ id: "m1", remetente: "cliente", texto: "Olá" }];
      const orderMock = vi.fn().mockReturnThis();
      supabaseAdmin.from.mockReturnValue(mockQuery({
        order: orderMock,
        limit: vi.fn().mockResolvedValue({ data: expected, error: null }),
      }));

      const result = await sessionService.listarMensagens(TENANT_ID, SESSION_ID);
      expect(result).toEqual(expected);
      expect(orderMock).toHaveBeenCalledWith("criado_em", { ascending: true });
    });

    it("deve lancar erro na falha", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        limit: vi.fn().mockResolvedValue({ data: null, error: new Error("List error") }),
      }));

      await expect(
        sessionService.listarMensagens(TENANT_ID, SESSION_ID)
      ).rejects.toThrow("Erro ao listar mensagens");
    });
  });

  describe("limparSessoesExpiradas", () => {
    it("deve reiniciar sessoes expiradas", async () => {
      const expiradas = [
        { id: "sess-1", state: "ESCOLHENDO_SERVICO" },
        { id: "sess-2", state: "ESCOLHENDO_DATA" },
      ];

      const selectQuery = mockQuery({
        then: (resolve) => resolve({ data: expiradas, error: null }),
      });

      supabaseAdmin.from
        .mockReturnValueOnce(selectQuery)
        .mockReturnValueOnce(mockQuery())
        .mockReturnValueOnce(mockQuery());

      await sessionService.limparSessoesExpiradas();

      expect(selectQuery.neq).toHaveBeenCalledWith("state", "FALANDO_COM_ATENDENTE");
    });

    it("deve retornar sem fazer nada se nao houver expiradas", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: [], error: null }),
      }));

      await sessionService.limparSessoesExpiradas();
      expect(supabaseAdmin.from).toHaveBeenCalledTimes(1);
    });

    it("deve ignorar erro na query e logar warning", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("Query error") }),
      }));

      await sessionService.limparSessoesExpiradas();
    });
  });
});
