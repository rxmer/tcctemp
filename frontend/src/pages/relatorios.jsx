import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/useAuth";
import { relatoriosService } from "../services/relatorios.service";
import { PageHeader, SkeletonCard } from "../components/ui";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
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

  useEffect(() => {
    async function carregar() {
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
    }
    carregar();
  }, [filtroData]);

  if (loading && !dados) {
    return (
      <>
        <PageHeader title="Relatórios" subtitle="Visão geral da empresa" />
        <SkeletonCard lines={8} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Relatórios" subtitle="Visão geral da empresa"
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
      </div>

      {erro && (
        <div className={styles.errorContainer}>
          <span className={styles.errorMsg}>{erro}</span>
          <button className={styles.retryBtn} onClick={() => setFiltroData(filtroData)}>Tentar novamente</button>
        </div>
      )}

      <div className={styles.grid}>
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
            {(dados?.clientes ?? []).length > 0 ? (
              (dados?.clientes ?? []).slice(0, 5).map((c, i) => (
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
