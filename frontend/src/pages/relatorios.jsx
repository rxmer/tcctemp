import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "../context/useAuth";
import { relatoriosService } from "../services/relatorios.service";
import { PageHeader, Button, TenantChip } from "../components/ui";
import { ClientesRanking } from "../components/relatorios/ClientesRanking";
import { EmptyRelatorio } from "../components/relatorios/EmptyRelatorio";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import styles from "../styles/pages/relatorios.module.css";
import {
  Download, FileText, CalendarCheck2, CheckCircle2, XCircle, Clock3,
  CalendarDays, Users, Award,
} from "lucide-react";

const STATUS_CORES = {
  pendente: "#f59e0b",
  confirmado: "#3b82f6",
  em_andamento: "#8b5cf6",
  finalizado: "#22c55e",
  cancelado: "#ef4444",
  falta: "#e11d48",
};

const STATUS_ORDEM = ["pendente", "confirmado", "em_andamento", "finalizado", "cancelado", "falta"];

const KPI_CONFIG = [
  { chave: "pendente", label: "Pendentes", icone: Clock3, cor: "scAmber" },
  { chave: "confirmado", label: "Confirmados", icone: CalendarDays, cor: "scGold" },
  { chave: "finalizado", label: "Concluídos", icone: CheckCircle2, cor: "scGreen" },
  { chave: "cancelado", label: "Cancelados", icone: XCircle, cor: "scRed" },
];

export function Relatorios() {
  const { tenant } = useAuth();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtroData, setFiltroData] = useState("");
  const [exportando, setExportando] = useState(false);
  const reqSeq = useRef(0);

  function getParams() {
    const params = {};
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
      const [status, clientes] = await Promise.all([
        relatoriosService.status(getParams()),
        relatoriosService.clientesFrequentes(getParams()),
      ]);
      if (seq !== reqSeq.current) return;
      setDados({ status, clientes });
    } catch {
      if (seq !== reqSeq.current) return;
      setErro("Erro ao carregar relatórios. Tente novamente.");
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  }, [filtroData]);

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

  const { status, clientes, total, kpis } = useMemo(() => {
    const st = dados?.status ?? [];
    const totalRaw = st.reduce((s, x) => s + (Number(x.quantidade) || 0), 0);
    const sorted = [...st].sort(
      (a, b) => STATUS_ORDEM.indexOf(a.status) - STATUS_ORDEM.indexOf(b.status)
    );
    const kpi = KPI_CONFIG.map((conf) => {
      const item = sorted.find((s) => s.status === conf.chave);
      const valor = item?.quantidade ?? 0;
      return { ...conf, valor, pct: totalRaw > 0 ? Math.round((valor / totalRaw) * 100) : 0 };
    });
    return { status: sorted, clientes: dados?.clientes ?? [], total: totalRaw, kpis: kpi };
  }, [dados]);

  if (loading && !dados) {
    return (
      <>
        <PageHeader title="Relatórios" subtitle="Visão geral da empresa" />
        <div className={styles.skeletonStats}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonStatCard}>
              <div className={`skeleton ${styles.skStatIcon}`} />
              <div className={`skeleton ${styles.skStatValue}`} />
              <div className={`skeleton ${styles.skStatLabel}`} />
            </div>
          ))}
        </div>
        <div className={styles.grid}>
          <div className={styles.skeletonChart}>
            <div className={`skeleton ${styles.skChartTitle}`} />
            <div className={`skeleton ${styles.skDonutSkel}`} />
          </div>
          <div className={styles.skeletonChart}>
            <div className={`skeleton ${styles.skChartTitle}`} />
            <div className={styles.skRows}>
              {[0, 1, 2, 3, 4].map((r) => (
                <div key={r} className={`skeleton ${styles.skRow}`} />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Relatórios" subtitle="Visão geral da empresa"
        action={<TenantChip nome={tenant?.nome} />}
      />

      <div className={styles.toolbar}>
        <div className={styles.filtros}>
          <div className={styles.filtroGroup}>
            <label className={styles.filtroLabel} htmlFor="rel-filtro-mes">Mês</label>
            <input id="rel-filtro-mes" type="month" className={styles.filtroInput} value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)} />
          </div>
          {filtroData && (
            <Button variant="ghost" onClick={() => setFiltroData("")}>Limpar</Button>
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

      <div className={styles.statGrid}>
        {kpis.map((k) => (
          <div key={k.chave} className={`${styles.statCard} ${styles[k.cor]}`}>
            <span className={styles.statIcon}><k.icone size={20} /></span>
            <span className={styles.statValue}>{k.valor}</span>
            <span className={styles.statLabel}>{k.label}</span>
            <span className={styles.statSub}>{k.pct}% do total</span>
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        <div className={styles.card} style={{ "--card-accent": "#d4a843" }}>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadLeft}>
              <span className={styles.cardIcon}><CalendarCheck2 size={18} /></span>
              <div>
                <h2 className={styles.cardTitle}>Status dos agendamentos</h2>
                <p className={styles.cardSub}>Distribuição por situação no período</p>
              </div>
            </div>
            <span className={styles.cardChip}>{total} agendamentos</span>
          </div>
          <div className={styles.cardBody}>
            {status.length === 0 ? (
              <EmptyRelatorio
                titulo="Sem agendamentos no período"
                texto="A distribuição por status aparece aqui quando houver agendamentos."
                icone={CalendarCheck2}
              />
            ) : (
              <div className={styles.donutLayout}>
                <div className={styles.donutWrap}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={status}
                        dataKey="quantidade"
                        nameKey="label"
                        cx="50%" cy="50%"
                        innerRadius={64}
                        outerRadius={100}
                        paddingAngle={2}
                        cornerRadius={6}
                        strokeWidth={0}
                      >
                        {status.map((entry) => (
                          <Cell key={entry.status}
                            fill={STATUS_CORES[entry.status] || "#888"}>
                          </Cell>
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val, name) => [val, name]}
                        contentStyle={{
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 13,
                          boxShadow: "var(--shadow-md)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className={styles.donutCenter}>
                    <span className={styles.donutCenterValue}>{total}</span>
                    <span className={styles.donutCenterLabel}>agendamentos</span>
                  </div>
                </div>

                <div className={styles.legendList}>
                  {status.map((s) => {
                    const pct = total > 0 ? Math.round((Number(s.quantidade) / total) * 100) : 0;
                    return (
                      <div key={s.status} className={styles.legendItem}
                        style={{ "--dot": STATUS_CORES[s.status] || "#888" }}>
                        <div className={styles.legendTop}>
                          <span className={styles.legendDot} />
                          <span className={styles.legendName}>{s.label}</span>
                          <span className={styles.legendCount}>{s.quantidade}</span>
                          <span className={styles.legendPct}>{pct}%</span>
                        </div>
                        <span className={styles.legendBar}>
                          <span className={styles.legendBarFill} style={{ transform: `scaleX(${pct / 100})` }} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadLeft}>
              <span className={styles.cardIcon}><Users size={18} /></span>
              <div>
                <h2 className={styles.cardTitle}>Clientes mais frequentes</h2>
                <p className={styles.cardSub}>Top 5 por quantidade de agendamentos</p>
              </div>
            </div>
            <span className={styles.cardChip}><Award size={13} /> Top 5</span>
          </div>
          <div className={styles.cardBody}>
            <ClientesRanking dados={clientes} max={5} />
          </div>
        </div>
      </div>
    </>
  );
}