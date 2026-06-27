import * as expedienteService from "../services/expediente.service.js";

export async function listar(req, res) {
  const expediente = await expedienteService.listarExpediente(req.tenantId);
  res.json(expediente);
}

export async function upsert(req, res) {
  const { dia_semana, abertura, fechamento, ativo } = req.body;

  if (dia_semana == null) {
    return res.status(400).json({ error: "dia_semana é obrigatório" });
  }

  const result = await expedienteService.upsertExpediente(dia_semana, req.tenantId, {
    abertura: abertura ?? undefined,
    fechamento: fechamento ?? undefined,
    ativo: ativo ?? undefined,
  });

  res.json(result);
}

export async function upsertAll(req, res) {
  const { dias } = req.body;

  if (!Array.isArray(dias)) {
    return res.status(400).json({ error: "dias deve ser um array" });
  }

  for (const dia of dias) {
    if (dia.dia_semana == null) {
      return res.status(400).json({ error: "Cada dia deve ter dia_semana" });
    }
    await expedienteService.upsertExpediente(dia.dia_semana, req.tenantId, {
      abertura: dia.abertura,
      fechamento: dia.fechamento,
      ativo: dia.ativo,
    });
  }

  const expediente = await expedienteService.listarExpediente(req.tenantId);
  res.json(expediente);
}
