import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  criarComunicado,
  processarDisparo,
} from "../services/comunicados.service.js";
import { supabaseAdmin } from "../config/supabase.js";
import { getConnectionState, sendWhatsAppMessage } from "../chatbot/baileys.client.js";
import { criarNotificacao } from "../services/notificacoes.service.js";

vi.mock("../chatbot/baileys.client.js", () => ({
  getConnectionState: vi.fn(),
  sendWhatsAppMessage: vi.fn(),
}));

vi.mock("../services/notificacoes.service.js", () => ({
  criarNotificacao: vi.fn().mockResolvedValue({}),
}));

function q(result = { data: [], error: null }) {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    not: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve) => resolve(result),
  };
  return chain;
}

const CONECTADO = { status: "connected", tenantId: "t1" };

describe("comunicadosService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConnectionState.mockReturnValue(CONECTADO);
    sendWhatsAppMessage.mockResolvedValue();
  });

  it("recusa quando WhatsApp nao esta conectado", async () => {
    getConnectionState.mockReturnValue({ status: "disconnected", tenantId: null });
    await expect(
      criarComunicado({ tenantId: "t1", nomeEmpresa: "X", mensagem: "Fecharemos dia 25", filtro: "todos" })
    ).rejects.toThrow("Conecte o WhatsApp");
  });

  it("recusa quando ja existe disparo em andamento", async () => {
    supabaseAdmin.from.mockImplementation((table) =>
      table === "comunicados"
        ? q({ data: { comunicado_id: 9 }, error: null })
        : q()
    );
    await expect(
      criarComunicado({ tenantId: "t1", nomeEmpresa: "X", mensagem: "Fecharemos dia 25", filtro: "todos" })
    ).rejects.toThrow("existe um comunicado");
  });

  it("recusa quando nao ha destinatarios", async () => {
    supabaseAdmin.from.mockImplementation((table) =>
      table === "comunicados" ? q({ data: null, error: null }) : q({ data: [], error: null })
    );
    await expect(
      criarComunicado({ tenantId: "t1", nomeEmpresa: "X", mensagem: "Fecharemos dia 25", filtro: "todos" })
    ).rejects.toThrow("Nenhum destinatário");
  });

  it("cria disparo e monta JID com codigo do pais", async () => {
    const comunicado = { comunicado_id: 5, mensagem: "Fecharemos", total_destinatarios: 1 };
    const inserts = [];
    supabaseAdmin.from.mockImplementation((table, ) => {
      if (table === "clientes") {
        return q({
          data: [{ cliente_id: 1, nome: "Ana", telefone: "11987654321" }],
          error: null,
        });
      }
      if (table === "comunicados") {
        const c = q({ data: comunicado, error: null });
        c.maybeSingle.mockResolvedValue({ data: null, error: null });
        return c;
      }
      const chain = q({ data: [], error: null });
      chain.insert.mockImplementation((rows) => {
        inserts.push(rows);
        return chain;
      });
      return chain;
    });

    const result = await criarComunicado({
      tenantId: "t1",
      nomeEmpresa: "Esteticar",
      mensagem: "Fecharemos dia 25",
      filtro: "todos",
    });

    expect(result.total_destinatarios).toBe(1);
    expect(inserts[0][0].jid).toBe("5511987654321@s.whatsapp.net");
    expect(result.mensagem_montada).toContain("Esteticar");
  });

  it("processarDisparo envia para todos e conclui", async () => {
    const dests = [
      { id: 1, jid: "5511999990001@s.whatsapp.net" },
      { id: 2, jid: "5511999990002@s.whatsapp.net" },
    ];
    let selectCount = 0;
    supabaseAdmin.from.mockImplementation((table) => {
      const chain = q({ data: [], error: null });
      chain.select.mockImplementation(() => {
        selectCount += 1;
        chain.then = (resolve) =>
          resolve(selectCount === 1 ? { data: dests, error: null } : { data: [], error: null });
        return chain;
      });
      return chain;
    });

    await processarDisparo(7, "t1", "Empresa X", "Aviso teste", 0);

    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(2);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("5511999990001@s.whatsapp.net", expect.stringContaining("Aviso teste"));
    expect(criarNotificacao).toHaveBeenCalled();
  });

  it("processarDisparo marca falhas quando WhatsApp cai no meio", async () => {
    const dests = [
      { id: 1, jid: "5511999990001@s.whatsapp.net" },
      { id: 2, jid: "5511999990002@s.whatsapp.net" },
      { id: 3, jid: "5511999990003@s.whatsapp.net" },
    ];
    let selectCount = 0;
    supabaseAdmin.from.mockImplementation((table) => {
      const chain = q({ data: [], error: null });
      chain.select.mockImplementation(() => {
        selectCount += 1;
        chain.then = (resolve) =>
          resolve(selectCount === 1 ? { data: dests, error: null } : { data: [], error: null });
        return chain;
      });
      return chain;
    });

    let calls = 0;
    getConnectionState.mockImplementation(() => {
      calls += 1;
      return calls <= 1 ? CONECTADO : { status: "disconnected", tenantId: null };
    });

    await processarDisparo(8, "t1", "Empresa X", "Aviso", 0);

    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1);
    expect(criarNotificacao).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "comunicado" })
    );
  });
});
