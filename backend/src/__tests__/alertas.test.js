import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabaseAdmin } from "../config/supabase.js";

vi.mock("../services/notificacoes.service.js", () => ({
  criarNotificacao: vi.fn().mockResolvedValue({}),
}));

import * as notificacoes from "../services/notificacoes.service.js";
import {
  verificarContasVencendo,
  cobrarFaturamentosPendentes,
  fecharAgendamentosPassados,
  enviarResumoDiario,
} from "../services/alertas.service.js";
import { dataLocalISO } from "../utils/data.js";

vi.mock("../chatbot/baileys.client.js", () => ({
  sendWhatsAppMessage: vi.fn(),
  getConnectionState: vi.fn(),
}));

import * as baileys from "../chatbot/baileys.client.js";

function isoComDeslocamento(dias) {
  return dataLocalISO(new Date(Date.now() + dias * 24 * 60 * 60 * 1000));
}

function q(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
    ...overrides,
  };
}

describe("alertas - verificarContasVencendo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cria alerta para conta vencida", async () => {
    const conta = {
      conta_id: 1,
      tenant_id: "tenant-1",
      descricao: "Aluguel do box",
      valor: 1500,
      data_vencimento: isoComDeslocamento(-2),
    };

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "contas_pagar") {
        return q({ then: (resolve) => resolve({ data: [conta], error: null }) });
      }
      return q({ then: (resolve) => resolve({ count: 0, error: null }) });
    });

    const criadas = await verificarContasVencendo();

    expect(criadas).toBe(1);
    expect(notificacoes.criarNotificacao).toHaveBeenCalledTimes(1);
    expect(notificacoes.criarNotificacao).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        tipo: "conta_vencendo",
        titulo: "Conta a pagar vencida",
        referenciaTipo: "conta_pagar",
        referenciaId: "1",
      })
    );
    const chamada = notificacoes.criarNotificacao.mock.calls[0][0];
    expect(chamada.mensagem).toContain("VENCIDA há 2 dia(s)");
    expect(chamada.mensagem).toContain("Aluguel do box");
  });

  it("cria alerta para conta vencendo em 3 dias", async () => {
    const conta = {
      conta_id: 2,
      tenant_id: "tenant-1",
      descricao: "Energia",
      valor: 89.9,
      data_vencimento: isoComDeslocamento(3),
    };

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "contas_pagar") {
        return q({ then: (resolve) => resolve({ data: [conta], error: null }) });
      }
      return q({ then: (resolve) => resolve({ count: 0, error: null }) });
    });

    await verificarContasVencendo();

    expect(notificacoes.criarNotificacao).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: "Conta a pagar vencendo",
      })
    );
    const chamada = notificacoes.criarNotificacao.mock.calls[0][0];
    expect(chamada.mensagem).toContain("vence em 3 dia(s)");
  });

  it("nao duplica alerta quando ja existe notificacao da conta", async () => {
    const conta = {
      conta_id: 3,
      tenant_id: "tenant-1",
      descricao: "Internet",
      valor: 100,
      data_vencimento: isoComDeslocamento(-1),
    };

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "contas_pagar") {
        return q({ then: (resolve) => resolve({ data: [conta], error: null }) });
      }
      return q({ then: (resolve) => resolve({ count: 1, error: null }) });
    });

    const criadas = await verificarContasVencendo();

    expect(criadas).toBe(0);
    expect(notificacoes.criarNotificacao).not.toHaveBeenCalled();
  });

  it("retorna 0 quando a busca falha", async () => {
    supabaseAdmin.from.mockReturnValue(
      q({ then: (resolve) => resolve({ data: null, error: new Error("DB down") }) })
    );

    const criadas = await verificarContasVencendo();

    expect(criadas).toBe(0);
    expect(notificacoes.criarNotificacao).not.toHaveBeenCalled();
  });

  it("nao cria nada quando nao ha contas proximas do vencimento", async () => {
    supabaseAdmin.from.mockReturnValue(q());

    const criadas = await verificarContasVencendo();

    expect(criadas).toBe(0);
    expect(notificacoes.criarNotificacao).not.toHaveBeenCalled();
  });
});

describe("alertas - cobrarFaturamentosPendentes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baileys.getConnectionState.mockReturnValue({ status: "connected", tenantId: "tenant-1" });
  });

  function faturamentoPendente(overrides = {}) {
    return {
      faturamento_id: 77,
      valor_total: 250,
      ordem_servico: {
        agendamento: {
          data_agendamento: isoComDeslocamento(-5),
          cliente: { nome: "Maria", telefone: "11988887777" },
        },
      },
      ...overrides,
    };
  }

  it("envia cobranca e registra notificacao", async () => {
    const fat = faturamentoPendente();
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "faturamentos") {
        return q({ then: (resolve) => resolve({ data: [fat], error: null }) });
      }
      return q({ then: (resolve) => resolve({ count: 0, error: null }) });
    });
    baileys.sendWhatsAppMessage.mockResolvedValue();

    const enviadas = await cobrarFaturamentosPendentes();

    expect(enviadas).toBe(1);
    expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
      "5511988887777@s.whatsapp.net",
      expect.stringContaining("Lembrete de Pagamento")
    );
    expect(notificacoes.criarNotificacao).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        tipo: "cobranca_faturamento",
        titulo: "Cobrança enviada",
        referenciaTipo: "faturamento",
        referenciaId: "77",
      })
    );
  });

  it("nao cobra o mesmo faturamento duas vezes", async () => {
    const fat = faturamentoPendente();
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "faturamentos") {
        return q({ then: (resolve) => resolve({ data: [fat], error: null }) });
      }
      return q({ then: (resolve) => resolve({ count: 1, error: null }) });
    });

    const enviadas = await cobrarFaturamentosPendentes();

    expect(enviadas).toBe(0);
    expect(baileys.sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("pula faturamento sem telefone do cliente", async () => {
    const fat = faturamentoPendente({
      ordem_servico: { agendamento: { data_agendamento: isoComDeslocamento(-5), cliente: { nome: "Sem Fone", telefone: null } } },
    });
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "faturamentos") {
        return q({ then: (resolve) => resolve({ data: [fat], error: null }) });
      }
      return q({ then: (resolve) => resolve({ count: 0, error: null }) });
    });

    const enviadas = await cobrarFaturamentosPendentes();

    expect(enviadas).toBe(0);
    expect(baileys.sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("nao faz nada quando whatsapp desconectado", async () => {
    baileys.getConnectionState.mockReturnValue({ status: "disconnected", tenantId: null });

    const enviadas = await cobrarFaturamentosPendentes();

    expect(enviadas).toBe(0);
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("continua quando envio falha para um cliente", async () => {
    const fat = faturamentoPendente({
      faturamento_id: 88,
      ordem_servico: {
        agendamento: {
          data_agendamento: isoComDeslocamento(-4),
          cliente: { nome: "Erro", telefone: "11911112222" },
        },
      },
    });
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "faturamentos") {
        return q({ then: (resolve) => resolve({ data: [fat], error: null }) });
      }
      return q({ then: (resolve) => resolve({ count: 0, error: null }) });
    });
    baileys.sendWhatsAppMessage.mockRejectedValue(new Error("falhou"));

    const enviadas = await cobrarFaturamentosPendentes();

    expect(enviadas).toBe(0);
    expect(notificacoes.criarNotificacao).not.toHaveBeenCalled();
  });
});


describe("alertas - fecharAgendamentosPassados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const agPendente = {
    agendamento_id: 50,
    tenant_id: "tenant-1",
    data_agendamento: "2026-08-20",
    hora_agendamento: "10:00:00",
    cliente: { nome: "Carlos" },
  };
  const agConfirmado = {
    agendamento_id: 51,
    tenant_id: "tenant-1",
    data_agendamento: "2026-08-21",
    hora_agendamento: "14:00:00",
    cliente: { nome: "Ana" },
  };

  function mockAgendamentos(pendentes, confirmados, contagemDedupe = 0) {
    let chamada = 0;
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "agendamentos") {
        chamada++;
        if (chamada === 1) {
          return q({ then: (resolve) => resolve({ data: pendentes, error: null }) });
        }
        return q({ then: (resolve) => resolve({ data: confirmados, error: null }) });
      }
      return q({ then: (resolve) => resolve({ count: contagemDedupe, error: null }) });
    });
  }

  it("cancela pendente antigo e avisa para revisar confirmado antigo", async () => {
    mockAgendamentos([agPendente], [agConfirmado]);

    const resultado = await fecharAgendamentosPassados();

    expect(resultado).toEqual({ cancelados: 1, avisosCriados: 1 });

    const tipos = notificacoes.criarNotificacao.mock.calls.map((c) => c[0].tipo);
    expect(tipos).toContain("agendamento_cancelado_auto");
    expect(tipos).toContain("revisao_agendamento_passado");

    expect(notificacoes.criarNotificacao).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: "agendamento_cancelado_auto",
        titulo: "Agendamento expirado cancelado",
        referenciaId: "50",
      })
    );
  });

  it("nao duplica aviso de revisao", async () => {
    let chamada = 0;
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "agendamentos") {
        chamada++;
        return chamada === 1
          ? q({ then: (resolve) => resolve({ data: [], error: null }) })
          : q({ then: (resolve) => resolve({ data: [agConfirmado], error: null }) });
      }
      return q({ then: (resolve) => resolve({ count: 5, error: null }) });
    });

    const resultado = await fecharAgendamentosPassados();

    expect(resultado).toEqual({ cancelados: 0, avisosCriados: 0 });
    expect(notificacoes.criarNotificacao).not.toHaveBeenCalled();
  });

  it("nao faz nada quando nao ha agendamentos passados", async () => {
    mockAgendamentos([], []);

    const resultado = await fecharAgendamentosPassados();

    expect(resultado).toEqual({ cancelados: 0, avisosCriados: 0 });
    expect(notificacoes.criarNotificacao).not.toHaveBeenCalled();
  });

  it("remove notificacoes de revisao de agendamentos ja resolvidos", async () => {
    const excluidos = [];

    function qDelete() {
      return {
        eq: vi.fn((_campo, valor) => {
          excluidos.push(valor);
          return q();
        }),
        then: (resolve) => resolve({ data: null, error: null }),
      };
    }

    let chamadaAg = 0;
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "agendamentos") {
        chamadaAg++;
        if (chamadaAg <= 2) {
          return q({ then: (resolve) => resolve({ data: [], error: null }) });
        }
        return q({
          then: (resolve) => resolve({
            data: [
              { agendamento_id: "55", status: "falta" },
              { agendamento_id: "56", status: "confirmado" },
            ],
            error: null,
          }),
        });
      }
      if (table === "notificacoes") {
        let primeiraConsulta = true;
        return q({
          select: vi.fn(() => {
            if (primeiraConsulta) {
              primeiraConsulta = false;
              return q({
                then: (resolve) => resolve({
                  data: [
                    { notificacao_id: 1, referencia_id: "55" },
                    { notificacao_id: 2, referencia_id: "56" },
                  ],
                  error: null,
                }),
              });
            }
            return q();
          }),
          delete: vi.fn(() => qDelete()),
          then: (resolve) => resolve({ count: 0, error: null }),
        });
      }
      return q();
    });

    await fecharAgendamentosPassados();

    expect(excluidos).toEqual([1]);
  });
});

describe("alertas - enviarResumoDiario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baileys.getConnectionState.mockReturnValue({ status: "connected", tenantId: "tenant-1" });
  });

  const empresa = { tenant_id: "tenant-1", nome_fantasia: "EstetiCar", telefone: "11999990000" };

  function mockResumo({ ags = [], contas = [], faturas = [], dedupeCount = 0 } = {}) {
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "configuracao_empresa") {
        return q({ then: (resolve) => resolve({ data: [empresa], error: null }) });
      }
      if (table === "notificacoes") {
        return q({ then: (resolve) => resolve({ count: dedupeCount, error: null }) });
      }
      if (table === "agendamentos") {
        return q({
          order: vi.fn().mockReturnValue({ then: (resolve) => resolve({ data: ags, error: null }) }),
          then: (resolve) => resolve({ data: ags, error: null }),
        });
      }
      if (table === "contas_pagar") {
        return q({ then: (resolve) => resolve({ data: contas, error: null }) });
      }
      if (table === "faturamentos") {
        return q({ then: (resolve) => resolve({ data: faturas, error: null }) });
      }
      return q();
    });
  }

  it("envia resumo com agendamentos e pendencias para o dono", async () => {
    mockResumo({
      ags: [{ hora_agendamento: "09:00:00", cliente: { nome: "Ana" } }],
      contas: [{ descricao: "Aluguel", valor: 1200, data_vencimento: "2026-08-25" }],
      faturas: [{ valor_total: 300 }, { valor_total: 450 }],
    });
    baileys.sendWhatsAppMessage.mockResolvedValue();

    const { enviados } = await enviarResumoDiario();

    expect(enviados).toBe(1);
    expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
      "5511999990000@s.whatsapp.net",
      expect.stringContaining("Resumo do dia")
    );
    const msg = baileys.sendWhatsAppMessage.mock.calls[0][1];
    expect(msg).toContain("09:00 - Ana");
    expect(msg).toContain("Contas a pagar em aberto");
    expect(msg).toContain("Faturas pendentes");
    expect(notificacoes.criarNotificacao).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "resumo_diario" })
    );
  });

  it("nao envia duas vezes no mesmo dia", async () => {
    mockResumo({ dedupeCount: 1 });

    const { enviados } = await enviarResumoDiario();

    expect(enviados).toBe(0);
    expect(baileys.sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("nao envia quando whatsapp desconectado", async () => {
    baileys.getConnectionState.mockReturnValue({ status: "disconnected", tenantId: null });

    const { enviados } = await enviarResumoDiario();

    expect(enviados).toBe(0);
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("pula empresa sem telefone", async () => {
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === "configuracao_empresa") {
        return q({ then: (resolve) => resolve({ data: [{ tenant_id: "t1", nome_fantasia: "X", telefone: null }], error: null }) });
      }
      return q();
    });

    const { enviados } = await enviarResumoDiario();

    expect(enviados).toBe(0);
    expect(baileys.sendWhatsAppMessage).not.toHaveBeenCalled();
  });
});
