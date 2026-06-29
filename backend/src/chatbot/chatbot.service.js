import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../config/logger.js";
import { criarSessao, buscarSessao, atualizarSessao } from "./chatbot.session.js";
import { sendWhatsAppMessage, sendButtons, sendList } from "./baileys.client.js";
import { criarNotificacao } from "../services/notificacoes.service.js";
import { criarAgendamento, atualizarAgendamento, verificarDisponibilidade, buscarDuracaoServico } from "../services/agendamentos.service.js";

const messageLocks = new Map();
const empresaNomeCache = new Map();

async function getEmpresaNome(tenantId) {
  if (empresaNomeCache.has(tenantId)) return empresaNomeCache.get(tenantId);
  try {
    const { data } = await supabaseAdmin
      .from("configuracao_empresa")
      .select("nome_fantasia")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    const nome = data?.nome_fantasia || "Esteticar";
    empresaNomeCache.set(tenantId, nome);
    setTimeout(() => empresaNomeCache.delete(tenantId), 5 * 60 * 1000);
    return nome;
  } catch {
    return "Esteticar";
  }
}

function formatMoney(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const MARCAS_CARROS = {
  "Audi": ["A3", "A4", "Q3", "Q5", "Q7"],
  "BMW": ["320i", "X1", "X3", "X5", "X6"],
  "Chevrolet": ["Onix", "Prisma", "Cruze", "Tracker", "S10", "Spin", "Cobalt", "Camaro", "Equinox", "Montana"],
  "Citroën": ["C3", "C4 Cactus", "Aircross", "Berlingo"],
  "Fiat": ["Uno", "Mobi", "Argo", "Cronos", "Strada", "Toro", "Pulse", "Fastback", "Doblò", "Fiorino"],
  "Ford": ["Ka", "Fiesta", "Focus", "EcoSport", "Ranger", "Territory", "Mustang"],
  "Honda": ["Civic", "City", "Fit", "HR-V", "CR-V", "WR-V", "Accord"],
  "Hyundai": ["HB20", "Creta", "Tucson", "Santa Fe", "Azera", "i30", "Kona"],
  "Jeep": ["Renegade", "Compass", "Wrangler", "Cherokee", "Commander"],
  "Kia": ["Sportage", "Cerato", "Seltos", "Stonic", "Sorento"],
  "Mitsubishi": ["L200 Triton", "Pajero", "Outlander", "ASX", "Eclipse Cross"],
  "Nissan": ["Kicks", "Versa", "Sentra", "Frontier", "Leaf"],
  "Peugeot": ["208", "2008", "3008", "308"],
  "Renault": ["Kwid", "Sandero", "Logan", "Duster", "Captur", "ZOE"],
  "Toyota": ["Corolla", "Camry", "Yaris", "Hilux", "SW4", "Etios", "RAV4", "Corolla Cross"],
  "Volkswagen": ["Gol", "Voyage", "Polo", "Virtus", "T-Cross", "Nivus", "Taos", "Saveiro", "Amarok", "Jetta", "Passat", "Tiguan", "ID.4"],
  "Volvo": ["XC40", "XC60", "XC90", "S60", "V60"],
};

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const ERRO_MAXIMO = 3;
const ANTECEDENCIA_MINIMA_HORAS = 2;
const SESSION_TIMEOUT_MINUTOS = 30;

const VALID_TRANSITIONS = {
  "MENU_PRINCIPAL": ["ESCOLHENDO_SERVICO", "CONSULTANDO_AGENDAMENTOS", "CANCELANDO_AGENDAMENTO", "FALANDO_COM_ATENDENTE"],
  "ESCOLHENDO_SERVICO": ["ESCOLHENDO_DATA", "DIGITANDO_NOME", "DIGITANDO_VEICULO_MARCA", "ESCOLHENDO_VEICULO", "MENU_PRINCIPAL"],
  "DIGITANDO_NOME": ["DIGITANDO_TELEFONE", "ESCOLHENDO_VEICULO", "DIGITANDO_VEICULO_MARCA", "MENU_PRINCIPAL"],
  "DIGITANDO_TELEFONE": ["DIGITANDO_VEICULO_MARCA", "DIGITANDO_VEICULO_MARCA", "MENU_PRINCIPAL"],
  "ESCOLHENDO_VEICULO": ["ESCOLHENDO_DATA", "DIGITANDO_VEICULO_MARCA", "MENU_PRINCIPAL"],
  "DIGITANDO_VEICULO_MARCA": ["DIGITANDO_VEICULO_MODELO", "ESCOLHENDO_VEICULO", "MENU_PRINCIPAL"],
  "DIGITANDO_VEICULO_MODELO": ["DIGITANDO_VEICULO_PLACA", "DIGITANDO_VEICULO_MARCA", "MENU_PRINCIPAL"],
  "DIGITANDO_VEICULO_PLACA": ["ESCOLHENDO_DATA", "ESCOLHENDO_VEICULO", "MENU_PRINCIPAL"],
  "ESCOLHENDO_DATA": ["ESCOLHENDO_HORARIO", "ESCOLHENDO_VEICULO", "MENU_PRINCIPAL"],
  "ESCOLHENDO_HORARIO": ["CONFIRMANDO_AGENDAMENTO", "ESCOLHENDO_DATA", "MENU_PRINCIPAL"],
  "CONFIRMANDO_AGENDAMENTO": ["AGENDAMENTO_CONFIRMADO", "MENU_PRINCIPAL"],
  "AGENDAMENTO_CONFIRMADO": ["MENU_PRINCIPAL"],
  "CANCELANDO_AGENDAMENTO": ["CONFIRMANDO_CANCELAMENTO", "MENU_PRINCIPAL"],
  "CONFIRMANDO_CANCELAMENTO": ["MENU_PRINCIPAL"],
  "CONSULTANDO_AGENDAMENTOS": ["MENU_PRINCIPAL"],
  "FALANDO_COM_ATENDENTE": ["MENU_PRINCIPAL"],
};

async function validarTransicao(currentState, nextState) {
  const allowed = VALID_TRANSITIONS[currentState];
  if (!allowed) {
    logger.warn({ currentState, nextState }, "Estado atual não reconhecido");
    return false;
  }
  if (!allowed.includes(nextState)) {
    logger.warn({ currentState, nextState, allowed }, "Transição inválida bloqueada");
    return false;
  }
  return true;
}

async function transicaoState(sessionId, currentState, nextState, stateData = {}) {
  const valida = await validarTransicao(currentState, nextState);
  if (!valida) {
    logger.warn({ currentState, nextState, sessionId }, "Transição inválida ignorada");
    return false;
  }
  await atualizarSessao(sessionId, { state: nextState, state_data: stateData });
  return true;
}

async function verificarSessaoExpirada(session) {
  if (!session?.ultima_atividade) return false;
  const agora = new Date();
  const ultima = new Date(session.ultima_atividade);
  const diffMin = (agora - ultima) / (1000 * 60);
  return diffMin >= SESSION_TIMEOUT_MINUTOS;
}

function isAtLeast11Digits(num) {
  const digits = String(num).replace(/\D/g, "");
  return /^\d{11,13}$/.test(digits);
}

function extractPhone(remoteJid) {
  return remoteJid.replace(/@.*$/, "").replace(/\D/g, "");
}

function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 12 && digits.length <= 13;
}

function formatPhone(phone) {
  const d = String(phone).replace(/\D/g, "");
  if (d.length < 12) return phone;
  const ddd = d.slice(2, 4);
  const parte1 = d.slice(4, 9);
  const parte2 = d.slice(9, 13);
  return `(${ddd}) ${parte1}-${parte2}`;
}

function formatDateBr(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

async function listarServicos(tenantId) {
  const { data, error } = await supabaseAdmin
    .from("servico")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
    .is("deletado_em", null)
    .order("nome_servico");

  if (error) return [];
  return data;
}

async function listarClientePorTelefone(tenantId, phone) {
  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("telefone", phone)
    .is("deletado_em", null)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function listarVeiculosCliente(tenantId, clienteId) {
  const { data, error } = await supabaseAdmin
    .from("veiculos")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("cliente_id", clienteId)
    .is("deletado_em", null);

  if (error) return [];
  return data;
}

async function listarExpediente(tenantId, diaSemana) {
  const { data, error } = await supabaseAdmin
    .from("configuracao_expediente")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("dia_semana", diaSemana)
    .eq("ativo", true)
    .maybeSingle();

  if (error) return null;
  return data;
}

function converterHoraParaMinutos(horaStr) {
  const [h, m] = horaStr.split(":").map(Number);
  return h * 60 + m;
}

function converterMinutosParaHora(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function gerarHorariosDisponiveis(tenantId, data, servicoId = null) {
  const diaSemana = new Date(data + "T12:00:00").getDay();
  const expediente = await listarExpediente(tenantId, diaSemana);

  if (!expediente) return [];

  const [hAbertura, mAbertura] = expediente.abertura.split(":").map(Number);
  const [hFechamento, mFechamento] = expediente.fechamento.split(":").map(Number);

  let duracaoMin = 30;
  if (servicoId) {
    duracaoMin = await buscarDuracaoServico(tenantId, servicoId);
  }

  const inicioMin = hAbertura * 60 + mAbertura;
  const fimMin = hFechamento * 60 + mFechamento;

  const horarios = [];
  for (let t = inicioMin; t + duracaoMin <= fimMin; t += 30) {
    const horaStr = converterMinutosParaHora(t);
    horarios.push(horaStr);
  }

  const disponiveis = [];
  for (const hora of horarios) {
    const livre = await verificarDisponibilidade(tenantId, data, hora, servicoId);
    if (livre) disponiveis.push(hora);
  }

  return disponiveis;
}

async function gerarDatasDisponiveis(tenantId) {
  const datas = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  for (let i = 1; i <= 14; i++) {
    const data = new Date(hoje);
    data.setDate(data.getDate() + i);
    const diaSemana = data.getDay();
    const expediente = await listarExpediente(tenantId, diaSemana);
    if (expediente) {
      const y = data.getFullYear();
      const m = String(data.getMonth() + 1).padStart(2, "0");
      const d = String(data.getDate()).padStart(2, "0");
      datas.push(`${y}-${m}-${d}`);
    }
  }

  return datas;
}

async function criarClienteViaChatbot(tenantId, nome, telefone) {
  telefone = telefone.replace(/\D/g, "").trim();
  if (telefone.length < 12 || telefone.length > 13) return null;
  const { data, error } = await supabaseAdmin
    .from("clientes")
    .insert({ nome, telefone, tenant_id: tenantId })
    .select()
    .single();

  if (error) return null;
  return data;
}

async function criarVeiculoViaChat(tenantId, clienteId, marca, modelo, placa) {
  const { data: existing } = await supabaseAdmin
    .from("veiculos")
    .select("veiculo_id")
    .eq("placa", placa.toUpperCase())
    .eq("tenant_id", tenantId)
    .is("deletado_em", null)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabaseAdmin
    .from("veiculos")
    .insert({
      placa: placa.toUpperCase(),
      marca,
      modelo,
      cliente_id: clienteId,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) return null;
  return data;
}

async function criarAgendamentoViaChat(session, stateData) {
  if (!session.cliente_id || !stateData.veiculo_id || !stateData.servico_id || !stateData.data_agendamento || !stateData.hora_agendamento) return null;

  const disponivel = await verificarDisponibilidade(
    session.tenant_id,
    stateData.data_agendamento,
    stateData.hora_agendamento,
    stateData.servico_id
  );

  if (!disponivel) return { conflito: true };

  const { data: adminUser } = await supabaseAdmin
    .from("usuarios")
    .select("id")
    .eq("tenant_id", session.tenant_id)
    .limit(1)
    .maybeSingle();

  if (!adminUser?.id) return null;

  try {
    const data = await criarAgendamento({
      cliente_id: session.cliente_id,
      veiculo_id: stateData.veiculo_id,
      servico_id: stateData.servico_id,
      data_agendamento: stateData.data_agendamento,
      hora_agendamento: stateData.hora_agendamento,
      observacoes: "Criado via WhatsApp",
      tenantId: session.tenant_id,
      criadoPor: adminUser.id,
    });

    return data;
  } catch (err) {
    if (err.message && err.message.includes("conflita")) {
      return { conflito: true };
    }
    return null;
  }
}

async function listarAgendamentosCliente(tenantId, clienteId) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const { data, error } = await supabaseAdmin
    .from("agendamentos")
    .select("*, servico:servico(nome_servico, preco_base), veiculo:veiculos(marca, modelo, placa)")
    .eq("tenant_id", tenantId)
    .eq("cliente_id", clienteId)
    .is("deletado_em", null)
    .in("status", ["pendente", "confirmado"])
    .gte("data_agendamento", today)
    .order("data_agendamento")
    .order("hora_agendamento");

  if (error) return [];

  return (data ?? []).filter((a) => {
    if (a.data_agendamento === today) {
      return a.hora_agendamento >= currentTime;
    }
    return true;
  });
}

function gerarSectionsMarcas() {
  const marcas = Object.keys(MARCAS_CARROS).sort();
  const rows = marcas.map((m) => ({
    title: m,
    rowId: `marca_${m}`,
  }));
  rows.push({ title: "Outra marca", description: "Digitar manualmente", rowId: "marca_outra" });
  return [{ title: "Selecione a marca", rows }];
}

function gerarSectionsModelos(marca) {
  const modelos = MARCAS_CARROS[marca];
  if (!modelos?.length) return null;
  const rows = modelos.map((m) => ({ title: m, rowId: `modelo_${m}` }));
  rows.push({ title: "Outro modelo", description: "Digitar manualmente", rowId: "modelo_outro" });
  return [{ title: `Modelos ${marca}`, rows }];
}

function gerarSectionsDatas(datas) {
  const meses = {};
  for (const data of datas) {
    const [y, m, d] = data.split("-").map(Number);
    const chave = `${y}-${String(m).padStart(2, "0")}`;
    if (!meses[chave]) meses[chave] = [];
    const dataObj = new Date(y, m - 1, d);
    meses[chave].push({
      title: `${DIAS_SEMANA_CURTO[dataObj.getDay()]}, ${d}/${m}/${y}`,
      description: "Disponível",
      rowId: `data_${data}`,
    });
  }
  return Object.entries(meses).map(([chave, rows]) => {
    const [y, m] = chave.split("-").map(Number);
    return { title: `${MESES[m - 1]} ${y}`, rows };
  });
}

function gerarButtonsDatas(datas) {
  return datas.map((data) => {
    const [y, m, d] = data.split("-").map(Number);
    const dataObj = new Date(y, m - 1, d);
    return { id: `data_${data}`, text: `${DIAS_SEMANA_CURTO[dataObj.getDay()]} ${d}/${m}` };
  });
}

async function sendMenu(jid, session) {
  const empresaNome = await getEmpresaNome(session.tenant_id);
  const phone = extractPhone(session.remote_jid);
  const cliente = await listarClientePorTelefone(session.tenant_id, phone);
  let temAgendamento = false;

  if (cliente) {
    const agendamentos = await listarAgendamentosCliente(session.tenant_id, cliente.cliente_id);
    temAgendamento = agendamentos.length > 0;
  }

  const botoes = temAgendamento
    ? [
        { id: "menu_consultar", text: "📋 Meus Agendamentos" },
        { id: "menu_agendar", text: "📅 Novo Agendamento" },
        { id: "menu_cancelar", text: "❌ Cancelar" },
        { id: "menu_atendente", text: "👤 Atendente" },
      ]
    : [
        { id: "menu_agendar", text: "📅 Agendar Serviço" },
        { id: "menu_servicos", text: "✨ Nossos Serviços" },
        { id: "menu_atendente", text: "👤 Falar com Atendente" },
      ];

  await sendButtons(jid, `🚗 *${empresaNome}* — Como posso ajudar?`, botoes, empresaNome);
  await atualizarSessao(session.id, { state: "MENU_PRINCIPAL", state_data: {} });
}

function detectNaturalLanguage(text) {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const greetings = ["oi", "ola", "oie", "bom dia", "boa tarde", "boa noite", "hey", "e ai", "e aí", "fala", "opa", "salve", "tudo bem", "tudo bom", "beleza", "iae", "eae"];
  const farewells = ["tchau", "ate mais", "até mais", "xau", "falou", "flw", "valeu"];
  const thanks = ["obrigado", "obrigada", "brigado", "brigada", "muito obrigado", "muito obrigada"];
  const resets = ["reiniciar", "reset", "recomeçar", "zerar"];

  if (greetings.some((g) => lower === g || lower.startsWith(g + " ") || lower.endsWith(" " + g) || lower.includes(" " + g + " "))) return "SAUDACAO";
  if (resets.some((r) => lower.includes(r))) return "RESET";
  if (farewells.some((f) => lower.includes(f))) return "DESPEDIDA";
  if (thanks.some((t) => lower.includes(t))) return "THANKS";
  return null;
}

export function parseDateInput(text) {
  const clean = text.replace(/\D/g, "");
  let dataStr = null;

  if (clean.length === 8) {
    const d = clean.substring(0, 2);
    const m = clean.substring(2, 4);
    const y = clean.substring(4, 8);
    dataStr = `${y}-${m}-${d}`;
  } else if (clean.length === 6) {
    const d = clean.substring(0, 2);
    const m = clean.substring(2, 4);
    const y = new Date().getFullYear();
    dataStr = `${y}-${m}-${d}`;
  }

  if (!dataStr) return null;

  const parsed = new Date(dataStr + "T12:00:00");
  if (isNaN(parsed.getTime())) return null;

  const [y, m, d] = dataStr.split("-").map(Number);
  if (parsed.getFullYear() !== y || parsed.getMonth() + 1 !== m || parsed.getDate() !== d) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (parsed < hoje) return null;

  return dataStr;
}

async function detectServiceIntent(text, tenantId) {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const servicos = await listarServicos(tenantId);
  if (!servicos.length) return null;

  for (const s of servicos) {
    const nome = s.nome_servico.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (lower.includes(nome)) return s;
  }

  const keywords = {
    "lavagem": ["lavar", "lava", "lavagem", "lavação", "lavaçao"],
    "polimento": ["polir", "polimento", "polido", "poliment"],
    "cristalização": ["cristalizar", "cristalizacao", "cristalização", "cristal"],
    "higienização": ["higienizar", "higienizacao", "higienização", "limpeza", "limpar", "aspirar"],
    "enceramento": ["encerar", "enceramento", "cera"],
  };

  for (const [key, words] of Object.entries(keywords)) {
    if (words.some((w) => lower.includes(w))) {
      const match = servicos.find((s) =>
        s.nome_servico.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(key)
      );
      if (match) return match;
    }
  }

  return null;
}

/* ===================================================================
   VALIDAÇÕES DE NEGÓCIO
   =================================================================== */

async function validarDisponibilidadeImediata(tenantId, data, hora, servicoId = null) {
  const disponivel = await verificarDisponibilidade(tenantId, data, hora, servicoId);
  if (!disponivel) return "Este horário foi ocupado enquanto você escolhia. Por favor, selecione outro horário.";
  return null;
}

async function validarHorarioExpediente(tenantId, data, hora) {
  const diaSemana = new Date(data + "T12:00:00").getDay();
  const expediente = await listarExpediente(tenantId, diaSemana);
  if (!expediente) return "Data fora do expediente.";
  return null;
}

const ESTADOS_RECUPERAVEIS = [
  "ESCOLHENDO_SERVICO", "DIGITANDO_NOME", "DIGITANDO_TELEFONE",
  "ESCOLHENDO_VEICULO", "DIGITANDO_VEICULO_MARCA", "DIGITANDO_VEICULO_MODELO",
  "DIGITANDO_VEICULO_PLACA", "ESCOLHENDO_DATA", "ESCOLHENDO_HORARIO",
  "CONFIRMANDO_AGENDAMENTO",
];

async function montarMensagemRecuperacao(session) {
  const stateData = session.state_data ?? {};
  const servicoNome = stateData.servicoInfo?.nome_servico || stateData.servicoNome || "";
  const dataStr = stateData.data_agendamento ? formatDateBr(stateData.data_agendamento) : "";

  let msg = "👋 Bem-vindo de volta! ";
  if (servicoNome && dataStr) {
    msg += `Você estava agendando *${servicoNome}* para o dia *${dataStr}*.\n\nDeseja continuar de onde parou?`;
  } else if (servicoNome) {
    msg += `Você estava escolhendo o serviço *${servicoNome}*.\n\nDeseja continuar?`;
  } else if (dataStr) {
    msg += `Você estava selecionando horário para o dia *${dataStr}*.\n\nDeseja continuar?`;
  } else {
    return null;
  }
  return msg;
}

export async function validarAntecedenciaCancelamento(dataAgendamento, horaAgendamento) {
  const dataHora = new Date(`${dataAgendamento}T${horaAgendamento}`);
  const agora = new Date();
  const diffHoras = (dataHora.getTime() - agora.getTime()) / (1000 * 60 * 60);

  if (diffHoras < 0) return "Este agendamento já passou.";
  if (diffHoras < ANTECEDENCIA_MINIMA_HORAS) {
    return `Não é possível cancelar com menos de ${ANTECEDENCIA_MINIMA_HORAS} horas de antecedência. Entre em contato com a estética.`;
  }
  return null;
}

export async function validarAgendamentoNaoIniciado(agendamentoId, tenantId) {
  const { data, error } = await supabaseAdmin
    .from("agendamentos")
    .select("status, data_agendamento, hora_agendamento")
    .eq("agendamento_id", agendamentoId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) return "Agendamento não encontrado.";
  if (data.status === "em_andamento" || data.status === "finalizado") {
    return "Este agendamento já foi iniciado ou finalizado e não pode ser cancelado.";
  }

  const erroAntecedencia = await validarAntecedenciaCancelamento(data.data_agendamento, data.hora_agendamento);
  if (erroAntecedencia) return erroAntecedencia;

  return null;
}

/* ===================================================================
   CONSULTANDO_AGENDAMENTOS
   =================================================================== */

async function handleConsultandoAgendamentos(action, jid, session) {
  const phone = extractPhone(session.remote_jid);
  const cliente = await listarClientePorTelefone(session.tenant_id, phone);

  if (!cliente) {
    await sendWhatsAppMessage(jid, "Você ainda não possui agendamentos. Utilize o menu para agendar um serviço.");
    await sendMenu(jid, session);
    return;
  }

  const agendamentos = await listarAgendamentosCliente(session.tenant_id, cliente.cliente_id);
  if (!agendamentos.length) {
    await sendWhatsAppMessage(jid, "Você não possui agendamentos futuros. Deseja agendar um serviço? Use o menu abaixo:");
    await sendMenu(jid, session);
    return;
  }

  let msg = "*Seus agendamentos futuros:*\n\n";
  for (const a of agendamentos) {
    msg += `📅 ${formatDateBr(a.data_agendamento)} às ${a.hora_agendamento}\n`;
    msg += `🔧 ${a.servico?.nome_servico ?? "Serviço"}\n`;
    msg += `📍 ${a.status === "confirmado" ? "✅ Confirmado" : a.status === "pendente" ? "⏳ Pendente" : "❌ Cancelado"}\n\n`;
  }

  await sendWhatsAppMessage(jid, msg);
  await sendWhatsAppMessage(jid, "Para agendar um novo serviço ou cancelar, utilize o menu abaixo.");
  await sendMenu(jid, session);
}

/* ===================================================================
   MENU PRINCIPAL
   =================================================================== */

async function handleMenuPrincipal(action, jid, session) {
  const num = action.trim();
  if (num >= "1" && num <= "5") {
    const phone = extractPhone(session.remote_jid);
    const cliente = await listarClientePorTelefone(session.tenant_id, phone);
    let temAgendamento = false;
    if (cliente) {
      const ags = await listarAgendamentosCliente(session.tenant_id, cliente.cliente_id);
      temAgendamento = ags.length > 0;
    }

    const idx = parseInt(num, 10);
    const opcoes = temAgendamento
      ? ["menu_consultar", "menu_agendar", "menu_cancelar", "menu_atendente"]
      : ["menu_agendar", "menu_servicos", "menu_atendente"];

    if (idx >= 1 && idx <= opcoes.length) {
      action = opcoes[idx - 1];
    }
  }

  switch (action) {

    case "menu_agendar": {
      const servicos = await listarServicos(session.tenant_id);
      if (!servicos.length) {
    await sendWhatsAppMessage(jid, "Nenhum serviço disponível no momento.");
    await sendMenu(jid, session);
        return;
      }

      const rows = servicos.map((s, i) => ({
        title: `${i + 1}. ${s.nome_servico}`,
        description: `${formatMoney(s.preco_base)} — ${s.duracao_min} min`,
        rowId: `servico_${s.servico_id}`,
      }));

      await sendList(jid, "*Selecione o serviço desejado:*", "Ver Serviços", [{ title: "Serviços", rows }], "Esteticar");
      await atualizarSessao(session.id, { state: "ESCOLHENDO_SERVICO", state_data: { servicos } });
      return;
    }

    case "menu_consultar": {
      await transicaoState(session.id, session.state, "CONSULTANDO_AGENDAMENTOS");
      await handleConsultandoAgendamentos(action, jid, session);
      return;
    }

    case "menu_servicos": {
      const servicos = await listarServicos(session.tenant_id);
      if (!servicos.length) {
        await sendWhatsAppMessage(jid, "Nenhum serviço disponível no momento.");
      } else {
        const rows = servicos.map((s) => ({
          title: s.nome_servico,
          description: `${formatMoney(s.preco_base)} — ${s.duracao_min} min`,
          rowId: `servico_${s.servico_id}`,
        }));
        await sendList(jid, "*✨ Serviços disponíveis:*\nToque em um serviço para agendar", "Ver Serviços", [{ title: "Serviços", rows }], "Esteticar");
        await atualizarSessao(session.id, { state: "ESCOLHENDO_SERVICO", state_data: { servicos } });
        return;
      }
      await sendMenu(jid, session);
      return;
    }

    case "menu_cancelar": {
      const phone = extractPhone(session.remote_jid);
      const cliente = await listarClientePorTelefone(session.tenant_id, phone);

      if (!cliente) {
        await sendWhatsAppMessage(jid, "Você não possui agendamentos para cancelar.");
        await sendMenu(jid, session);
        return;
      }

      const agendamentos = await listarAgendamentosCliente(session.tenant_id, cliente.cliente_id);
      if (!agendamentos.length) {
        await sendWhatsAppMessage(jid, "Você não possui agendamentos futuros para cancelar.");
        await sendMenu(jid, session);
        return;
      }

      const rows = agendamentos.map((a) => ({
        title: `${formatDateBr(a.data_agendamento)} às ${a.hora_agendamento}`,
        description: a.servico?.nome_servico ?? "Serviço",
        rowId: `cancelar_${a.agendamento_id}`,
      }));

      await sendList(jid, "*Selecione o agendamento que deseja cancelar:*", "Ver Agendamentos", [{ title: "Agendamentos", rows }], "Esteticar");
      await atualizarSessao(session.id, { state: "CANCELANDO_AGENDAMENTO", state_data: { agendamentos } });
      return;
    }

    case "menu_atendente": {
      criarNotificacao({
        tenantId: session.tenant_id,
        tipo: "chatbot_atendente",
        titulo: "Cliente solicita atendente",
        mensagem: `Cliente ${session.client_name} (${extractPhone(session.remote_jid)}) está solicitando falar com um atendente pelo WhatsApp.`,
        referenciaTipo: "chatbot",
        referenciaId: session.id,
      }).catch(() => {});

      await atualizarSessao(session.id, { state: "FALANDO_COM_ATENDENTE", state_data: {} });
      await sendWhatsAppMessage(jid, "Sua solicitação foi enviada! Em breve um atendente entrará em contato.");
      return;
    }

    default: {
      await sendWhatsAppMessage(jid, "Opção inválida. Utilize o menu abaixo para navegar.");
      await sendMenu(jid, session);
      return false;
    }
  }
}

/* ===================================================================
   ESCOLHENDO_SERVICO → cliente/veículo → data
   =================================================================== */

async function handleEscolhendoServico(action, jid, session) {
  const stateData = session.state_data ?? {};
  const servicos = stateData.servicos ?? [];
  let servico = null;

  if (action.startsWith("servico_")) {
    const servicoId = action.replace("servico_", "");
    servico = servicos.find((s) => String(s.servico_id) === servicoId);
  } else {
    const idx = parseInt(action, 10) - 1;
    if (!isNaN(idx) && idx >= 0 && idx < servicos.length) {
      servico = servicos[idx];
    }
  }

  if (!servico) {
    await sendWhatsAppMessage(jid, "Opção inválida. Selecione um serviço da lista.");
    return false;
  }

  const phone = extractPhone(session.remote_jid);
  let cliente = await listarClientePorTelefone(session.tenant_id, phone);

  if (!cliente) {
    if (phone.length >= 10 && isValidPhone(phone)) {
      const nome = session.client_name || "Cliente";
      if (nome.length >= 2) {
        cliente = await criarClienteViaChatbot(session.tenant_id, nome, phone);
        if (cliente) {
          await sendWhatsAppMessage(jid, `✅ Cliente *${nome}* identificado!`);
        }
      }
    }
  }

  if (!cliente) {
    await sendWhatsAppMessage(jid, `Para agendar *${servico.nome_servico}*, preciso do seu nome completo:`);
    await atualizarSessao(session.id, {
      state: "DIGITANDO_NOME",
      state_data: { servico_id: servico.servico_id, telefone_invalido: !isValidPhone(phone) },
    });
    return;
  }

  await atualizarSessao(session.id, { cliente_id: cliente.cliente_id });
  const veiculos = await listarVeiculosCliente(session.tenant_id, cliente.cliente_id);

  if (!veiculos.length) {
    const sections = gerarSectionsMarcas();
    await sendList(jid, "Selecione a *marca* do veículo:", "Ver Marcas", sections, "Esteticar");
    await atualizarSessao(session.id, {
      state: "DIGITANDO_VEICULO_MARCA",
      state_data: { servico_id: servico.servico_id, cliente_id: cliente.cliente_id },
    });
    return;
  }

  const rows = veiculos.map((v) => ({
    title: `${v.marca} ${v.modelo}`,
    description: v.placa,
    rowId: `veiculo_${v.veiculo_id}`,
  }));
  rows.push({ title: "Cadastrar novo veículo", description: "Informar dados de outro veículo", rowId: "veiculo_novo" });

  await sendList(jid, "*Selecione o veículo:*", "Ver Veículos", [{ title: "Veículos", rows }], "Esteticar");
  await atualizarSessao(session.id, {
    state: "ESCOLHENDO_VEICULO",
    state_data: { servico_id: servico.servico_id, veiculos },
  });
}

/* ===================================================================
   ESCOLHENDO_VEICULO
   =================================================================== */

async function handleEscolhendoVeiculo(action, jid, session) {
  const stateData = session.state_data ?? {};
  const veiculos = stateData.veiculos ?? [];

  if (action === "veiculo_novo") {
    const sections = gerarSectionsMarcas();
    await sendList(jid, "Selecione a *marca* do veículo:", "Ver Marcas", sections, "Esteticar");
    await atualizarSessao(session.id, {
      state: "DIGITANDO_VEICULO_MARCA",
      state_data: { servico_id: stateData.servico_id },
    });
    return;
  }

  let veiculo = null;

  if (action.startsWith("veiculo_")) {
    const veiculoId = action.replace("veiculo_", "");
    veiculo = veiculos.find((v) => String(v.veiculo_id) === veiculoId);
  } else {
    const idx = parseInt(action, 10) - 1;
    if (!isNaN(idx) && idx >= 0 && idx < veiculos.length) {
      veiculo = veiculos[idx];
    } else if (idx === veiculos.length) {
      const sections = gerarSectionsMarcas();
      await sendList(jid, "Selecione a *marca* do veículo:", "Ver Marcas", sections, "Esteticar");
      await atualizarSessao(session.id, {
        state: "DIGITANDO_VEICULO_MARCA",
        state_data: { servico_id: stateData.servico_id },
      });
      return;
    }
  }

  if (!veiculo) {
    await sendWhatsAppMessage(jid, "Opção inválida. Selecione um veículo da lista.");
    return false;
  }

  await irParaData(jid, session, { ...stateData, veiculo_id: veiculo.veiculo_id });
}

/* ===================================================================
   DATA
   =================================================================== */

async function irParaData(jid, session, stateData) {
  const datas = await gerarDatasDisponiveis(session.tenant_id);
  if (!datas.length) {
    await sendWhatsAppMessage(jid, "Não há datas disponíveis no momento.");
    await sendMenu(jid, session);
    return false;
  }
  const buttons = gerarButtonsDatas(datas);
  await sendButtons(jid, "*📅 Selecione a data desejada:*", buttons, "Esteticar");
  await atualizarSessao(session.id, {
    state: "ESCOLHENDO_DATA",
    state_data: { ...stateData, datas_disponiveis: datas },
  });
  return true;
}

async function handleEscolhendoData(action, jid, session) {
  const stateData = session.state_data ?? {};
  let dataFormatada = null;

  if (action.startsWith("data_")) {
    dataFormatada = action.replace("data_", "");
  } else {
    dataFormatada = parseDateInput(action);
  }

  let datas = stateData.datas_disponiveis ?? [];

  if (!datas.length && !dataFormatada) {
    datas = await gerarDatasDisponiveis(session.tenant_id);
    if (!datas.length) {
      await sendWhatsAppMessage(jid, "Não há datas disponíveis no momento.");
      await sendMenu(jid, session);
      return;
    }
    await sendButtons(jid, "*📅 Selecione a data desejada:*", gerarButtonsDatas(datas), "Esteticar");
    await atualizarSessao(session.id, { state: "ESCOLHENDO_DATA", state_data: { ...stateData, datas_disponiveis: datas } });
    return;
  }

  if (!dataFormatada) {
    if (datas.length > 0) {
      await sendButtons(jid, "*📅 Selecione a data desejada:*", gerarButtonsDatas(datas), "Esteticar");
      return;
    }
    await sendWhatsAppMessage(jid, "Selecione uma data válida.");
    return false;
  }

  if (datas.length > 0 && !datas.includes(dataFormatada)) {
    await sendWhatsAppMessage(jid, "Data não disponível. Selecione uma abaixo:");
    await sendButtons(jid, "*📅 Datas disponíveis:*", gerarButtonsDatas(datas), "Esteticar");
    return;
  }

  const erroExpediente = await validarHorarioExpediente(session.tenant_id, dataFormatada, "12:00");
  if (erroExpediente) {
    await sendWhatsAppMessage(jid, "Data fora do expediente. Escolha outra data.");
    return;
  }

  const horarios = await gerarHorariosDisponiveis(session.tenant_id, dataFormatada, stateData.servico_id);
  if (!horarios.length) {
    await sendWhatsAppMessage(jid, "Não há horários disponíveis nesta data. Escolha outra data.");
    return;
  }

  const dataObj = new Date(dataFormatada + "T12:00:00");
  const horariosButtons = horarios.map((h) => ({ id: `horario_${h}`, text: h }));

  await sendButtons(jid,
    `📅 *${formatDateBr(dataFormatada)} (${DIAS_SEMANA[dataObj.getDay()]})*\n\nSelecione o horário:`,
    horariosButtons, "Esteticar"
  );

  await atualizarSessao(session.id, {
    state: "ESCOLHENDO_HORARIO",
    state_data: { ...stateData, data_agendamento: dataFormatada, horarios },
  });
}

/* ===================================================================
   HORÁRIO → CONFIRMAÇÃO
   =================================================================== */

async function handleEscolhendoHorario(action, jid, session) {
  const stateData = session.state_data ?? {};
  const horarios = stateData.horarios ?? [];
  let hora = null;

  if (action.startsWith("horario_")) {
    hora = action.replace("horario_", "");
  } else {
    const idx = parseInt(action, 10) - 1;
    if (!isNaN(idx) && idx >= 0 && idx < horarios.length) {
      hora = horarios[idx];
    }
  }

  if (!hora) {
    await sendWhatsAppMessage(jid, "Opção inválida. Selecione um horário da lista.");
    return false;
  }

  const erroDisponivel = await validarDisponibilidadeImediata(session.tenant_id, stateData.data_agendamento, hora, stateData.servico_id);
  if (erroDisponivel) {
    const horariosAtualizados = await gerarHorariosDisponiveis(session.tenant_id, stateData.data_agendamento, stateData.servico_id);
    if (!horariosAtualizados.length) {
      await sendWhatsAppMessage(jid, "Não há mais horários disponíveis nesta data.");
      await sendMenu(jid, session);
      return;
    }
    const horariosButtons = horariosAtualizados.map((h) => ({ id: `horario_${h}`, text: h }));
    await sendButtons(jid, "🔄 *Horários atualizados*\nSelecione o novo horário:", horariosButtons, "Esteticar");
    await atualizarSessao(session.id, { state: "ESCOLHENDO_HORARIO", state_data: { ...stateData, horarios: horariosAtualizados } });
    return;
  }

  const { data: servicoInfo } = await supabaseAdmin
    .from("servico")
    .select("nome_servico, preco_base, duracao_min")
    .eq("servico_id", stateData.servico_id)
    .single();

  const { data: veiculoInfo } = await supabaseAdmin
    .from("veiculos")
    .select("marca, modelo, placa")
    .eq("veiculo_id", stateData.veiculo_id)
    .single();

  const summary =
    `📋 *Resumo do agendamento*\n\n` +
    `🚗 Veículo: ${veiculoInfo ? `${veiculoInfo.marca} ${veiculoInfo.modelo} (${veiculoInfo.placa})` : "—"}\n` +
    `🔧 Serviço: ${servicoInfo?.nome_servico ?? "Serviço"}\n` +
    `💰 Valor: ${formatMoney(servicoInfo?.preco_base ?? 0)}\n` +
    `⏱ Duração: ${servicoInfo?.duracao_min ?? "—"} min\n` +
    `📅 Data: ${formatDateBr(stateData.data_agendamento)}\n` +
    `🕒 Horário: ${hora}\n\n` +
    `Confirma o agendamento?`;

  await sendButtons(jid, summary, [
    { id: "confirmar", text: "✅ Confirmar" },
    { id: "cancelar", text: "❌ Cancelar" },
  ], "Esteticar");

  await atualizarSessao(session.id, {
    state: "CONFIRMANDO_AGENDAMENTO",
    state_data: { ...stateData, hora_agendamento: hora, servicoInfo, veiculoInfo },
  });
}

/* ===================================================================
   CONFIRMANDO_AGENDAMENTO → AGENDAMENTO_CONFIRMADO
   =================================================================== */

async function handleConfirmandoAgendamento(action, jid, session) {
  const stateData = session.state_data ?? {};

  if (action === "cancelar" || action === "2") {
    await sendWhatsAppMessage(jid, "❌ Agendamento cancelado.");
    await sendMenu(jid, session);
    return;
  }

  if (action !== "confirmar" && action !== "1") {
    await sendWhatsAppMessage(jid, "Responda 1 para confirmar ou 2 para cancelar.");
    return false;
  }

  if (!stateData.data_agendamento || !stateData.hora_agendamento || !stateData.veiculo_id || !stateData.servico_id) {
    await sendWhatsAppMessage(jid, "❌ Dados do agendamento incompletos. Voltando ao menu.");
    await sendMenu(jid, session);
    return;
  }

  const erroDisponivel = await validarDisponibilidadeImediata(
    session.tenant_id, stateData.data_agendamento, stateData.hora_agendamento, stateData.servico_id
  );

  if (erroDisponivel) {
    await sendWhatsAppMessage(jid, "⚠️ Este horário foi ocupado enquanto você confirmava. Voltando ao menu.");
    await sendMenu(jid, session);
    return;
  }

  const result = await criarAgendamentoViaChat(session, stateData);

  if (!result || result.conflito) {
    await sendWhatsAppMessage(jid, "❌ Erro ao criar agendamento. Tente novamente.");
    await sendMenu(jid, session);
    return;
  }

  const nomeServico = stateData.servicoInfo?.nome_servico ?? result.servico?.nome_servico ?? "Serviço";
  const valor = stateData.servicoInfo?.preco_base ?? result.servico?.preco_base ?? 0;
  const veiculoStr = stateData.veiculoInfo
    ? `${stateData.veiculoInfo.marca} ${stateData.veiculoInfo.modelo} (${stateData.veiculoInfo.placa})`
    : "—";

  const confirmMsg =
    `✅ *Agendamento confirmado com sucesso!*\n\n` +
    `🔧 Serviço: ${nomeServico}\n` +
    `💰 Valor: ${formatMoney(valor)}\n` +
    `🚗 Veículo: ${veiculoStr}\n` +
    `📅 Data: ${formatDateBr(result.data_agendamento)}\n` +
    `🕒 Horário: ${result.hora_agendamento}\n\n` +
    `Se precisar alterar ou cancelar, utilize a opção "Consultar" no menu.`;

  await atualizarSessao(session.id, {
    state: "AGENDAMENTO_CONFIRMADO",
    state_data: { agendamento_id: result.agendamento_id },
  });

  await sendWhatsAppMessage(jid, confirmMsg);

  await sendMenu(jid, session);
}

/* ===================================================================
   CANCELANDO_AGENDAMENTO
   =================================================================== */

async function handleCancelandoAgendamento(action, jid, session) {
  const stateData = session.state_data ?? {};
  const agendamentos = stateData.agendamentos ?? [];
  let agendamento = null;

  if (action.startsWith("cancelar_")) {
    const agendamentoId = action.replace("cancelar_", "");
    agendamento = agendamentos.find((a) => String(a.agendamento_id) === agendamentoId);
  } else {
    const idx = parseInt(action, 10) - 1;
    if (!isNaN(idx) && idx >= 0 && idx < agendamentos.length) {
      agendamento = agendamentos[idx];
    }
  }

  if (!agendamento) {
    await sendWhatsAppMessage(jid, "Agendamento não encontrado.");
    await sendMenu(jid, session);
    return false;
  }

  const msg =
    `Tem certeza que deseja *cancelar* o agendamento?\n\n` +
    `📅 ${formatDateBr(agendamento.data_agendamento)} às ${agendamento.hora_agendamento}\n` +
    `✨ ${agendamento.servico?.nome_servico ?? "Serviço"}`;

  await sendButtons(jid, msg, [
    { id: "confirmar_cancelamento", text: "✅ Sim, cancelar" },
    { id: "cancelar", text: "❌ Não, voltar" },
  ], "Esteticar");

  await atualizarSessao(session.id, {
    state: "CONFIRMANDO_CANCELAMENTO",
    state_data: { agendamento_id: agendamento.agendamento_id },
  });
}

async function handleConfirmandoCancelamento(action, jid, session) {
  const stateData = session.state_data ?? {};

  if (action === "cancelar" || action === "2") {
    await sendWhatsAppMessage(jid, "Cancelamento não realizado.");
    await sendMenu(jid, session);
    return;
  }

  if (action !== "confirmar_cancelamento" && action !== "confirmar" && action !== "1") {
    await sendWhatsAppMessage(jid, "Responda 1 para confirmar o cancelamento ou 2 para voltar.");
    return false;
  }

  try {
    await atualizarAgendamento(stateData.agendamento_id, session.tenant_id, { status: "cancelado" });
  } catch (err) {
    await sendWhatsAppMessage(jid, err.message || "Erro ao cancelar agendamento. Tente novamente.");
    await sendMenu(jid, session);
    return;
  }

  await sendWhatsAppMessage(jid, "✅ *Cancelamento realizado com sucesso!*\n\nSeu agendamento foi cancelado conforme solicitado.");
  await sendMenu(jid, session);
}

/* ===================================================================
   FALANDO_COM_ATENDENTE
   =================================================================== */

async function handleFalandoComAtendente(action, jid, session) {
  criarNotificacao({
    tenantId: session.tenant_id,
    tipo: "chatbot_mensagem_cliente",
    titulo: `Mensagem de ${session.client_name || "Cliente"}`,
    mensagem: `Cliente enviou via WhatsApp: "${action}"`,
    referenciaTipo: "chatbot",
    referenciaId: session.id,
  }).catch(() => {});
  await sendWhatsAppMessage(jid, "Sua mensagem foi encaminhada ao atendente. Em breve vamos responder.");
}

/* ===================================================================
   DATA COLLECTION SUB-STATES
   =================================================================== */

async function handleDigitandoNome(action, jid, session) {
  const stateData = session.state_data ?? {};
  const nome = action.trim();

  if (nome.length < 2) {
    await sendWhatsAppMessage(jid, "Por favor, informe seu nome completo.");
    return false;
  }

  const phone = extractPhone(session.remote_jid);

  if (isValidPhone(phone)) {
    let cliente = await criarClienteViaChatbot(session.tenant_id, nome, phone);
    if (cliente) {
      await atualizarSessao(session.id, { cliente_id: cliente.cliente_id, client_name: nome });
      await sendWhatsAppMessage(jid, `✅ Cliente *${nome}* identificado!`);
      await encaminharParaVeiculo(jid, session, cliente.cliente_id, stateData.servico_id, nome);
      return;
    }
  }

  await sendWhatsAppMessage(jid, `Obrigado, ${nome}! Agora informe seu *telefone com DDD* (ex: 5511999999999):`);
  await atualizarSessao(session.id, {
    state: "DIGITANDO_TELEFONE",
    client_name: nome,
    state_data: { ...stateData, nome_cliente: nome },
  });
}

async function handleDigitandoTelefone(action, jid, session) {
  const stateData = session.state_data ?? {};
  const telefone = action.replace(/\D/g, "");

  if (!isValidPhone(telefone)) {
    await sendWhatsAppMessage(jid, "Telefone inválido. Informe o número com DDD (ex: 5511999999999):");
    return false;
  }

  const nome = stateData.nome_cliente || session.client_name || "Cliente";
  let cliente = await criarClienteViaChatbot(session.tenant_id, nome, telefone);

  if (!cliente) {
    await sendWhatsAppMessage(jid, "Erro ao criar cadastro. Tente novamente.");
    await sendMenu(jid, session);
    return;
  }

  await atualizarSessao(session.id, { cliente_id: cliente.cliente_id, client_name: nome });
  await sendWhatsAppMessage(jid, `✅ Cadastro concluído, ${nome}!`);
  await encaminharParaVeiculo(jid, session, cliente.cliente_id, stateData.servico_id, nome);
}

async function encaminharParaVeiculo(jid, session, clienteId, servicoId, nome) {
  const veiculos = await listarVeiculosCliente(session.tenant_id, clienteId);

  if (!veiculos.length) {
    const sections = gerarSectionsMarcas();
    await sendList(jid, "Selecione a *marca* do veículo:", "Ver Marcas", sections, "Esteticar");
    await atualizarSessao(session.id, {
      state: "DIGITANDO_VEICULO_MARCA",
      state_data: { servico_id: servicoId },
    });
    return;
  }

  const rows = veiculos.map((v) => ({
    title: `${v.marca} ${v.modelo}`,
    description: v.placa,
    rowId: `veiculo_${v.veiculo_id}`,
  }));
  rows.push({ title: "Cadastrar novo veículo", description: "Informar dados de outro veículo", rowId: "veiculo_novo" });

  await sendList(jid, "*Selecione o veículo para o agendamento:*", "Ver Veículos", [{ title: "Veículos", rows }], "Esteticar");
  await atualizarSessao(session.id, {
    state: "ESCOLHENDO_VEICULO",
    state_data: { servico_id: servicoId, veiculos },
  });
}

async function handleDigitandoVeiculoMarca(action, jid, session) {
  const stateData = session.state_data ?? {};
  let marca = null;

  if (action.startsWith("marca_")) {
    const raw = action.replace("marca_", "");
    if (raw === "outra") {
      await sendWhatsAppMessage(jid, "Digite a *marca* do veículo (ex: Fiat, Volkswagen, Honda):");
      return;
    }
    marca = raw;
  } else {
    const typed = action.trim();
    if (typed.length < 2) {
      const sections = gerarSectionsMarcas();
      await sendList(jid, "Selecione a *marca* do veículo na lista ou digite:", "Ver Marcas", sections, "Esteticar");
      return false;
    }
    marca = typed;
  }

  if (!marca) return false;

  if (MARCAS_CARROS[marca]) {
    const modelSections = gerarSectionsModelos(marca);
    if (modelSections) {
      await sendList(jid, `Selecione o *modelo* para ${marca}:`, "Ver Modelos", modelSections, "Esteticar");
      await atualizarSessao(session.id, { state: "DIGITANDO_VEICULO_MODELO", state_data: { ...stateData, marca } });
      return;
    }
  }

  await sendWhatsAppMessage(jid, `Marca: *${marca}*\n\nAgora informe o *modelo* (ex: Uno, Civic, Onix):`);
  await atualizarSessao(session.id, { state: "DIGITANDO_VEICULO_MODELO", state_data: { ...stateData, marca } });
}

async function handleDigitandoVeiculoModelo(action, jid, session) {
  const stateData = session.state_data ?? {};
  let modelo = null;

  if (action.startsWith("modelo_")) {
    const raw = action.replace("modelo_", "");
    if (raw === "outro") {
      await sendWhatsAppMessage(jid, "Digite o *modelo* do veículo (ex: Uno, Civic, Onix):");
      return;
    }
    modelo = raw;
  } else {
    const typed = action.trim();
    if (typed.length < 2) {
      if (stateData.marca && MARCAS_CARROS[stateData.marca]) {
        const modelSections = gerarSectionsModelos(stateData.marca);
        if (modelSections) {
          await sendList(jid, `Selecione o *modelo* para ${stateData.marca}:`, "Ver Modelos", modelSections, "Esteticar");
          return;
        }
      }
      await sendWhatsAppMessage(jid, "Por favor, informe o modelo do veículo.");
      return false;
    }
    modelo = typed;
  }

  if (!modelo) return false;

  await sendWhatsAppMessage(jid, `Modelo: *${modelo}*\n\nAgora informe a *placa* (ex: ABC-1234 ou ABC1234):`);
  await atualizarSessao(session.id, { state: "DIGITANDO_VEICULO_PLACA", state_data: { ...stateData, modelo } });
}

async function handleDigitandoVeiculoPlaca(action, jid, session) {
  const stateData = session.state_data ?? {};
  const placa = action.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  if (placa.length < 3) {
    await sendWhatsAppMessage(jid, "Placa inválida. Informe a placa no formato ABC-1234 ou ABC1234.");
    return false;
  }

  if (!session.cliente_id) {
    await sendWhatsAppMessage(jid, "Erro: cliente não identificado. Voltando ao menu.");
    await sendMenu(jid, session);
    return;
  }

  const veiculo = await criarVeiculoViaChat(session.tenant_id, session.cliente_id, stateData.marca, stateData.modelo, placa);

  if (!veiculo) {
    await sendWhatsAppMessage(jid, "Erro ao cadastrar veículo. Tente novamente.");
    await sendMenu(jid, session);
    return;
  }

  await sendWhatsAppMessage(jid, `✅ Veículo *${stateData.marca} ${stateData.modelo} (${placa})* cadastrado!`);
  await irParaData(jid, session, { ...stateData, veiculo_id: veiculo.veiculo_id });
}

/* ===================================================================
   BACK / RESET HANDLING
   =================================================================== */

const BACK_KEYWORDS = ["VOLTAR", "0"];
const RESET_KEYWORDS = ["REINICIAR", "RESET", "MENU"];

async function handleBack(currentState, jid, session) {
  const stateData = session.state_data ?? {};

  switch (currentState) {
    case "ESCOLHENDO_SERVICO":
    case "DIGITANDO_NOME":
    case "DIGITANDO_TELEFONE":
      await sendMenu(jid, session);
      return;

    case "ESCOLHENDO_VEICULO":
      await sendMenu(jid, session);
      return;

    case "DIGITANDO_VEICULO_MARCA":
      if (stateData.veiculos?.length > 0) {
        const rows = stateData.veiculos.map((v) => ({
          title: `${v.marca} ${v.modelo}`,
          description: v.placa,
          rowId: `veiculo_${v.veiculo_id}`,
        }));
        rows.push({ title: "Cadastrar novo veículo", description: "Informar dados de outro veículo", rowId: "veiculo_novo" });
        await sendList(jid, "*Selecione o veículo:*", "Ver Veículos", [{ title: "Veículos", rows }], "Esteticar");
        await atualizarSessao(session.id, { state: "ESCOLHENDO_VEICULO", state_data: { servico_id: stateData.servico_id, veiculos: stateData.veiculos } });
      } else {
        await sendMenu(jid, session);
      }
      return;

    case "DIGITANDO_VEICULO_MODELO":
      if (stateData.veiculos?.length > 0) {
        await handleBack("DIGITANDO_VEICULO_MARCA", jid, session);
      } else {
        const sections = gerarSectionsMarcas();
        await sendList(jid, "Selecione a *marca* do veículo:", "Ver Marcas", sections, "Esteticar");
        await atualizarSessao(session.id, { state: "DIGITANDO_VEICULO_MARCA", state_data: { ...stateData, marca: undefined } });
      }
      return;

    case "DIGITANDO_VEICULO_PLACA":
      if (stateData.marca && MARCAS_CARROS[stateData.marca]) {
        const modelSections = gerarSectionsModelos(stateData.marca);
        if (modelSections) {
          await sendList(jid, `Selecione o *modelo* para ${stateData.marca}:`, "Ver Modelos", modelSections, "Esteticar");
          await atualizarSessao(session.id, { state: "DIGITANDO_VEICULO_MODELO", state_data: { ...stateData, modelo: undefined } });
          return;
        }
      }
      await sendWhatsAppMessage(jid, "Voltando... Informe o *modelo* do veículo (ex: Uno, Civic):");
      await atualizarSessao(session.id, { state: "DIGITANDO_VEICULO_MODELO", state_data: { ...stateData, modelo: undefined } });
      return;

    case "ESCOLHENDO_DATA":
      if (stateData.veiculos?.length > 0) {
        const rows = stateData.veiculos.map((v) => ({
          title: `${v.marca} ${v.modelo}`,
          description: v.placa,
          rowId: `veiculo_${v.veiculo_id}`,
        }));
        rows.push({ title: "Cadastrar novo veículo", description: "Informar dados de outro veículo", rowId: "veiculo_novo" });
        await sendList(jid, "*Selecione o veículo:*", "Ver Veículos", [{ title: "Veículos", rows }], "Esteticar");
        await atualizarSessao(session.id, { state: "ESCOLHENDO_VEICULO", state_data: { servico_id: stateData.servico_id, veiculos: stateData.veiculos } });
      } else {
        await sendMenu(jid, session);
      }
      return;

    case "ESCOLHENDO_HORARIO":
      if (stateData.datas_disponiveis?.length > 0) {
        await sendButtons(jid, "*📅 Selecione a data desejada:*", gerarButtonsDatas(stateData.datas_disponiveis), "Esteticar");
        await atualizarSessao(session.id, { state: "ESCOLHENDO_DATA", state_data: stateData });
      } else {
        await sendMenu(jid, session);
      }
      return;

    case "CONFIRMANDO_AGENDAMENTO":
    case "CANCELANDO_AGENDAMENTO":
    case "CONFIRMANDO_CANCELAMENTO":
    case "AGENDAMENTO_CONFIRMADO":
    case "CONSULTANDO_AGENDAMENTOS":
      await sendMenu(jid, session);
      return;

    default:
      await sendMenu(jid, session);
  }
}

async function sugerirAtendente(jid, session) {
  await sendButtons(jid, "🤔 Não entendi. Deseja falar com um *atendente humano*?", [
    { id: "sim_atendente", text: "Sim, quero atendente" },
    { id: "nao_atendente", text: "Não, continuar" },
  ], "Esteticar");
  await atualizarSessao(session.id, {
    state_data: { ...session.state_data, aguardando_resposta_atendente: true },
  });
}

/* ===================================================================
   FSM: STATE DISPATCH
   =================================================================== */

const STATE_HANDLERS = {
  "MENU_PRINCIPAL": handleMenuPrincipal,
  "CONSULTANDO_AGENDAMENTOS": handleConsultandoAgendamentos,
  "ESCOLHENDO_SERVICO": handleEscolhendoServico,
  "ESCOLHENDO_VEICULO": handleEscolhendoVeiculo,
  "DIGITANDO_NOME": handleDigitandoNome,
  "DIGITANDO_TELEFONE": handleDigitandoTelefone,
  "DIGITANDO_VEICULO_MARCA": handleDigitandoVeiculoMarca,
  "DIGITANDO_VEICULO_MODELO": handleDigitandoVeiculoModelo,
  "DIGITANDO_VEICULO_PLACA": handleDigitandoVeiculoPlaca,
  "ESCOLHENDO_DATA": handleEscolhendoData,
  "ESCOLHENDO_HORARIO": handleEscolhendoHorario,
  "CONFIRMANDO_AGENDAMENTO": handleConfirmandoAgendamento,
  "CONFIRMANDO_CANCELAMENTO": handleConfirmandoCancelamento,
  "CANCELANDO_AGENDAMENTO": handleCancelandoAgendamento,
  "AGENDAMENTO_CONFIRMADO": (action, jid, session) => sendMenu(jid, session),
  "FALANDO_COM_ATENDENTE": handleFalandoComAtendente,
};

async function handleEstado(state, action, session) {
  const jid = session.remote_jid;
  const stateData = session.state_data ?? {};

  if (state === "FALANDO_COM_ATENDENTE") {
    await handleFalandoComAtendente(action, jid, session);
    return;
  }

  if (stateData.aguardando_resposta_atendente) {
    const upper = action.trim().toUpperCase();
    if (upper === "SIM_ATENDENTE" || upper === "1" || action === "sim_atendente") {
      criarNotificacao({
        tenantId: session.tenant_id,
        tipo: "chatbot_atendente",
        titulo: "Cliente precisa de atendente",
        mensagem: `Cliente ${session.client_name} (${extractPhone(session.remote_jid)}) não foi compreendido pelo bot e está solicitando atendente.\n\nÚltima mensagem: "${session.ultima_mensagem}"`,
        referenciaTipo: "chatbot",
        referenciaId: session.id,
      }).catch(() => {});

      await atualizarSessao(session.id, { state: "FALANDO_COM_ATENDENTE", state_data: {} });
      await sendWhatsAppMessage(jid, "✅ Sua solicitação foi enviada! Em breve um atendente entrará em contato.");
      return;
    } else {
      await atualizarSessao(session.id, { state_data: { ...stateData, aguardando_resposta_atendente: false, erros_consecutivos: 0 } });
      await sendWhatsAppMessage(jid, "Tudo bem! Vamos tentar novamente.");
      await sendMenu(jid, session);
      return;
    }
  }

  const upper = action.trim().toUpperCase();

  if (RESET_KEYWORDS.includes(upper)) {
    await sendWhatsAppMessage(jid, "🔄 Conversa reiniciada! Use o menu abaixo:");
    await sendMenu(jid, session);
    return;
  }

  if (BACK_KEYWORDS.includes(upper)) {
    await handleBack(state, jid, session);
    return;
  }

  const handler = STATE_HANDLERS[state];
  if (handler) {
    const handled = await handler(action, jid, session);
    if (handled !== false) {
      if (stateData.erros_consecutivos > 0) {
        await atualizarSessao(session.id, { state_data: { ...stateData, erros_consecutivos: 0 } });
      }
      return;
    }
  }

  const erros = (stateData.erros_consecutivos ?? 0) + 1;
  await atualizarSessao(session.id, { state_data: { ...stateData, erros_consecutivos: erros } });

  if (erros >= ERRO_MAXIMO) {
    await sugerirAtendente(jid, session);
  } else {
    await sendWhatsAppMessage(jid, `Não entendi. Tente novamente ou digite 0 para voltar. (${erros}/${ERRO_MAXIMO})`);
  }
}

async function handleOperationalError(jid, session, err, context = "") {
  logger.error({ err, context, sessionId: session?.id }, `Falha operacional: ${context}`);
  try {
    await sendWhatsAppMessage(jid, "❌ Ocorreu um erro inesperado. Voltando ao menu principal.");
    if (session?.id) {
      await sendMenu(jid, session);
    }
  } catch (fallbackErr) {
    logger.error({ err: fallbackErr }, "Fallback error após falha operacional");
  }
}

/* ===================================================================
   ENTRY POINT
   =================================================================== */

export async function processMessage(tenantId, remoteJid, text, pushName) {
  let session = null;
  try {
    session = await buscarSessao(tenantId, remoteJid);

    if (session && await verificarSessaoExpirada(session)) {
      logger.info({ sessionId: session.id, remoteJid }, "Sessão expirada por inatividade");
      await supabaseAdmin
        .from("chatbot_session")
        .update({ ativo: false })
        .eq("id", session.id);
      await sendWhatsAppMessage(remoteJid, "⏰ Seu atendimento foi encerrado por inatividade. Caso deseje continuar, basta enviar uma mensagem.");
      session = null;
    }

    if (!session) {
      const phone = extractPhone(remoteJid);
      session = await criarSessao({
        tenantId,
        remoteJid,
        clientPhone: phone,
        clientName: pushName,
      });

      const empresaNome = await getEmpresaNome(tenantId);

      await sendWhatsAppMessage(
        remoteJid,
        `🚗 Bem-vindo à *${empresaNome}*, ${pushName}! 👋\n\nSou o assistente virtual responsável pelos agendamentos e informações sobre nossos serviços de estética automotiva.`
      );
      await sendMenu(remoteJid, session);
      return;
    }

    if (session.ultima_mensagem !== text) {
      await atualizarSessao(session.id, { ultima_mensagem: text });
    }

    const jid = remoteJid;
    const intent = detectNaturalLanguage(text);

    if (intent === "SAUDACAO") {
      if (session.state === "MENU_PRINCIPAL") {
        await sendMenu(jid, session);
        return;
      }
      if (ESTADOS_RECUPERAVEIS.includes(session.state) && !session.state_data?.recuperacao_exibida) {
        const recoveryMsg = await montarMensagemRecuperacao(session);
        if (recoveryMsg) {
          await atualizarSessao(session.id, {
            state_data: { ...(session.state_data ?? {}), recuperacao_exibida: true, aguardando_recuperacao: true },
          });
          session.state_data = { ...(session.state_data ?? {}), recuperacao_exibida: true, aguardando_recuperacao: true };
          await sendButtons(remoteJid, recoveryMsg, [
            { id: "continuar_fluxo", text: "✅ Continuar" },
            { id: "reiniciar", text: "❌ Recomeçar" },
          ], "Esteticar");
          return;
        }
      }
      await sendWhatsAppMessage(jid, "Estou aqui te ajudando — vamos continuar de onde paramos.");
    } else if (session.state_data?.aguardando_recuperacao) {
      const p = text.trim().toUpperCase();
      await atualizarSessao(session.id, {
        state_data: { ...session.state_data, aguardando_recuperacao: false, recuperacao_exibida: false },
      });
      session.state_data = { ...session.state_data, aguardando_recuperacao: false, recuperacao_exibida: false };
      if (p !== "CONTINUAR_FLUXO" && text !== "continuar_fluxo") {
        await atualizarSessao(session.id, { state: "MENU_PRINCIPAL", state_data: {} });
        session.state = "MENU_PRINCIPAL";
        session.state_data = {};
        await sendWhatsAppMessage(remoteJid, "Tudo bem! Vamos começar de novo.");
        await sendMenu(remoteJid, session);
        return;
      }
    } else if (intent === "THANKS") {
      await sendWhatsAppMessage(jid, "Disponha! Conte conosco sempre que precisar.");
      return;
    } else if (intent === "RESET") {
      await atualizarSessao(session.id, { state: "MENU_PRINCIPAL", state_data: {} });
      session.state = "MENU_PRINCIPAL";
      session.state_data = {};
      await sendWhatsAppMessage(jid, "Conversa reiniciada. Como posso ajudar?");
      await sendMenu(jid, session);
      return;
    } else if (intent === "DESPEDIDA") {
      await sendWhatsAppMessage(jid, "Obrigado pelo contato! Cuide bem do seu veículo. 🚗");
      if (session.state !== "MENU_PRINCIPAL") {
        await sendMenu(jid, session);
      }
      return;
    }

    if (session.state === "MENU_PRINCIPAL" && !intent) {
      const servicoDetectado = await detectServiceIntent(text, session.tenant_id);
      if (servicoDetectado) {
        const phone = extractPhone(session.remote_jid);
        let cliente = null;

        if (isValidPhone(phone)) {
          cliente = await listarClientePorTelefone(session.tenant_id, phone);
        }

        if (!cliente && isValidPhone(phone)) {
          const nome = session.client_name || "Cliente";
          if (nome.length >= 2) {
            cliente = await criarClienteViaChatbot(session.tenant_id, nome, phone);
          }
        }

        if (cliente) {
          await atualizarSessao(session.id, { cliente_id: cliente.cliente_id });
          const veiculos = await listarVeiculosCliente(session.tenant_id, cliente.cliente_id);

          await sendWhatsAppMessage(jid, `Identifiquei que você quer *${servicoDetectado.nome_servico}*!`);

          if (!veiculos.length) {
            const sections = gerarSectionsMarcas();
            await sendList(jid, "Selecione a *marca* do veículo:", "Ver Marcas", sections, "Esteticar");
            await atualizarSessao(session.id, {
              state: "DIGITANDO_VEICULO_MARCA",
              state_data: { servico_id: servicoDetectado.servico_id },
            });
            return;
          }

          const rows = veiculos.map((v) => ({
            title: `${v.marca} ${v.modelo}`,
            description: v.placa,
            rowId: `veiculo_${v.veiculo_id}`,
          }));
          rows.push({ title: "Cadastrar novo veículo", description: "Informar dados de outro veículo", rowId: "veiculo_novo" });

          await sendList(jid, "*Selecione o veículo:*", "Ver Veículos", [{ title: "Veículos", rows }], "Esteticar");
          await atualizarSessao(session.id, {
            state: "ESCOLHENDO_VEICULO",
            state_data: { servico_id: servicoDetectado.servico_id, veiculos },
          });
          return;
        }

        await sendWhatsAppMessage(jid, `Identifiquei que você quer *${servicoDetectado.nome_servico}*! Para agendar, preciso do seu nome completo:`);
        await atualizarSessao(session.id, {
          state: "DIGITANDO_NOME",
          state_data: { servico_id: servicoDetectado.servico_id, telefone_invalido: !isValidPhone(phone) },
        });
        return;
      }
    }

    await handleEstado(session.state, text, session);
  } catch (err) {
    await handleOperationalError(remoteJid, session, err, "doProcessMessage");
  }
}
