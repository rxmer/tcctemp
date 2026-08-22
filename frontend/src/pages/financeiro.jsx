import { useState, useEffect } from "react";
import { useFeedback } from "../hooks/useFeedback";
import { useAuth } from "../context/useAuth";
import { financeiroService } from "../services/financeiro.service";
import { Button, PageHeader, SkeletonCard } from "../components/ui";
import { Card, styles as crud } from "../components/crud";
import { TrendingUp, TrendingDown, CheckCircle2, AlertTriangle } from "lucide-react";

export function Financeiro() {
  const { tenant } = useAuth();
  const { feedback, showFeedback } = useFeedback();

  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroData, setFiltroData] = useState("");

  useEffect(() => {
    carregarResumo();
  }, [filtroData]);

  async function carregarResumo() {
    setLoading(true);
    try {
      const params = {};
      if (filtroData) { params.data_inicio = filtroData; params.data_fim = filtroData; }
      const data = await financeiroService.resumo(params);
      setResumo(data);
    } catch (err) {
      console.error("Erro resumo:", err);
      showFeedback("error", "Erro ao carregar resumo financeiro.");
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(value) {
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Visão geral do controle financeiro"
        action={
          <div className={crud.tenantChip}>
            <span className={crud.tenantDot} /><span>{tenant?.nome}</span>
          </div>
        }
      />

      {feedback && <div className={`alert alert-${feedback.type}`} role="alert">{feedback.message}</div>}

      <div className={crud.filtros}>
        <div className={crud.filtroGroup}>
          <label className={crud.filtroLabel}>Filtrar por data</label>
          <input type="date" className={crud.filtroInput} value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)} />
        </div>
        {filtroData && (
          <Button variant="ghost" onClick={() => setFiltroData("")}>Limpar</Button>
        )}
      </div>

      {loading ? (
        <SkeletonCard lines={4} />
      ) : resumo && (
        <div className="responsiveGrid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <Card style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <TrendingUp size={22} color="var(--accent)" />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700 }}>{formatMoney(resumo.receitas.total)}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Total Receitas</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Recebido: {formatMoney(resumo.receitas.recebido)} · A receber: {formatMoney(resumo.receitas.a_receber)}
            </div>
          </Card>
          <Card style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <TrendingDown size={22} color="var(--error)" />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700 }}>{formatMoney(resumo.despesas.total)}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Total Despesas</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Pago: {formatMoney(resumo.despesas.pago)} · A pagar: {formatMoney(resumo.despesas.a_pagar)}
            </div>
          </Card>
          <Card style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8, alignItems: "center", borderColor: resumo.saldo >= 0 ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)" }}>
            {resumo.saldo >= 0 ? <CheckCircle2 size={22} color="var(--success)" /> : <AlertTriangle size={22} color="var(--error)" />}
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: resumo.saldo >= 0 ? "#86efac" : "#fca5a5" }}>{formatMoney(resumo.saldo)}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Saldo</div>
          </Card>
        </div>
      )}
    </>
  );
}
