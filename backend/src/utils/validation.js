import { z } from "zod";
import { AppError } from "./errors.js";

const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dataRegex = /^\d{4}-\d{2}-\d{2}$/;

const clienteBase = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100),
  telefone: z.string().regex(/^\d{10,11}$/, "Telefone inválido — deve conter 10 ou 11 dígitos").optional().nullable(),
  email: z.string().email("E-mail inválido").max(100).optional().nullable(),
});

function limparTelefone(data) {
  return {
    ...data,
    telefone: data.telefone ? data.telefone.replace(/\D/g, "").replace(/^55/, "") : null,
  };
}

const agendamentoBase = z.object({
  cliente_id: z.number().int().positive(),
  veiculo_id: z.number().int().positive(),
  servico_id: z.number().int().positive(),
  data_agendamento: z.string().regex(dataRegex, "Data deve estar no formato YYYY-MM-DD"),
  hora_agendamento: z.string().regex(horaRegex, "Hora deve estar no formato HH:MM"),
  observacoes: z.string().max(500).optional().nullable(),
});

export const schemas = {
  criarCliente: clienteBase.transform(limparTelefone),
  atualizarCliente: clienteBase.partial().transform(limparTelefone),

  criarVeiculo: z.object({
    placa: z.string().regex(/^[A-Z]{3}[0-9][0-9A-Z][0-9]{2}$/, "Placa inválida (formato Mercosul ou antigo)"),
    marca: z.string().min(2).max(50),
    modelo: z.string().min(1).max(50),
    ano: z.number().int().min(1886).max(2099).optional().nullable(),
    cor: z.string().max(30).optional().nullable(),
    cliente_id: z.number().int().positive(),
  }),
  atualizarVeiculo: z.object({
    placa: z.string().regex(/^[A-Z]{3}[0-9][0-9A-Z][0-9]{2}$/, "Placa inválida (formato Mercosul ou antigo)").optional(),
    marca: z.string().min(2).max(50).optional(),
    modelo: z.string().min(1).max(50).optional(),
    ano: z.number().int().min(1886).max(2099).optional().nullable(),
    cor: z.string().max(30).optional().nullable(),
  }),

  criarServico: z.object({
    nome_servico: z.string().min(2).max(100),
    descricao: z.string().max(500).optional().nullable(),
    preco_base: z.number().nonnegative("Preço deve ser positivo"),
    duracao_min: z.number().int().positive("Duração deve ser maior que zero"),
  }),
  atualizarServico: z.object({
    nome_servico: z.string().min(2).max(100).optional(),
    descricao: z.string().max(500).optional().nullable(),
    preco_base: z.number().nonnegative("Preço deve ser positivo").optional(),
    duracao_min: z.number().int().positive("Duração deve ser maior que zero").optional(),
  }),

  criarAgendamento: agendamentoBase,
  atualizarAgendamento: agendamentoBase.partial().extend({
    status: z.enum(["agendado", "confirmado", "em_andamento", "concluido", "cancelado"]).optional(),
  }),

  login: z.object({
    email: z.string().email("E-mail inválido"),
    senha: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(100),
  }),

  criarConta: z.object({
    nomeEmpresa: z.string().min(2, "Nome da empresa deve ter no mínimo 2 caracteres").max(100),
    nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100),
    email: z.string().email("E-mail inválido").max(100),
    senha: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(100),
  }),

  criarContaPagar: z.object({
    descricao: z.string().min(2).max(200),
    valor: z.number().positive("Valor deve ser positivo"),
    data_vencimento: z.string().regex(dataRegex, "Data inválida"),
    observacoes: z.string().max(500).optional().nullable(),
  }),

  criarFuncionario: z.object({
    nome: z.string().min(2).max(100),
    email: z.string().email("E-mail inválido"),
    senha: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(100),
    telefone: z.string().max(20).optional().nullable(),
  }),

  adicionarItemOS: z.object({
    servico_id: z.number().int().positive(),
    quantidade: z.number().int().positive().default(1),
  }),

  criarDataBloqueada: z.object({
    data: z.string().regex(dataRegex, "Data deve estar no formato YYYY-MM-DD"),
    motivo: z.string().max(200).optional().nullable(),
  }),

  criarComunicado: z.object({
    mensagem: z.string().min(5, "Mensagem deve ter no mínimo 5 caracteres").max(500),
    filtro: z.enum(["todos", "agendados", "chatbot"]).default("todos"),
  }),

  upsertExpedienteDia: z.object({
    dia_semana: z.number().int().min(0).max(6),
    abertura: z.string().regex(horaRegex, "Abertura deve estar no formato HH:MM").optional().nullable(),
    fechamento: z.string().regex(horaRegex, "Fechamento deve estar no formato HH:MM").optional().nullable(),
    ativo: z.boolean().optional(),
  }),
  upsertExpedienteAll: z.object({
    dias: z.array(z.lazy(() => schemas.upsertExpedienteDia)).min(1).max(7),
  }),

  salvarConfiguracao: z.object({
    nome_fantasia: z.string().min(1).max(100).optional().nullable(),
    cnpj: z.string().max(18).optional().nullable(),
    telefone: z.string().max(15).optional().nullable(),
    email: z.string().email("E-mail inválido").max(100).optional().nullable(),
    endereco: z.string().max(200).optional().nullable(),
    logo_url: z.string()
      .url("URL do logotipo inválida")
      .refine((u) => u.startsWith("http://") || u.startsWith("https://"), "Logo deve usar http/https")
      .max(500)
      .optional()
      .nullable(),
  }),
};

export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new AppError(`Dados inválidos: ${errors}`, 400);
  }
  return result.data;
}
