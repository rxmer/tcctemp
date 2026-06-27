import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabaseAdmin } from "../config/supabase.js";

const TENANT_ID = "tenant-1";
const REMOTE_JID = "5511999999999@s.whatsapp.net";
const SESSION_ID = "session-uuid-1";

vi.mock("../chatbot/baileys.client.js", () => ({
  sendWhatsAppMessage: vi.fn(),
  sendButtons: vi.fn(),
  sendList: vi.fn(),
}));

vi.mock("../services/notificacoes.service.js", () => ({
  criarNotificacao: vi.fn().mockResolvedValue({}),
}));

import * as baileys from "../chatbot/baileys.client.js";
import * as notificacoes from "../services/notificacoes.service.js";
import { processMessage, parseDateInput, validarAntecedenciaCancelamento, validarAgendamentoNaoIniciado } from "../chatbot/chatbot.service.js";

function mockQuery(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
    ...overrides,
  };
}

function buildSession(overrides = {}) {
  return {
    id: SESSION_ID,
    tenant_id: TENANT_ID,
    remote_jid: REMOTE_JID,
    client_phone: "5511999999999",
    client_name: "João",
    cliente_id: null,
    state: "MENU_PRINCIPAL",
    state_data: {},
    ativo: true,
    ...overrides,
  };
}

describe("chatbot.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processMessage - nova conversa", () => {
    it("deve criar sessao e enviar boas vindas quando nao existe sessao", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "Oi", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Olá")
      );
    });
  });

  describe("processMessage - saudacao", () => {
    it("deve responder saudacao no MENU_PRINCIPAL", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "oi", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Olá")
      );
    });
  });

  describe("processMessage - reset", () => {
    it("deve reiniciar conversa", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({ state: "ESCOLHENDO_SERVICO" }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "reiniciar", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("reiniciada")
      );
    });
  });

  describe("processMessage - menu agendar", () => {
    it("deve listar servicos quando solicita agendar", async () => {
      const servicos = [
        { servico_id: 1, nome_servico: "Lavagem", preco_base: 50, duracao_min: 30 },
      ];

      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
        then: (resolve) => resolve({ data: servicos, error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "menu_agendar", "João");

      expect(baileys.sendList).toHaveBeenCalled();
    });

    it("deve informar se nao ha servicos", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
        then: (resolve) => resolve({ data: [], error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "menu_agendar", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Nenhum serviço")
      );
    });
  });

  describe("processMessage - menu consultar", () => {
    it("deve informar que nao tem agendamentos quando cliente nao existe", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({ data: buildSession(), error: null })
          .mockResolvedValueOnce({ data: null, error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "menu_consultar", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("não possui agendamentos")
      );
    });

    it("deve listar agendamentos futuros", async () => {
      const cliente = { cliente_id: 1, nome: "João" };
      const agendamentos = [
        {
          agendamento_id: 1,
          data_agendamento: "2026-07-01",
          hora_agendamento: "10:00",
          status: "confirmado",
          servico: { nome_servico: "Lavagem", preco_base: 50 },
          veiculo: { marca: "Fiat", modelo: "Uno", placa: "ABC-1234" },
        },
      ];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
          });
        }
        if (table === "clientes") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: cliente, error: null }),
          });
        }
        if (table === "agendamentos") {
          return mockQuery({
            then: (resolve) => resolve({ data: agendamentos, error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "menu_consultar", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("agendamentos futuros")
      );
    });
  });

  describe("processMessage - menu atendente", () => {
    it("deve notificar e entrar em FALANDO_COM_ATENDENTE", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "menu_atendente", "João");

      expect(notificacoes.criarNotificacao).toHaveBeenCalled();
      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("solicitação foi enviada")
      );
    });

    it("deve responder que foi encaminhado se ja estiver em FALANDO_COM_ATENDENTE", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({
          data: buildSession({ state: "FALANDO_COM_ATENDENTE" }),
          error: null,
        }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "Oi", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Em breve um atendente")
      );
    });
  });

  describe("processMessage - menu servicos", () => {
    it("deve listar servicos via sendList", async () => {
      const servicos = [
        { servico_id: 1, nome_servico: "Lavagem", preco_base: 50, duracao_min: 30 },
      ];

      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
        then: (resolve) => resolve({ data: servicos, error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "menu_servicos", "João");

      expect(baileys.sendList).toHaveBeenCalled();
    });
  });

  describe("processMessage - menu cancelar", () => {
    it("deve informar que nao ha agendamentos se cliente nao existe", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({ data: buildSession(), error: null })
          .mockResolvedValueOnce({ data: null, error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "menu_cancelar", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("não possui agendamentos")
      );
    });
  });

  describe("processMessage - erro consecutivo", () => {
    it("deve sugerir atendente apos 3 erros", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({
          data: buildSession({
            state: "ESCOLHENDO_SERVICO",
            state_data: { erros_consecutivos: 2 },
          }),
          error: null,
        }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "alksjd", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("atendente"),
        expect.any(Array),
        "Esteticar"
      );
    });
  });

  describe("processMessage - opcao invalida", () => {
    it("deve enviar mensagem de erro no MENU_PRINCIPAL", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "opcao_invalida", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Opção inválida")
      );
    });
  });

  describe("processMessage - confirmar agendamento", () => {
    it("deve validar disponibilidade antes de confirmar", async () => {
      const session = buildSession({
        state: "CONFIRMANDO_AGENDAMENTO",
        state_data: {
          servico_id: 1,
          veiculo_id: 1,
          data_agendamento: "2026-07-01",
          hora_agendamento: "10:00",
        },
      });

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
          });
        }
        if (table === "agendamentos") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            then: (resolve) => resolve({ count: 1, data: [], error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "confirmar", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("ocupado")
      );
    });
  });

  describe("processMessage - detectar intent natural", () => {
    it("deve detectar servico pelo nome no MENU_PRINCIPAL", async () => {
      const servicos = [
        { servico_id: 1, nome_servico: "Lavagem", preco_base: 50, duracao_min: 30 },
      ];
      const novoCliente = { cliente_id: 99, nome: "João", telefone: "5511999999999" };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
          });
        }
        if (table === "servico") {
          return mockQuery({
            then: (resolve) => resolve({ data: servicos, error: null }),
          });
        }
        if (table === "clientes") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            single: vi.fn().mockResolvedValue({ data: novoCliente, error: null }),
          });
        }
        if (table === "veiculos") {
          return mockQuery({
            then: (resolve) => resolve({ data: [], error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "quero lavar meu carro", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Identifiquei")
      );
    });

    it("deve detectar servico por palavra-chave (lavar)", async () => {
      const servicos = [
        { servico_id: 1, nome_servico: "Lavagem", preco_base: 50, duracao_min: 30 },
      ];
      const novoCliente = { cliente_id: 99, nome: "João", telefone: "5511999999999" };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
          });
        }
        if (table === "servico") {
          return mockQuery({
            then: (resolve) => resolve({ data: servicos, error: null }),
          });
        }
        if (table === "clientes") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            single: vi.fn().mockResolvedValue({ data: novoCliente, error: null }),
          });
        }
        if (table === "veiculos") {
          return mockQuery({
            then: (resolve) => resolve({ data: [], error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "preciso lavar", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Identifiquei")
      );
    });

    it("deve ir para veiculo_novo se cliente existe mas nao tem veiculos", async () => {
      const servicos = [
        { servico_id: 1, nome_servico: "Lavagem", preco_base: 50, duracao_min: 30 },
      ];
      const clienteExistente = { cliente_id: 1, nome: "João", telefone: "5511999999999" };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
          });
        }
        if (table === "servico") {
          return mockQuery({
            then: (resolve) => resolve({ data: servicos, error: null }),
          });
        }
        if (table === "clientes") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: clienteExistente, error: null }),
          });
        }
        if (table === "veiculos") {
          return mockQuery({
            then: (resolve) => resolve({ data: [], error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "quero lavar", "João");

      expect(baileys.sendList).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("*marca* do veículo"),
        expect.any(String),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve mostrar lista de veiculos se cliente existe e tem veiculos", async () => {
      const servicos = [
        { servico_id: 1, nome_servico: "Lavagem", preco_base: 50, duracao_min: 30 },
      ];
      const clienteExistente = { cliente_id: 1, nome: "João", telefone: "5511999999999" };
      const veiculos = [
        { veiculo_id: 10, placa: "ABC1234", marca: "Fiat", modelo: "Uno" },
      ];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
          });
        }
        if (table === "servico") {
          return mockQuery({
            then: (resolve) => resolve({ data: servicos, error: null }),
          });
        }
        if (table === "clientes") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: clienteExistente, error: null }),
          });
        }
        if (table === "veiculos") {
          return mockQuery({
            then: (resolve) => resolve({ data: veiculos, error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "quero lavar", "João");

      expect(baileys.sendList).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Selecione o veículo"),
        expect.any(String),
        expect.any(Array),
        "Esteticar"
      );
    });
  });

  describe("processMessage - intents", () => {
    it("deve responder a agradecimento (THANKS)", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "obrigado", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Por nada")
      );
    });

    it("deve responder despedida (DESPEDIDA) e manter estado", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({ state: "ESCOLHENDO_SERVICO" }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "tchau", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Até mais")
      );
    });

    it("deve reiniciar (RESET) de estado nao inicial", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({ state: "ESCOLHENDO_SERVICO" }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "reiniciar", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("reiniciada")
      );
    });
  });

  describe("processMessage - voltar (back)", () => {
    it("deve voltar ao menu principal de ESCOLHENDO_SERVICO", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({ state: "ESCOLHENDO_SERVICO" }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "0", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Menu"),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve voltar ao menu de DIGITANDO_NOME", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({ state: "DIGITANDO_NOME" }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "0", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Menu"),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve voltar ao menu de DIGITANDO_TELEFONE", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({ state: "DIGITANDO_TELEFONE" }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "0", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Menu"),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve voltar ao menu de ESCOLHENDO_VEICULO", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({ state: "ESCOLHENDO_VEICULO" }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "0", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Menu"),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve voltar de DIGITANDO_VEICULO_MARCA para selecao de veiculo quando ha veiculos", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "DIGITANDO_VEICULO_MARCA",
          state_data: { servico_id: 1, veiculos: [{ veiculo_id: 1, marca: "Fiat", modelo: "Uno", placa: "ABC-1234" }] },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "0", "João");

      expect(baileys.sendList).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("veículo"),
        expect.any(String),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve voltar de DIGITANDO_VEICULO_MARCA para menu quando nao ha veiculos", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "DIGITANDO_VEICULO_MARCA",
          state_data: { servico_id: 1 },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "0", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Menu"),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve voltar de DIGITANDO_VEICULO_MODELO para lista de marcas", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "DIGITANDO_VEICULO_MODELO",
          state_data: { servico_id: 1 },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "0", "João");

      expect(baileys.sendList).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("marca"),
        expect.any(String),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve voltar de DIGITANDO_VEICULO_PLACA para lista de modelos quando marca conhecida", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "DIGITANDO_VEICULO_PLACA",
          state_data: { servico_id: 1, marca: "Fiat", veiculos: [] },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "0", "João");

      expect(baileys.sendList).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("modelo"),
        expect.any(String),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve voltar de ESCOLHENDO_DATA para selecao de veiculo quando ha veiculos", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "ESCOLHENDO_DATA",
          state_data: { servico_id: 1, veiculos: [{ veiculo_id: 1, marca: "Fiat", modelo: "Uno", placa: "ABC-1234" }] },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "0", "João");

      expect(baileys.sendList).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("veículo"),
        expect.any(String),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve voltar de ESCOLHENDO_DATA para menu quando nao ha veiculos", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "ESCOLHENDO_DATA",
          state_data: { servico_id: 1 },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "0", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Menu"),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve voltar de ESCOLHENDO_HORARIO para selecao de data quando ha datas", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "ESCOLHENDO_HORARIO",
          state_data: { datas_disponiveis: ["2026-07-01", "2026-07-02"] },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "0", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("data"),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve voltar de CONFIRMANDO_AGENDAMENTO para o menu", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({ state: "CONFIRMANDO_AGENDAMENTO" }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "0", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Menu"),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve voltar de CANCELANDO_AGENDAMENTO para o menu", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({ state: "CANCELANDO_AGENDAMENTO" }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "0", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Menu"),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve voltar de CONFIRMANDO_CANCELAMENTO para o menu", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({ state: "CONFIRMANDO_CANCELAMENTO" }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "0", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Menu"),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve voltar de AGENDAMENTO_CONFIRMADO para o menu", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({ state: "AGENDAMENTO_CONFIRMADO" }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "0", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Menu"),
        expect.any(Array),
        "Esteticar"
      );
    });
  });

  describe("processMessage - confirmar agendamento - edge cases", () => {
    it("deve cancelar agendamento quando usuario digita 2", async () => {
      const session = buildSession({
        state: "CONFIRMANDO_AGENDAMENTO",
        state_data: { servico_id: 1, veiculo_id: 1, data_agendamento: "2026-07-01", hora_agendamento: "10:00" },
      });

      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "2", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("cancelado")
      );
    });

    it("deve informar dados incompletos quando state_data esta corrompido", async () => {
      const session = buildSession({
        state: "CONFIRMANDO_AGENDAMENTO",
        state_data: { servico_id: 1 },
      });

      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "confirmar", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("incompletos")
      );
    });
  });

  describe("processMessage - erro consecutivo em data entry", () => {
    it("deve incrementar erro quando nome e muito curto", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "DIGITANDO_NOME",
          state_data: { servico_id: 1, erros_consecutivos: 0 },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "a", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("nome completo")
      );
    });

    it("deve sugerir atendente apos 3 erros no DIGITANDO_NOME", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "DIGITANDO_NOME",
          state_data: { servico_id: 1, erros_consecutivos: 2 },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "a", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("atendente"),
        expect.any(Array),
        "Esteticar"
      );
    });
  });

  describe("processMessage - atendente apos erros", () => {
    it("deve encaminhar para atendente quando usuario aceita (sim_atendente)", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "ESCOLHENDO_SERVICO",
          state_data: { erros_consecutivos: 3, aguardando_resposta_atendente: true },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "1", "João");

      expect(notificacoes.criarNotificacao).toHaveBeenCalled();
      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("solicitação foi enviada")
      );
    });

    it("deve resetar contagem quando usuario recusa atendente", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "ESCOLHENDO_SERVICO",
          state_data: { erros_consecutivos: 3, aguardando_resposta_atendente: true },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "nao", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Tudo bem")
      );
    });
  });

  describe("processMessage - FALANDO_COM_ATENDENTE", () => {
    it("deve responder que foi encaminhado ao enviar mensagem", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({ state: "FALANDO_COM_ATENDENTE" }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "preciso de ajuda", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("encaminhada")
      );
    });
  });

  describe("processMessage - lista vazia", () => {
    it("deve informar quando nao ha datas disponiveis (sem expediente)", async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
              state: "ESCOLHENDO_VEICULO",
              state_data: { servico_id: 1, veiculos: [{ veiculo_id: 1, marca: "Fiat", modelo: "Uno", placa: "ABC-1234" }] },
            }), error: null }),
          });
        }
        if (table === "configuracao_expediente") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "1", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Não há datas disponíveis")
      );
    });
  });

  describe("processMessage - indice invalido", () => {
    it("deve rejeitar indice numerico maior que a lista de servicos", async () => {
      const servicos = [
        { servico_id: 1, nome_servico: "Lavagem", preco_base: 50, duracao_min: 30 },
      ];

      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "ESCOLHENDO_SERVICO",
          state_data: { servicos },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "99", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Opção inválida")
      );
    });
  });

  describe("processMessage - veiculo novo", () => {
    it("deve ir para cadastro quando seleciona veiculo_novo", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "ESCOLHENDO_VEICULO",
          state_data: { servico_id: 1, veiculos: [{ veiculo_id: 1, marca: "Fiat", modelo: "Uno", placa: "ABC-1234" }] },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "veiculo_novo", "João");

      expect(baileys.sendList).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("marca"),
        expect.any(String),
        expect.any(Array),
        "Esteticar"
      );
    });
  });

  describe("processMessage - confirmar cancelamento", () => {
    it("deve cancelar cancelamento quando usuario digita 2", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "CONFIRMANDO_CANCELAMENTO",
          state_data: { agendamento_id: 1 },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "2", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Cancelamento não realizado")
      );
    });
  });

  describe("processMessage - horario indisponivel", () => {
    it("deve informar quando nao ha mais horarios na data", async () => {
      const session = buildSession({
        state: "ESCOLHENDO_HORARIO",
        state_data: {
          servico_id: 1, veiculo_id: 1, data_agendamento: "2026-07-01", horarios: ["10:00"],
        },
      });

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
          });
        }
        if (table === "configuracao_expediente") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: { abertura: "08:00", fechamento: "18:00" }, error: null }),
          });
        }
        if (table === "agendamentos") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            then: (resolve) => resolve({ count: 1, data: [], error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "horario_10:00", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Não há mais horários")
      );
    });
  });

  describe("processMessage - erro ao criar agendamento", () => {
    it("deve informar erro quando insert retorna null", async () => {
      const session = buildSession({
        state: "CONFIRMANDO_AGENDAMENTO",
        cliente_id: 1,
        state_data: { servico_id: 1, veiculo_id: 1, data_agendamento: "2026-07-01", hora_agendamento: "10:00", servicoInfo: { nome_servico: "Lavagem", preco_base: 50 }, veiculoInfo: { marca: "Fiat", modelo: "Uno", placa: "ABC-1234" } },
      });

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
          });
        }
        if (table === "agendamentos") {
          return mockQuery({
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            then: (resolve) => resolve({ count: 0, data: [], error: null }),
          });
        }
        if (table === "usuarios") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "admin-1" }, error: null }),
          });
        }
        if (table === "configuracao_expediente") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { abertura: "08:00", fechamento: "18:00" }, error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "confirmar", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Erro ao criar agendamento")
      );
    });
  });

  describe("processMessage - erro do Supabase", () => {
    it("deve capturar erro inesperado e informar usuario", async () => {
      supabaseAdmin.from.mockImplementation(() => {
        throw new Error("Falha na conexão");
      });

      await processMessage(TENANT_ID, REMOTE_JID, "Oi", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("erro inesperado")
      );
    });
  });

  describe("processMessage - state_data nulo", () => {
    it("deve sobreviver quando state_data e null no banco", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "ESCOLHENDO_SERVICO",
          state_data: null,
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "alksjd", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Opção inválida")
      );
    });
  });

  describe("processMessage - telefone invalido", () => {
    it("deve rejeitar telefone invalido no DIGITANDO_TELEFONE", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "DIGITANDO_TELEFONE",
          state_data: { servico_id: 1, nome_cliente: "João" },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "abc", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Telefone inválido")
      );
    });
  });

  describe("processMessage - data entry completa", () => {
    it("deve criar cliente e ir para veiculo quando nome valido e telefone valido", async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
              state: "DIGITANDO_NOME",
              state_data: { servico_id: 1 },
            }), error: null }),
          });
        }
        if (table === "clientes") {
          return mockQuery({
            single: vi.fn().mockResolvedValue({ data: { cliente_id: 1, nome: "João Silva", telefone: "5511999999999" }, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          });
        }
        if (table === "veiculos") {
          return mockQuery({
            then: (resolve) => resolve({ data: [], error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "João Silva", "João");

      expect(baileys.sendList).toHaveBeenCalled();
    });

    it("deve ir para DIGITANDO_TELEFONE quando nome valido mas telefone invalido", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "DIGITANDO_NOME",
          state_data: { servico_id: 1, telefone_invalido: true },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "João Silva", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("telefone")
      );
    });

    it("deve criar cliente e ir para veiculo quando telefone valido", async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
              state: "DIGITANDO_TELEFONE",
              state_data: { servico_id: 1, nome_cliente: "João" },
            }), error: null }),
          });
        }
        if (table === "clientes") {
          return mockQuery({
            single: vi.fn().mockResolvedValue({ data: { cliente_id: 1, nome: "João", telefone: "5511999999999" }, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          });
        }
        if (table === "veiculos") {
          return mockQuery({
            then: (resolve) => resolve({ data: [], error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "5511999999999", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Cadastro concluído")
      );
      expect(baileys.sendList).toHaveBeenCalled();
    });
  });

  describe("processMessage - digitando veiculo marca", () => {
    it("deve selecionar marca da lista", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "DIGITANDO_VEICULO_MARCA",
          state_data: { servico_id: 1 },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "marca_Fiat", "João");

      expect(baileys.sendList).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("modelo"),
        expect.any(String),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve aceitar marca digitada", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "DIGITANDO_VEICULO_MARCA",
          state_data: { servico_id: 1 },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "Fiat", "João");

      expect(baileys.sendList).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("modelo"),
        expect.any(String),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve rejeitar marca muito curta e mostrar lista", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "DIGITANDO_VEICULO_MARCA",
          state_data: { servico_id: 1 },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "F", "João");

      expect(baileys.sendList).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("marca"),
        expect.any(String),
        expect.any(Array),
        "Esteticar"
      );
    });
  });

  describe("processMessage - digitando veiculo modelo", () => {
    it("deve selecionar modelo da lista", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "DIGITANDO_VEICULO_MODELO",
          state_data: { servico_id: 1, marca: "Fiat" },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "modelo_Uno", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("placa")
      );
    });

    it("deve aceitar modelo digitado", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "DIGITANDO_VEICULO_MODELO",
          state_data: { servico_id: 1, marca: "Tesla" },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "Model S", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("placa")
      );
    });

    it("deve rejeitar modelo muito curto e mostrar lista", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "DIGITANDO_VEICULO_MODELO",
          state_data: { servico_id: 1, marca: "Fiat" },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "U", "João");

      expect(baileys.sendList).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("modelo"),
        expect.any(String),
        expect.any(Array),
        "Esteticar"
      );
    });
  });

  describe("processMessage - digitando veiculo placa", () => {
    it("deve cadastrar veiculo com placa valida", async () => {
      const session = buildSession({
        state: "DIGITANDO_VEICULO_PLACA",
        cliente_id: 1,
        state_data: { servico_id: 1, marca: "Fiat", modelo: "Uno" },
      });

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
          });
        }
        if (table === "veiculos") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { veiculo_id: 99, marca: "Fiat", modelo: "Uno", placa: "ABC1234" }, error: null }),
          });
        }
        if (table === "configuracao_expediente") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { abertura: "08:00", fechamento: "18:00" }, error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "ABC-1234", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("cadastrado")
      );
    });

    it("deve rejeitar placa muito curta", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "DIGITANDO_VEICULO_PLACA",
          cliente_id: 1,
          state_data: { servico_id: 1, marca: "Fiat", modelo: "Uno" },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "AB", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Placa inválida")
      );
    });
  });

  describe("processMessage - selecionar veiculo existente", () => {
    it("deve selecionar veiculo existente por prefixo", async () => {
      const session = buildSession({
        state: "ESCOLHENDO_VEICULO",
        cliente_id: 1,
        state_data: { servico_id: 1, veiculos: [{ veiculo_id: 1, marca: "Fiat", modelo: "Uno", placa: "ABC-1234" }] },
      });

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
          });
        }
        if (table === "configuracao_expediente") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { abertura: "08:00", fechamento: "18:00" }, error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "veiculo_1", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("data"),
        expect.any(Array),
        "Esteticar"
      );
    });
  });

  describe("processMessage - cancelando agendamento", () => {
    it("deve selecionar agendamento por indice e ir para confirmacao", async () => {
      const session = buildSession({
        state: "CANCELANDO_AGENDAMENTO",
        state_data: {
          agendamentos: [
            { agendamento_id: 1, data_agendamento: "2026-07-01", hora_agendamento: "10:00", servico: { nome_servico: "Lavagem" } },
          ],
        },
      });

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
          });
        }
        if (table === "agendamentos") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { status: "pendente" }, error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "1", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("cancelar"),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve informar agendamento nao encontrado", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession({
          state: "CANCELANDO_AGENDAMENTO",
          state_data: { agendamentos: [] },
        }), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "99", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("não encontrado")
      );
    });

    it("deve validar que agendamento nao pode ser cancelado", async () => {
      const session = buildSession({
        state: "CANCELANDO_AGENDAMENTO",
        state_data: {
          agendamentos: [
            { agendamento_id: 1, data_agendamento: "2026-07-01", hora_agendamento: "10:00", servico: { nome_servico: "Lavagem" } },
          ],
        },
      });

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
          });
        }
        if (table === "agendamentos") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { status: "finalizado" }, error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "1", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("iniciado ou finalizado")
      );
    });
  });

  describe("processMessage - confirmar cancelamento", () => {
    it("deve confirmar cancelamento com sucesso", async () => {
      const session = buildSession({
        state: "CONFIRMANDO_CANCELAMENTO",
        state_data: { agendamento_id: 1 },
      });

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
          });
        }
        if (table === "agendamentos") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { status: "pendente" }, error: null }),
            update: vi.fn().mockReturnThis(),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "confirmar_cancelamento", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("realizado com sucesso")
      );
    });
  });

  describe("processMessage - digitar data manualmente", () => {
    it("deve aceitar data digitada valida (DDMMYYYY)", async () => {
      const session = buildSession({
        state: "ESCOLHENDO_DATA",
        state_data: { servico_id: 1, datas_disponiveis: ["2026-07-01", "2026-07-02"] },
      });

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
          });
        }
        if (table === "configuracao_expediente") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { abertura: "08:00", fechamento: "18:00" }, error: null }),
          });
        }
        if (table === "agendamentos") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            then: (resolve) => resolve({ count: 0, data: [], error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "01072026", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Selecione o horário"),
        expect.any(Array),
        "Esteticar"
      );
    });

    it("deve rejeitar data invalida e reexibir opcoes", async () => {
      const session = buildSession({
        state: "ESCOLHENDO_DATA",
        state_data: { servico_id: 1, datas_disponiveis: ["2026-07-01", "2026-07-02"] },
      });

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
          });
        }
        if (table === "configuracao_expediente") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { abertura: "08:00", fechamento: "18:00" }, error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "99/99/9999", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Selecione a data"),
        expect.any(Array),
        "Esteticar"
      );
    });
  });

  describe("processMessage - selecionar horario", () => {
    it("deve selecionar horario valido e ir para confirmacao", async () => {
      const session = buildSession({
        state: "ESCOLHENDO_HORARIO",
        cliente_id: 1,
        state_data: {
          servico_id: 1,
          veiculo_id: 1,
          data_agendamento: "2026-07-01",
          horarios: ["10:00", "10:30"],
        },
      });

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
          });
        }
        if (table === "servico") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { nome_servico: "Lavagem", preco_base: 50, duracao_min: 30 }, error: null }),
          });
        }
        if (table === "veiculos") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { marca: "Fiat", modelo: "Uno", placa: "ABC-1234" }, error: null }),
          });
        }
        if (table === "configuracao_expediente") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { abertura: "08:00", fechamento: "18:00" }, error: null }),
          });
        }
        if (table === "agendamentos") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            then: (resolve) => resolve({ count: 0, data: [], error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "horario_10:00", "João");

      expect(baileys.sendButtons).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("Confirma"),
        expect.any(Array),
        "Esteticar"
      );
    });
  });

  describe("processMessage - confirmar agendamento com sucesso", () => {
    it("deve confirmar agendamento com insert bem-sucedido", async () => {
      const session = buildSession({
        state: "CONFIRMANDO_AGENDAMENTO",
        cliente_id: 1,
        state_data: {
          servico_id: 1,
          veiculo_id: 1,
          data_agendamento: "2026-07-01",
          hora_agendamento: "10:00",
          servicoInfo: { nome_servico: "Lavagem", preco_base: 50 },
          veiculoInfo: { marca: "Fiat", modelo: "Uno", placa: "ABC-1234" },
        },
      });

      const agendamentoCriado = {
        agendamento_id: 99,
        data_agendamento: "2026-07-01",
        hora_agendamento: "10:00",
        cliente_id: 1,
        servico_id: 1,
        veiculo_id: 1,
        servico: { nome_servico: "Lavagem", preco_base: 50 },
        veiculo: { marca: "Fiat", modelo: "Uno", placa: "ABC-1234" },
      };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === "chatbot_session") {
          return mockQuery({
            maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
          });
        }
        if (table === "configuracao_expediente") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { abertura: "08:00", fechamento: "18:00" }, error: null }),
          });
        }
        if (table === "agendamentos") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: agendamentoCriado, error: null }),
            then: (resolve) => resolve({ count: 0, data: [], error: null }),
          });
        }
        if (table === "usuarios") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "admin-1" }, error: null }),
          });
        }
        if (table === "servico") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { nome_servico: "Lavagem", preco_base: 50, duracao_min: 30 }, error: null }),
          });
        }
        if (table === "veiculos") {
          return mockQuery({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { marca: "Fiat", modelo: "Uno", placa: "ABC-1234" }, error: null }),
          });
        }
        return mockQuery();
      });

      await processMessage(TENANT_ID, REMOTE_JID, "confirmar", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("confirmado")
      );
    });
  });

  describe("processMessage - atalhos numericos MENU_PRINCIPAL", () => {
    it("deve listar servicos ao digitar 1", async () => {
      const servicos = [
        { servico_id: 1, nome_servico: "Lavagem", preco_base: 50, duracao_min: 30 },
      ];

      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
        then: (resolve) => resolve({ data: servicos, error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "1", "João");

      expect(baileys.sendList).toHaveBeenCalled();
    });

    it("deve informar que nao tem agendamentos ao digitar 2 sem cliente", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "2", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("não possui agendamentos")
      );
    });

    it("deve listar servicos ao digitar 3", async () => {
      const servicos = [
        { servico_id: 1, nome_servico: "Lavagem", preco_base: 50, duracao_min: 30 },
      ];

      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
        then: (resolve) => resolve({ data: servicos, error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "3", "João");

      expect(baileys.sendList).toHaveBeenCalled();
    });

    it("deve informar que nao tem agendamentos ao digitar 4 sem cliente", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "4", "João");

      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("não possui agendamentos")
      );
    });

    it("deve notificar atendente ao digitar 5", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        maybeSingle: vi.fn().mockResolvedValue({ data: buildSession(), error: null }),
      }));

      await processMessage(TENANT_ID, REMOTE_JID, "5", "João");

      expect(notificacoes.criarNotificacao).toHaveBeenCalled();
      expect(baileys.sendWhatsAppMessage).toHaveBeenCalledWith(
        REMOTE_JID,
        expect.stringContaining("solicitação foi enviada")
      );
    });
  });

  describe("helpers - parseDateInput", () => {
    it("deve converter DDMMYYYY valido", () => {
      expect(parseDateInput("01072026")).toBe("2026-07-01");
    });

    it("deve rejeitar data com formato invalido", () => {
      expect(parseDateInput("99/99/9999")).toBeNull();
    });

    it("deve rejeitar data passada", () => {
      expect(parseDateInput("01012020")).toBeNull();
    });

    it("deve rejeitar texto sem numeros", () => {
      expect(parseDateInput("abc")).toBeNull();
    });
  });

  describe("helpers - validarAntecedenciaCancelamento", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-27T10:00:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("deve permitir cancelamento com mais de 2h de antecedencia", async () => {
      const result = await validarAntecedenciaCancelamento("2026-06-27", "14:00");
      expect(result).toBeNull();
    });

    it("deve bloquear cancelamento com menos de 2h de antecedencia", async () => {
      const result = await validarAntecedenciaCancelamento("2026-06-27", "11:00");
      expect(result).toContain("2 horas");
    });

    it("deve bloquear cancelamento de agendamento passado", async () => {
      const result = await validarAntecedenciaCancelamento("2026-06-26", "10:00");
      expect(result).toContain("já passou");
    });
  });

  describe("helpers - validarAgendamentoNaoIniciado", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-27T10:00:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("deve permitir cancelamento de agendamento pendente com antecedencia", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { status: "pendente", data_agendamento: "2026-06-27", hora_agendamento: "14:00" }, error: null }),
      }));

      const result = await validarAgendamentoNaoIniciado(1);
      expect(result).toBeNull();
    });

    it("deve bloquear cancelamento de agendamento finalizado", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { status: "finalizado" }, error: null }),
      }));

      const result = await validarAgendamentoNaoIniciado(1);
      expect(result).toContain("iniciado ou finalizado");
    });

    it("deve bloquear cancelamento de agendamento sem antecedencia", async () => {
      supabaseAdmin.from.mockReturnValue(mockQuery({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { status: "pendente", data_agendamento: "2026-06-27", hora_agendamento: "10:30" }, error: null }),
      }));

      const result = await validarAgendamentoNaoIniciado(1);
      expect(result).toContain("2 horas");
    });
  });
});
