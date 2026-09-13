import { describe, it, expect, vi, beforeEach } from "vitest";
import * as sessionService from "../chatbot/chatbot.session.js";
import { supabaseAdmin } from "../config/supabase.js";
import { sendWhatsAppMessage } from "../chatbot/baileys.client.js";

vi.mock("../chatbot/baileys.client.js", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(true),
  getConnectionState: vi.fn().mockReturnValue({ tenantId: "tenant-1", status: "connected" }),
}));

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
    gt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
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
    function mockListar({ count, data }) {
      const countQuery = mockQuery({
        then: (resolve) => resolve({ data: null, count, error: null }),
      });
      const dataQuery = mockQuery({
        then: (resolve) => resolve({ data, error: null }),
      });
      supabaseAdmin.from.mockReturnValueOnce(countQuery).mockReturnValueOnce(dataQuery);
      return { countQuery, dataQuery };
    }

    it("deve listar sessoes do tenant com total", async () => {
      const expected = [{ id: SESSION_ID }];
      const { dataQuery } = mockListar({ count: 3, data: expected });

      const result = await sessionService.listarSessoes(TENANT_ID);

      expect(result).toEqual({ data: expected, total: 3 });
      expect(dataQuery.order).toHaveBeenCalledWith("ultima_atividade", { ascending: false });
      expect(dataQuery.range).toHaveBeenCalledWith(0, 19);
    });

    it("deve ordenar por nome quando ordem=nome e paginar", async () => {
      const { countQuery, dataQuery } = mockListar({ count: 55, data: [] });

      await sessionService.listarSessoes(TENANT_ID, { page: 2, limit: 10, ordem: "nome" });

      expect(countQuery.eq).toHaveBeenCalledWith("tenant_id", TENANT_ID);
      expect(dataQuery.order).toHaveBeenCalledWith("client_name", { ascending: true, nullsFirst: true });
      expect(dataQuery.range).toHaveBeenCalledWith(10, 19);
    });

    it("deve aplicar filtro por grupo de estado e busca", async () => {
      const { countQuery, dataQuery } = mockListar({ count: 1, data: [] });

      await sessionService.listarSessoes(TENANT_ID, { estado: "atendente", busca: "João" });

      expect(countQuery.eq).toHaveBeenCalledWith("tenant_id", TENANT_ID);
      expect(countQuery.eq).toHaveBeenCalledWith("state", "FALANDO_COM_ATENDENTE");
      expect(dataQuery.eq).toHaveBeenCalledWith("state", "FALANDO_COM_ATENDENTE");
      expect(dataQuery.or).toHaveBeenCalledWith(expect.stringContaining("client_name.ilike.%João%"));
      expect(dataQuery.or).toHaveBeenCalledWith(expect.stringContaining("client_phone.ilike.%João%"));
    });

    it("deve lancar erro na falha", async () => {
      const countQuery = mockQuery({
        then: (resolve) => resolve({ data: null, count: null, error: null }),
      });
      const dataQuery = mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("List error") }),
      });
      supabaseAdmin.from.mockReturnValueOnce(countQuery).mockReturnValueOnce(dataQuery);

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

  describe("contarNaoLidas", () => {
    it("deve usar a RPC contar_nao_lidas", async () => {
      supabaseAdmin.rpc.mockResolvedValue({
        data: [{ session_id: SESSION_ID, nao_lidas: 3 }],
        error: null,
      });

      const result = await sessionService.contarNaoLidas(TENANT_ID);

      expect(supabaseAdmin.rpc).toHaveBeenCalledWith("contar_nao_lidas", {
        p_tenant: TENANT_ID,
      });
      expect(result).toEqual({
        total: 3,
        sessoes: [{ session_id: SESSION_ID, nao_lidas: 3 }],
      });
    });

    it("deve usar fallback caso a RPC nao esteja disponivel", async () => {
      supabaseAdmin.rpc.mockRejectedValue(new Error("function not found"));

      const querySessoes = mockQuery({
        then: (resolve) => resolve({ data: [{ id: SESSION_ID }], error: null }),
      });
      const queryUltimaMsg = mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: { criado_em: "2026-09-01T10:00:00Z" }, error: null }),
      });
      const queryCount = mockQuery({
        then: (resolve) => resolve({ count: 2, error: null }),
      });

      supabaseAdmin.from
        .mockReturnValueOnce(querySessoes)
        .mockReturnValueOnce(queryUltimaMsg)
        .mockReturnValueOnce(queryCount);

      const result = await sessionService.contarNaoLidas(TENANT_ID);

      expect(result).toEqual({
        total: 2,
        sessoes: [{ session_id: SESSION_ID, nao_lidas: 2 }],
      });
    });
  });

  describe("limparSessoesExpiradas", () => {
    it("deve reiniciar apenas sessoes em fluxo, ignorando MENU_PRINCIPAL e FALANDO_COM_ATENDENTE", async () => {
      const emFluxo = [
        { id: "sess-1", state: "ESCOLHENDO_SERVICO" },
        { id: "sess-2", state: "ESCOLHENDO_DATA" },
      ];

      const selectQuery = mockQuery({
        then: (resolve) => resolve({ data: emFluxo, error: null }),
      });

      const selectAtendente = mockQuery({
        then: (resolve) => resolve({ data: [], error: null }),
      });

      const updateQuery = mockQuery();

      supabaseAdmin.from
        .mockReturnValueOnce(selectQuery)
        .mockReturnValueOnce(updateQuery)
        .mockReturnValueOnce(updateQuery)
        .mockReturnValueOnce(selectAtendente);

      await sessionService.limparSessoesExpiradas();

      expect(selectQuery.not).toHaveBeenCalledWith("state", "in", ["MENU_PRINCIPAL", "FALANDO_COM_ATENDENTE"]);
      expect(updateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ state: "MENU_PRINCIPAL", state_data: {} })
      );
    });

    it("usa timeout de 10 min para FALANDO_COM_ATENDENTE", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: [], error: null }),
      }));

      await sessionService.limparSessoesExpiradas();

      const atendenteQuery = supabaseAdmin.from.mock.results[0]?.value;
      const limiteAtendente = String(atendenteQuery?.lt.mock.calls.at(-1)?.[1] ?? "");
      const diffMin = (Date.now() - new Date(limiteAtendente).getTime()) / 60_000;

      expect(diffMin).toBeGreaterThan(9);
      expect(diffMin).toBeLessThan(11);
    });

    it("nao deve derrubar sessao FALANDO_COM_ATENDENTE quando o atendente ja respondeu", async () => {
      const expiradas = [];

      const selectExpiradas = mockQuery({
        then: (resolve) => resolve({ data: expiradas, error: null }),
      });

      const selectAtendente = mockQuery({
        then: (resolve) =>
          resolve({ data: [{ id: "sess-atend", remote_jid: REMOTE_JID }], error: null }),
      });

      const selectMensagem = mockQuery({
        then: (resolve) => resolve({ data: [{ id: "msg-1", remetente: "atendente" }], error: null }),
      });

      supabaseAdmin.from
        .mockReturnValueOnce(selectExpiradas)
        .mockReturnValueOnce(selectAtendente)
        .mockReturnValueOnce(selectMensagem);


      await sessionService.limparSessoesExpiradas();

      expect(selectMensagem.eq).toHaveBeenCalledWith("remetente", "atendente");
      expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    });

    it("deve derrubar sessao FALANDO_COM_ATENDENTE quando o atendente nao respondeu", async () => {
      const expiradas = [];

      const selectExpiradas = mockQuery({
        then: (resolve) => resolve({ data: expiradas, error: null }),
      });

      const selectAtendente = mockQuery({
        then: (resolve) =>
          resolve({ data: [{ id: "sess-atend", remote_jid: REMOTE_JID }], error: null }),
      });

      const selectMensagem = mockQuery({
        then: (resolve) => resolve({ data: [], error: null }),
      });

      const updateQuery = mockQuery();

      supabaseAdmin.from
        .mockReturnValueOnce(selectExpiradas)
        .mockReturnValueOnce(selectAtendente)
        .mockReturnValueOnce(selectMensagem)
        .mockReturnValueOnce(updateQuery);


      await sessionService.limparSessoesExpiradas();

      expect(updateQuery.update).toHaveBeenCalled();
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("atendente está demorando"),
        "bot",
        "tenant-1"
      );
    });

    it("deve retornar sem fazer nada se nao houver expiradas", async () => {
      const emptyQuery = mockQuery({
        then: (resolve) => resolve({ data: [], error: null }),
      });

      supabaseAdmin.from.mockReturnValue(emptyQuery);

      await sessionService.limparSessoesExpiradas();
      expect(supabaseAdmin.from).toHaveBeenCalledTimes(2);
    });

    it("deve ignorar erro na query e logar warning", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        then: (resolve) => resolve({ data: null, error: new Error("Query error") }),
      }));

      await sessionService.limparSessoesExpiradas();
    });
  });
});
