import { describe, it, expect } from "vitest";
import { rotuloLegivelOpcao } from "../chatbot/mensagem.label.js";

function sessao(overrides = {}) {
  return { state: "MENU_PRINCIPAL", state_data: {}, ...overrides };
}

describe("rotuloLegivelOpcao", () => {
  it("mantém texto livre inalterado", () => {
    expect(rotuloLegivelOpcao("quero lavar meu carro", sessao())).toBe("quero lavar meu carro");
  });

  it("mantém vazio", () => {
    expect(rotuloLegivelOpcao("", sessao())).toBe("");
    expect(rotuloLegivelOpcao(null, sessao())).toBe("");
  });

  it("traduz comandos de controle", () => {
    expect(rotuloLegivelOpcao("0", sessao())).toBe("Voltou ao menu");
    expect(rotuloLegivelOpcao("voltar", sessao())).toBe("Voltou ao menu");
    expect(rotuloLegivelOpcao("reiniciar", sessao())).toBe("Reiniciou o fluxo");
    expect(rotuloLegivelOpcao("menu", sessao())).toBe("Menu / Reiniciar");
  });

  it("traduz botões do menu principal", () => {
    expect(rotuloLegivelOpcao("menu_agendar", sessao())).toBe("Menu: Agendar serviço");
    expect(rotuloLegivelOpcao("menu_consultar", sessao())).toBe("Menu: Meus Agendamentos");
    expect(rotuloLegivelOpcao("menu_cancelar", sessao())).toBe("Menu: Cancelar agendamento");
    expect(rotuloLegivelOpcao("menu_servicos", sessao())).toBe("Menu: Nossos serviços");
    expect(rotuloLegivelOpcao("menu_atendente", sessao())).toBe("Menu: Falar com atendente");
  });

  it("traduz seleção de serviço pela lista", () => {
    const session = sessao({
      state: "ESCOLHENDO_SERVICO",
      state_data: {
        servicos: [
          { servico_id: 18, nome_servico: "Lavagem Completa", preco_base: 80, duracao_min: 60 },
          { servico_id: 7, nome_servico: "Polimento", preco_base: 150, duracao_min: 120 },
        ],
      },
    });
    expect(rotuloLegivelOpcao("servico_18", session)).toBe("Escolheu serviço: Lavagem Completa");
    expect(rotuloLegivelOpcao("servico_7", session)).toBe("Escolheu serviço: Polimento");
  });

  it("usa fallback quando serviço não está na lista atual", () => {
    const session = sessao({
      state: "ESCOLHENDO_SERVICO",
      state_data: { servicos: [{ servico_id: 1, nome_servico: "Lavagem" }] },
    });
    expect(rotuloLegivelOpcao("servico_99", session)).toBe("Escolheu serviço: #99");
  });

  it("traduz seleção numérica de serviço", () => {
    const session = sessao({
      state: "ESCOLHENDO_SERVICO",
      state_data: { servicos: [{ servico_id: 18, nome_servico: "Lavagem Completa" }] },
    });
    expect(rotuloLegivelOpcao("1", session)).toBe("Escolheu serviço: Lavagem Completa");
  });

  it("não traduz número fora do contexto de lista", () => {
    expect(rotuloLegivelOpcao("1", sessao())).toBe("1");
  });

  it("traduz confirmação do serviço detectado", () => {
    const session = sessao({
      state: "MENU_PRINCIPAL",
      state_data: {
        aguardando_confirmacao_servico: true,
        servico_detectado: { servico_id: 1, nome_servico: "Lavagem Completa" },
      },
    });
    expect(rotuloLegivelOpcao("confirmar_servico", session)).toBe("Resposta: Sim, este (Lavagem Completa)");
    expect(rotuloLegivelOpcao("1", session)).toBe("Resposta: Sim, este (Lavagem Completa)");
    expect(rotuloLegivelOpcao("sim", session)).toBe("Resposta: Sim, este (Lavagem Completa)");
    expect(rotuloLegivelOpcao("trocar_servico", session)).toBe("Resposta: Escolher outro serviço");
    expect(rotuloLegivelOpcao("2", session)).toBe("Resposta: Escolher outro serviço");
    expect(rotuloLegivelOpcao("não", session)).toBe("Resposta: Escolher outro serviço");
  });

  it("traduz veículo pela lista", () => {
    const session = sessao({
      state: "ESCOLHENDO_VEICULO",
      state_data: {
        veiculos: [{ veiculo_id: 2, marca: "Fiat", modelo: "Uno", placa: "ABC-1234" }],
      },
    });
    expect(rotuloLegivelOpcao("veiculo_2", session)).toBe("Escolheu veículo: Fiat Uno (ABC-1234)");
    expect(rotuloLegivelOpcao("veiculo_novo", session)).toBe("Escolheu: Cadastrar novo veículo");
    expect(rotuloLegivelOpcao("1", session)).toBe("Escolheu veículo: Fiat Uno (ABC-1234)");
  });

  it("traduz marca e modelo escolhidos em lista", () => {
    expect(rotuloLegivelOpcao("marca_Fiat", sessao())).toBe("Escolheu marca: Fiat");
    expect(rotuloLegivelOpcao("marca_outra", sessao())).toBe("Escolheu: Outra marca (digitar)");
    expect(rotuloLegivelOpcao("modelo_Uno", sessao())).toBe("Escolheu modelo: Uno");
    expect(rotuloLegivelOpcao("modelo_outro", sessao())).toBe("Escolheu: Outro modelo (digitar)");
  });

  it("traduz etapas de digitação (cadastro de veículo e cliente)", () => {
    expect(rotuloLegivelOpcao("Fiat", sessao({ state: "DIGITANDO_VEICULO_MARCA" }))).toBe("Digitou marca: Fiat");
    expect(rotuloLegivelOpcao("Uno", sessao({ state: "DIGITANDO_VEICULO_MODELO" }))).toBe("Digitou modelo: Uno");
    expect(rotuloLegivelOpcao("ABC-1234", sessao({ state: "DIGITANDO_VEICULO_PLACA" }))).toBe("Digitou placa: ABC-1234");
    expect(rotuloLegivelOpcao("João Silva", sessao({ state: "DIGITANDO_NOME" }))).toBe("Nome: João Silva");
    expect(rotuloLegivelOpcao("5511999999999", sessao({ state: "DIGITANDO_TELEFONE" }))).toBe("Telefone: 5511999999999");
  });

  it("não trata 'menu' como controle quando está digitando o nome", () => {
    expect(rotuloLegivelOpcao("menu", sessao({ state: "DIGITANDO_NOME" }))).toBe("Nome: menu");
  });

  it("traduz data e horário", () => {
    expect(rotuloLegivelOpcao("data_2026-09-20", sessao())).toBe("Escolheu data: 20/09/2026");
    expect(rotuloLegivelOpcao("horario_10:00", sessao())).toBe("Escolheu horário: 10:00");
  });

  it("traduz horário numérico quando em ESCOLHENDO_HORARIO", () => {
    const session = sessao({
      state: "ESCOLHENDO_HORARIO",
      state_data: { horarios: ["10:00", "10:30"] },
    });
    expect(rotuloLegivelOpcao("2", session)).toBe("Escolheu horário: 10:30");
  });

  it("traduz escolha de agendamento para cancelar", () => {
    const session = sessao({
      state: "CANCELANDO_AGENDAMENTO",
      state_data: {
        agendamentos: [{ agendamento_id: 5, data_agendamento: "2026-09-20", hora_agendamento: "10:00" }],
      },
    });
    expect(rotuloLegivelOpcao("cancelar_5", session)).toBe("Escolheu cancelar: 20/09/2026 às 10:00");
  });

  it("traduz confirmação de agendamento", () => {
    expect(rotuloLegivelOpcao("confirmar", sessao({ state: "CONFIRMANDO_AGENDAMENTO" }))).toBe("Resposta: Confirmar");
    expect(rotuloLegivelOpcao("1", sessao({ state: "CONFIRMANDO_AGENDAMENTO" }))).toBe("Resposta: Confirmar");
    expect(rotuloLegivelOpcao("cancelar", sessao({ state: "CONFIRMANDO_AGENDAMENTO" }))).toBe("Resposta: Cancelar");
    expect(rotuloLegivelOpcao("2", sessao({ state: "CONFIRMANDO_AGENDAMENTO" }))).toBe("Resposta: Cancelar");
  });

  it("traduz confirmação de cancelamento", () => {
    expect(rotuloLegivelOpcao("confirmar_cancelamento", sessao({ state: "CONFIRMANDO_CANCELAMENTO" }))).toBe("Resposta: Confirmar cancelamento");
    expect(rotuloLegivelOpcao("cancelar", sessao({ state: "CONFIRMANDO_CANCELAMENTO" }))).toBe("Resposta: Não cancelar");
  });

  it("traduz respostas do fluxo de atendente", () => {
    expect(rotuloLegivelOpcao("voltar_bot", sessao())).toBe("Resposta: Voltar ao bot");
    expect(rotuloLegivelOpcao("continuar_atendente", sessao())).toBe("Resposta: Continuar com atendente");
    expect(rotuloLegivelOpcao("sim_atendente", sessao())).toBe("Resposta: Sim, quero atendente");
    expect(rotuloLegivelOpcao("nao_atendente", sessao())).toBe("Resposta: Não, continuar");
  });
});