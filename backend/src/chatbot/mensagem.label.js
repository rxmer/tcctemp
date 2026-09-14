const MENU_LABELS = {
  menu_agendar: "Menu: Agendar serviço",
  menu_consultar: "Menu: Meus Agendamentos",
  menu_cancelar: "Menu: Cancelar agendamento",
  menu_servicos: "Menu: Nossos serviços",
  menu_atendente: "Menu: Falar com atendente",
};

const CONTROLE_LABELS = {
  "0": "Voltou ao menu",
  voltar: "Voltou ao menu",
  menu: "Menu / Reiniciar",
  reset: "Reiniciou o fluxo",
  reiniciar: "Reiniciou o fluxo",
};

function formatarDataBr(iso) {
  const [y, m, d] = String(iso ?? "").split("-");
  if (!y || !m || !d) return null;
  return `${d}/${m}/${y}`;
}

function formatarAgendamento(ag) {
  const dataBr = formatarDataBr(ag?.data_agendamento) ?? ag?.data_agendamento ?? "—";
  return `${dataBr} às ${ag?.hora_agendamento ?? "—"}`;
}

function rotuloVeiculo(v) {
  return `${v.marca} ${v.modelo} (${v.placa})`;
}

function rotuloServico(lista, id) {
  const servico = (lista ?? []).find((s) => String(s.servico_id) === String(id));
  return servico ? servico.nome_servico : `#${id}`;
}

function rotuloVeiculoPorId(lista, id) {
  const veiculo = (lista ?? []).find((v) => String(v.veiculo_id) === String(id));
  return veiculo ? rotuloVeiculo(veiculo) : `#${id}`;
}

function rotuloCancelamento(lista, id) {
  const ag = (lista ?? []).find((a) => String(a.agendamento_id) === String(id));
  return ag ? formatarAgendamento(ag) : `#${id}`;
}

export function rotuloLegivelOpcao(texto, session) {
  const raw = String(texto ?? "").trim();
  if (!raw) return raw;

  const state = session?.state;
  const stateData = session?.state_data ?? {};

  const controleKey = raw.toLowerCase();
  if (state !== "DIGITANDO_NOME" && Object.prototype.hasOwnProperty.call(CONTROLE_LABELS, controleKey)) {
    return CONTROLE_LABELS[controleKey];
  }

  if (MENU_LABELS[raw]) return MENU_LABELS[raw];

  if (stateData.aguardando_confirmacao_servico) {
    const nome = stateData.servico_detectado?.nome_servico;
    if (raw === "confirmar_servico" || raw === "1" || raw.toLowerCase() === "sim") {
      return nome ? `Resposta: Sim, este (${nome})` : "Resposta: Sim, este";
    }
    if (raw === "trocar_servico" || raw === "2" || raw.toLowerCase() === "nao" || raw.toLowerCase() === "não") {
      return "Resposta: Escolher outro serviço";
    }
  }

  if (raw.startsWith("servico_")) {
    return `Escolheu serviço: ${rotuloServico(stateData.servicos, raw.replace("servico_", ""))}`;
  }

  if (raw === "veiculo_novo") return "Escolheu: Cadastrar novo veículo";

  if (raw.startsWith("veiculo_")) {
    return `Escolheu veículo: ${rotuloVeiculoPorId(stateData.veiculos, raw.replace("veiculo_", ""))}`;
  }

  if (raw.startsWith("marca_")) {
    const nome = raw.replace("marca_", "");
    return nome === "outra" ? "Escolheu: Outra marca (digitar)" : `Escolheu marca: ${nome}`;
  }

  if (raw.startsWith("modelo_")) {
    const nome = raw.replace("modelo_", "");
    return nome === "outro" ? "Escolheu: Outro modelo (digitar)" : `Escolheu modelo: ${nome}`;
  }

  if (raw.startsWith("data_")) {
    const iso = raw.replace("data_", "");
    const br = formatarDataBr(iso);
    return br ? `Escolheu data: ${br}` : `Escolheu data: ${iso}`;
  }

  if (raw.startsWith("horario_")) {
    return `Escolheu horário: ${raw.replace("horario_", "")}`;
  }

  if (raw.startsWith("cancelar_")) {
    return `Escolheu cancelar: ${rotuloCancelamento(stateData.agendamentos, raw.replace("cancelar_", ""))}`;
  }

  if (state === "ESCOLHENDO_SERVICO" && /^\d+$/.test(raw)) {
    const servico = (stateData.servicos ?? [])[parseInt(raw, 10) - 1];
    if (servico) return `Escolheu serviço: ${servico.nome_servico}`;
  }

  if (state === "ESCOLHENDO_VEICULO" && /^\d+$/.test(raw)) {
    const veiculo = (stateData.veiculos ?? [])[parseInt(raw, 10) - 1];
    if (veiculo) return `Escolheu veículo: ${rotuloVeiculo(veiculo)}`;
  }

  if (state === "ESCOLHENDO_HORARIO" && /^\d+$/.test(raw)) {
    const hora = (stateData.horarios ?? [])[parseInt(raw, 10) - 1];
    if (hora) return `Escolheu horário: ${hora}`;
  }

  if (state === "CANCELANDO_AGENDAMENTO" && /^\d+$/.test(raw)) {
    const ag = (stateData.agendamentos ?? [])[parseInt(raw, 10) - 1];
    if (ag) return `Escolheu cancelar: ${formatarAgendamento(ag)}`;
  }

  if (state === "CONFIRMANDO_AGENDAMENTO") {
    if (raw === "confirmar" || raw === "1") return "Resposta: Confirmar";
    if (raw === "cancelar" || raw === "2") return "Resposta: Cancelar";
  }

  if (state === "CONFIRMANDO_CANCELAMENTO") {
    if (raw === "confirmar_cancelamento" || raw === "confirmar" || raw === "1") return "Resposta: Confirmar cancelamento";
    if (raw === "cancelar" || raw === "2") return "Resposta: Não cancelar";
  }

  if (state === "DIGITANDO_NOME") return `Nome: ${raw}`;
  if (state === "DIGITANDO_TELEFONE") return `Telefone: ${raw}`;
  if (state === "DIGITANDO_VEICULO_MARCA") return `Digitou marca: ${raw}`;
  if (state === "DIGITANDO_VEICULO_MODELO") return `Digitou modelo: ${raw}`;
  if (state === "DIGITANDO_VEICULO_PLACA") return `Digitou placa: ${raw}`;

  if (raw === "voltar_bot") return "Resposta: Voltar ao bot";
  if (raw === "continuar_atendente") return "Resposta: Continuar com atendente";
  if (raw === "sim_atendente") return "Resposta: Sim, quero atendente";
  if (raw === "nao_atendente") return "Resposta: Não, continuar";

  return raw;
}