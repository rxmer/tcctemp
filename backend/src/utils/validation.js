import { z } from "zod";
import { AppError } from "./errors.js";

export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new AppError(`Dados inválidos: ${errors}`, 400);
  }
  return result.data;
}

export const schemas = {
  criarCliente: z.object({
    nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100),
    telefone: z.string().regex(/^\d{12,13}$/, "Telefone inválido — deve conter 12 ou 13 dígitos (55 + DDD + número)").optional().nullable(),
    email: z.string().email("E-mail inválido").max(100).optional().nullable(),
  }).transform((data) => ({
    ...data,
    telefone: data.telefone ? data.telefone.replace(/\D/g, "") : null,
  })),

  criarVeiculo: z.object({
    placa: z.string().regex(/^[A-Z]{3}[0-9][0-9A-Z][0-9]{2}$/, "Placa inválida (formato Mercosul ou antigo)"),
    marca: z.string().min(2).max(50),
    modelo: z.string().min(1).max(50),
    ano: z.number().int().min(1886).max(2099).optional().nullable(),
    cor: z.string().max(30).optional().nullable(),
    cliente_id: z.number().int().positive(),
  }),

  criarServico: z.object({
    nome_servico: z.string().min(2).max(100),
    descricao: z.string().max(500).optional().nullable(),
    preco_base: z.number().nonnegative("Preço deve ser positivo"),
    duracao_min: z.number().int().positive("Duração deve ser maior que zero"),
  }),

  criarAgendamento: z.object({
    cliente_id: z.number().int().positive(),
    veiculo_id: z.number().int().positive(),
    servico_id: z.number().int().positive(),
    data_agendamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
    hora_agendamento: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora deve estar no formato HH:MM"),
    observacoes: z.string().max(500).optional().nullable(),
  }),

  login: z.object({
    email: z.string().email("E-mail inválido"),
    senha: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(100),
  }),

  criarContaPagar: z.object({
    descricao: z.string().min(2).max(200),
    valor: z.number().positive("Valor deve ser positivo"),
    data_vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    observacoes: z.string().max(500).optional().nullable(),
  }),

  criarFuncionario: z.object({
    nome: z.string().min(2).max(100),
    email: z.string().email("E-mail inválido"),
    senha: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(100),
    telefone: z.string().max(20).optional().nullable(),
  }),
};
