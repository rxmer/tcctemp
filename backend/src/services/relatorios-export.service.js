import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import * as relatoriosService from "./relatorios.service.js";

function formatMoney(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBR(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatPeriodo(p, agrupar) {
  if (agrupar === "mes") {
    const [ano, mes] = p.split("-");
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${meses[Number(mes) - 1]}/${ano}`;
  }
  if (p?.length === 10) return formatDateBR(p);
  return p;
}

const COLORS = {
  pendente: "f59e0b",
  confirmado: "3b82f6",
  em_andamento: "8b5cf6",
  finalizado: "22c55e",
  cancelado: "ef4444",
};

export async function gerarExcel(tenantId, filtros = {}) {
  const dados = await relatoriosService.relatorioGeral(tenantId, filtros);
  const agrupar = filtros.agrupar_por || "dia";

  const wb = new ExcelJS.Workbook();
  wb.creator = "EstetiCar";
  wb.created = new Date();

  const addHeaderRow = (ws, headers) => {
    const row = ws.addRow(headers);
    row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE85D04" } };
    row.alignment = { horizontal: "center" };
    row.height = 24;
  };

  const centerCol = (ws, cols) => {
    cols.forEach((c) => {
      const col = ws.getColumn(c);
      col.alignment = { horizontal: "center" };
    });
  };

  const autoWidth = (ws) => {
    ws.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell((cell) => {
        const val = cell.value ? String(cell.value).length : 0;
        if (val > maxLen) maxLen = val;
      });
      col.width = Math.min(maxLen + 4, 40);
    });
  };

  /* ---------- Sheet: Agendamentos ---------- */
  const wsAg = wb.addWorksheet("Agendamentos");
  addHeaderRow(wsAg, ["Período", "Total", "Pendente", "Confirmado", "Em Andamento", "Finalizado", "Cancelado"]);

  for (const row of dados.agendamentos) {
    wsAg.addRow([
      formatPeriodo(row.periodo, agrupar),
      row.total,
      row.por_status?.pendente || 0,
      row.por_status?.confirmado || 0,
      row.por_status?.em_andamento || 0,
      row.por_status?.finalizado || 0,
      row.por_status?.cancelado || 0,
    ]);
  }
  autoWidth(wsAg);

  /* ---------- Sheet: Serviços ---------- */
  const wsSe = wb.addWorksheet("Serviços");
  addHeaderRow(wsSe, ["Serviço", "Quantidade", "Receita"]);

  for (const row of dados.servicos) {
    wsSe.addRow([row.nome, row.quantidade, formatMoney(row.receita)]);
  }
  autoWidth(wsSe);
  centerCol(wsSe, [2, 3]);

  /* ---------- Sheet: Financeiro ---------- */
  const wsFi = wb.addWorksheet("Financeiro");
  addHeaderRow(wsFi, ["Mês", "Receitas", "Despesas", "Recebido", "Pago", "Saldo"]);

  for (const row of dados.financeiro) {
    wsFi.addRow([
      row.mes,
      formatMoney(row.receitas),
      formatMoney(row.despesas),
      formatMoney(row.recebido),
      formatMoney(row.pago),
      formatMoney(row.receitas - row.despesas),
    ]);
  }
  autoWidth(wsFi);

  /* ---------- Sheet: Status ---------- */
  const wsSt = wb.addWorksheet("Status");
  addHeaderRow(wsSt, ["Status", "Quantidade"]);

  for (const row of dados.status) {
    wsSt.addRow([row.label, row.quantidade]);
  }
  autoWidth(wsSt);
  centerCol(wsSt, [2]);

  return await wb.xlsx.writeBuffer();
}

export async function gerarPDF(tenantId, filtros = {}) {
  const dados = await relatoriosService.relatorioGeral(tenantId, filtros);
  const agrupar = filtros.agrupar_por || "dia";

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    info: {
      Title: "Relatório EstetiCar",
      Author: "EstetiCar",
    },
  });

  const buffers = [];
  doc.on("data", (chunk) => buffers.push(chunk));

  const drawTable = (headers, rows, startY, colWidths) => {
    const cellPad = 6;
    const lineH = 22;
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    const drawRow = (cells, isHeader, y) => {
      let x = doc.page.margins.left;
      const bg = isHeader ? "#E85D04" : undefined;

      cells.forEach((text, i) => {
        const w = colWidths[i];
        if (bg) {
          doc.rect(x, y, w, lineH).fill(bg);
        }
        doc.fillColor(isHeader ? "#FFFFFF" : "#F0F0F0");
        doc.font(isHeader ? "Helvetica-Bold" : "Helvetica");
        doc.fontSize(isHeader ? 10 : 9);
        doc.text(String(text), x + cellPad, y + cellPad, {
          width: w - cellPad * 2,
          ellipsis: true,
        });
        x += w;
      });
      doc.fillColor("#222222");
      doc.rect(doc.page.margins.left, y, tableWidth, lineH).stroke();
    };

    drawRow(headers, true, startY);
    let y = startY + lineH;
    for (const row of rows) {
      drawRow(row, false, y);
      y += lineH;
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = doc.page.margins.top;
        drawRow(headers, true, y);
        y += lineH;
      }
    }
    return y;
  };

  /* ---------- Cabeçalho ---------- */
  doc.fontSize(22).font("Helvetica-Bold").fillColor("#E85D04");
  doc.text("Relatório EstetiCar", { align: "center" });
  doc.moveDown(0.5);

  doc.fontSize(11).font("Helvetica").fillColor("#888888");
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, { align: "center" });
  doc.moveDown(1);

  if (filtros.data_inicio) {
    doc.fontSize(10).fillColor("#888888");
    doc.text(`Filtro: ${formatDateBR(filtros.data_inicio)} até ${formatDateBR(filtros.data_fim)}`, { align: "center" });
    doc.moveDown(1);
  }

  /* ---------- 1. Agendamentos ---------- */
  doc.fontSize(14).font("Helvetica-Bold").fillColor("#F0F0F0");
  doc.text("Agendamentos por Período");
  doc.moveDown(0.5);

  const agHeaders = ["Período", "Total", "Pend.", "Conf.", "E.A.", "Fin.", "Canc."];
  const agColW = [70, 40, 40, 40, 50, 40, 40];
  const agRows = dados.agendamentos.map((r) => [
    formatPeriodo(r.periodo, agrupar),
    r.total,
    r.por_status?.pendente || 0,
    r.por_status?.confirmado || 0,
    r.por_status?.em_andamento || 0,
    r.por_status?.finalizado || 0,
    r.por_status?.cancelado || 0,
  ]);
  const y1 = drawTable(agHeaders, agRows, doc.y, agColW);
  doc.y = y1 + 20;

  /* ---------- 2. Servicos ---------- */
  doc.fontSize(14).font("Helvetica-Bold").fillColor("#F0F0F0");
  doc.text("Serviços Mais Realizados");
  doc.moveDown(0.5);

  const seHeaders = ["Serviço", "Qtd", "Receita"];
  const seColW = [260, 50, 120];
  const seRows = dados.servicos.slice(0, 15).map((r) => [r.nome, r.quantidade, formatMoney(r.receita)]);
  const y2 = drawTable(seHeaders, seRows, doc.y, seColW);
  doc.y = y2 + 20;

  /* ---------- 3. Financeiro ---------- */
  doc.fontSize(14).font("Helvetica-Bold").fillColor("#F0F0F0");
  doc.text("Financeiro");
  doc.moveDown(0.5);

  const fiHeaders = ["Mês", "Receitas", "Despesas", "Saldo"];
  const fiColW = [80, 100, 100, 100];
  const fiRows = dados.financeiro.map((r) => [
    r.mes,
    formatMoney(r.receitas),
    formatMoney(r.despesas),
    formatMoney(r.receitas - r.despesas),
  ]);
  const y3 = drawTable(fiHeaders, fiRows, doc.y, fiColW);
  doc.y = y3 + 20;

  /* ---------- 4. Status ---------- */
  doc.fontSize(14).font("Helvetica-Bold").fillColor("#F0F0F0");
  doc.text("Distribuição de Status");
  doc.moveDown(0.5);

  const stHeaders = ["Status", "Quantidade"];
  const stColW = [300, 80];
  const stRows = dados.status.map((r) => [r.label, r.quantidade]);
  drawTable(stHeaders, stRows, doc.y, stColW);

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
  });
}
