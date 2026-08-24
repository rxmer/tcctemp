import * as relatoriosService from "../services/relatorios.service.js";
import * as exportService from "../services/relatorios-export.service.js";
import { cacheGetOrSet, buildCacheKey } from "../utils/cache.js";

const REPORT_TTL = 300;

async function withCache(tenantId, filtros, serviceFn, prefix) {
  const key = buildCacheKey(
    `report:${tenantId}`,
    prefix,
    filtros.data_inicio ?? "all",
    filtros.data_fim ?? "all",
    filtros.agrupar_por ?? "all"
  );
  return cacheGetOrSet(key, () => serviceFn(tenantId, filtros), REPORT_TTL);
}

export async function geral(req, res) {
  const filtros = extrairFiltros(req.query);
  const resultado = await withCache(req.tenantId, filtros, relatoriosService.relatorioGeral, "geral");
  res.json(resultado);
}

export async function agendamentos(req, res) {
  const filtros = extrairFiltros(req.query);
  const resultado = await withCache(req.tenantId, filtros, relatoriosService.relatorioAgendamentos, "agendamentos");
  res.json(resultado);
}

export async function servicos(req, res) {
  const filtros = extrairFiltros(req.query);
  const resultado = await withCache(req.tenantId, filtros, relatoriosService.relatorioServicos, "servicos");
  res.json(resultado);
}

export async function financeiro(req, res) {
  const filtros = extrairFiltros(req.query);
  const resultado = await withCache(req.tenantId, filtros, relatoriosService.relatorioFinanceiro, "financeiro");
  res.json(resultado);
}

export async function status(req, res) {
  const filtros = extrairFiltros(req.query);
  const resultado = await withCache(req.tenantId, filtros, relatoriosService.relatorioStatus, "status");
  res.json(resultado);
}

export async function clientesFrequentes(req, res) {
  const filtros = extrairFiltros(req.query);
  const resultado = await withCache(req.tenantId, filtros, relatoriosService.relatorioClientesFrequentes, "clientes");
  res.json(resultado);
}

function extrairFiltros(query) {
  const filtros = {};
  if (query.data_inicio) filtros.data_inicio = query.data_inicio;
  if (query.data_fim) filtros.data_fim = query.data_fim;
  if (query.agrupar_por) filtros.agrupar_por = query.agrupar_por;
  if (query.tipo) filtros.tipo = query.tipo;
  return filtros;
}

export async function exportarExcel(req, res) {
  const filtros = extrairFiltros(req.query);
  const buffer = await exportService.gerarExcel(req.tenantId, filtros);
  const sufixo = filtros.tipo && filtros.tipo !== "geral" ? `-${filtros.tipo}` : "-geral";

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="relatorio${sufixo}-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  res.send(buffer);
}

export async function exportarPDF(req, res) {
  const filtros = extrairFiltros(req.query);
  const buffer = await exportService.gerarPDF(req.tenantId, filtros);
  const sufixo = filtros.tipo && filtros.tipo !== "geral" ? `-${filtros.tipo}` : "-geral";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="relatorio${sufixo}-${new Date().toISOString().slice(0, 10)}.pdf"`);
  res.send(buffer);
}
