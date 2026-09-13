import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/useAuth";
import { relatoriosService } from "../services/relatorios.service";
import { PageHeader, Button, TenantChip } from "./ui";
import styles from "../styles/pages/relatorios.module.css";
import { Download, FileText, BarChart3 } from "lucide-react";

export function formatMoney(v) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPeriodo(p, agrupar) {
  if (agrupar === "mes") {
    const [ano, mes] = p.split("-");
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${meses[Number(mes) - 1]}/${ano}`;
  }
  if (p?.length === 10) {
    const [, m, d] = p.split("-");
    return `${d}/${m}`;
  }
  return p;
}

function SkeletonRelatorioWide() {
  return (
    <div className={styles.gridWide}>
      <div className={styles.skeletonChart}>
        <div className={`skeleton ${styles.skChartTitle}`} />
        <div className={styles.skBars}>
          {[45, 70, 55, 85, 60, 40, 75, 50].map((h, i) => (
            <div key={i} className={`skeleton ${styles.skBar}`} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function RelatorioBase({
  titulo,
  subtitle,
  cardTitulo,
  cardSub,
  comAgrupar = true,
  fetcher,
  renderChart,
  tipoExport,
  icone: Icone = BarChart3,
  accentHex,
  align = "wide",
  totalTexto,
}) {
  const { tenant } = useAuth();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtroData, setFiltroData] = useState("");
  const [agrupar, setAgrupar] = useState("dia");
  const [exportando, setExportando] = useState(false);
  const reqSeq = useRef(0);

  function getParams() {
    const params = {};
    if (comAgrupar) params.agrupar_por = agrupar;
    if (tipoExport) params.tipo = tipoExport;
    if (filtroData) {
      const [ano, mes] = filtroData.split("-");
      params.data_inicio = `${ano}-${mes}-01`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      params.data_fim = `${ano}-${mes}-${ultimoDia}`;
    }
    return params;
  }

  const carregar = useCallback(async () => {
    const seq = ++reqSeq.current;
    setLoading(true);
    setErro(null);
    try {
      const data = await fetcher(getParams());
      if (seq !== reqSeq.current) return;
      setDados(data);
    } catch {
      if (seq !== reqSeq.current) return;
      setErro("Erro ao carregar relatório. Tente novamente.");
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  }, [fetcher, filtroData, agrupar]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleExportar(formato) {
    setExportando(true);
    try {
      if (formato === "excel") {
        await relatoriosService.exportarExcel(getParams());
      } else {
        await relatoriosService.exportarPDF(getParams());
      }
    } catch (err) {
      setErro(err.message);
    } finally {
      setExportando(false);
    }
  }

  if (loading && !dados) {
    return (
      <>
        <PageHeader title={titulo} subtitle={subtitle} />
        <SkeletonRelatorioWide />
      </>
    );
  }

  return (
    <>
      <PageHeader title={titulo} subtitle={subtitle}
        action={<TenantChip nome={tenant?.nome} />}
      />

      <div className={styles.toolbar}>
        <div className={styles.filtros}>
          <div className={styles.filtroGroup}>
            <label className={styles.filtroLabel} htmlFor="rel-filtro-mes">Mês</label>
            <input id="rel-filtro-mes" type="month" className={styles.filtroInput} value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)} />
          </div>
          {comAgrupar && (
            <div className={styles.filtroGroup}>
              <label className={styles.filtroLabel} htmlFor="rel-filtro-agrupar">Agrupar</label>
              <select id="rel-filtro-agrupar" className={styles.filtroInput} value={agrupar}
                onChange={(e) => setAgrupar(e.target.value)}>
                <option value="dia">Por dia</option>
                <option value="semana">Por semana</option>
                <option value="mes">Por mês</option>
              </select>
            </div>
          )}
        </div>

        <div className={styles.exportActions}>
          <Button onClick={() => handleExportar("excel")} disabled={exportando}>
            <Download size={14} /> Excel
          </Button>
          <Button variant="ghost" onClick={() => handleExportar("pdf")} disabled={exportando}>
            <FileText size={14} /> PDF
          </Button>
        </div>
      </div>

      {erro && (
        <div className={styles.errorContainer}>
          <span className={styles.errorMsg}>{erro}</span>
          <button className={styles.retryBtn} onClick={carregar}>Tentar novamente</button>
        </div>
      )}

      <div className={align === "wide" ? styles.gridWide : styles.grid}>
        <div className={styles.card} style={accentHex ? { "--card-accent": accentHex } : undefined}>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadLeft}>
              <span className={styles.cardIcon}><Icone size={18} /></span>
              <div>
                <h2 className={styles.cardTitle}>{cardTitulo}</h2>
                <p className={styles.cardSub}>{cardSub}</p>
              </div>
            </div>
            {totalTexto && dados && (
              <span className={styles.cardChip}>{totalTexto(dados)}</span>
            )}
          </div>
          <div className={styles.cardBody}>
            {renderChart(dados, agrupar)}
          </div>
        </div>
      </div>
    </>
  );
}