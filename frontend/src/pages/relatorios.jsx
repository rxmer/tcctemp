import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/useAuth";
import { relatoriosService } from "../services/relatorios.service";
import { PageHeader, Button, SkeletonCard } from "../components/ui";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import styles from "../styles/pages/relatorios.module.css";
import { Download, FileText } from "lucide-react";

const STATUS_CORES = {
  pendente: "#f59e0b",
  confirmado: "#3b82f6",
  em_andamento: "#8b5cf6",
  finalizado: "#22c55e",
  cancelado: "#ef4444",
};

export function Relatorios() {
  const { tenant } = useAuth();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtroData, setFiltroData] = useState("");
  const [agrupar, setAgrupar] = useState("dia");
  const [exportando, setExportando] = useState(false);
  const reqSeq = useRef(0);

  const carregar = useCallback(async () => {
    const seq = ++reqSeq.current;
    setLoading(true);
    setErro(null);
    try {
      const params = { agrupar_por: agrupar };
      if (filtroData) {
        const [ano, mes] = filtroData.split("-");
        params.data_inicio = `${ano}-${mes}-01`;
        const ultimoDia = new Date(ano, mes, 0).getDate();
        params.data_fim = `${ano}-${mes}-${ultimoDia}`;
      }
      const data = await relatoriosService.geral(params);
      if (seq !== reqSeq.current) return;
      setDados(data);
    } catch (err) {
      if (seq !== reqSeq.current) return;
      setErro("Erro ao carregar relatórios. Tente novamente.");
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  }, [filtroData, agrupar]);

  useEffect(() => {
    carregar();
  }, [filtroData, agrupar]);

  function getFiltros() {
    const params = { agrupar_por: agrupar };
    if (filtroData) {
      const [ano, mes] = filtroData.split("-");
      params.data_inicio = `${ano}-${mes}-01`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      params.data_fim = `${ano}-${mes}-${ultimoDia}`;
    }
    return params;
  }

  async function handleExportar(formato) {
    setExportando(true);
    try {
      if (formato === "excel") {
        await relatoriosService.exportarExcel(getFiltros());
      } else {
        await relatoriosService.exportarPDF(getFiltros());
      }
    } catch (err) {
      setErro(err.message);
    } finally {
      setExportando(false);
    }
  }

  function formatMoney(v) {
    return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatPeriodo(p) {
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

  if (loading && !dados) {
    return (
      <>
        <PageHeader title="Relatórios" subtitle="Análise de dados da empresa" />
        <SkeletonCard lines={8} />
      </>
    );
  }

  if (erro) {
    return (
      <>
        <PageHeader title="Relatórios" subtitle="Análise de dados da empresa" />
        <div className={styles.errorContainer}>
          <span className={styles.errorMsg}>{erro}</span>
          <button className={styles.retryBtn} onClick={carregar}>Tentar novamente</button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Análise de dados da empresa"
        action={
          <div className={styles.tenantChip}>
            <span className={styles.tenantDot} /><span>{tenant?.nome}</span>
          </div>
        }
      />

      <div className={styles.filtros}>
        <div className={styles.filtroGroup}>
          <label className={styles.filtroLabel}>Mês</label>
          <input type="month" className={styles.filtroInput} value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)} />
        </div>
        <div className={styles.filtroGroup}>
          <label className={styles.filtroLabel}>Agrupar</label>
          <select className={styles.filtroInput} value={agrupar}
            onChange={(e) => setAgrupar(e.target.value)}>
            <option value="dia">Por dia</option>
            <option value="semana">Por semana</option>
            <option value="mes">Por mês</option>
          </select>
        </div>

        <div className={styles.exportActions}>
          <Button onClick={() => handleExportar("excel")}>
            <Download size={14} /> Excel
          </Button>
          <Button variant="ghost" onClick={() => handleExportar("pdf")}>
            <FileText size={14} /> PDF
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2>Agendamentos por período</h2>
          <p className={styles.cardSub}>{dados?.agendamentos?.length || 0} período(s)</p>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dados?.agendamentos || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="periodo" tickFormatter={formatPeriodo}
                  tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
                <Tooltip
                  labelFormatter={formatPeriodo}
                  formatter={(val) => [val, "Agendamentos"]}
                  contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6 }}
                />
                <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.card}>
          <h2>Serviços mais realizados</h2>
          <p className={styles.cardSub}>Por receita gerada</p>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={(dados?.servicos || []).slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--text-secondary)"
                  tickFormatter={(v) => formatMoney(v)} />
                <YAxis type="category" dataKey="nome" width={140}
                  tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
                <Tooltip
                  formatter={(val) => [formatMoney(val), "Receita"]}
                  contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6 }}
                />
                <Bar dataKey="receita" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.card}>
          <h2>Receitas vs Despesas</h2>
          <p className={styles.cardSub}>Comparativo mensal</p>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dados?.financeiro || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--text-secondary)"
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val) => [formatMoney(val)]}
                  contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6 }}
                />
                <Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.card}>
          <h2>Status dos agendamentos</h2>
          <p className={styles.cardSub}>Distribuição geral</p>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={dados?.status || []} dataKey="quantidade" nameKey="label"
                  cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                  label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}>
                  {(dados?.status || []).map((entry) => (
                    <Cell key={entry.status}
                      fill={STATUS_CORES[entry.status] || "#888"} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [val, name]}
                  contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6 }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={styles.card}>
          <h2>Clientes mais frequentes</h2>
          <p className={styles.cardSub}>Por quantidade de agendamentos</p>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {(dados?.clientes_frequentes ?? []).length > 0 ? (
              (dados?.clientes_frequentes ?? []).slice(0, 5).map((c, i) => (
                <div key={c.cliente_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: i === 0 ? "var(--accent)" : "var(--text-secondary)", minWidth: 24 }}>#{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 14 }}>{c.nome}</span>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{c.quantidade}x</span>
                </div>
              ))
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Nenhum dado disponível.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
