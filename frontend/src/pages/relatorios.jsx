import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth";
import { relatoriosService } from "../services/relatorios.service";
import { PageHeader, Button, SkeletonCard } from "../components/ui";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import styles from "../styles/pages/relatorios.module.css";

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

  const carregar = useCallback(async () => {
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
      setDados(data);
    } catch (err) {
      setErro("Erro ao carregar relatórios. Tente novamente.");
    } finally {
      setLoading(false);
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
          <Button onClick={() => relatoriosService.exportarExcel(getFiltros())}>
            📥 Excel
          </Button>
          <Button variant="ghost" onClick={() => relatoriosService.exportarPDF(getFiltros())}>
            📄 PDF
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
      </div>
    </>
  );
}
