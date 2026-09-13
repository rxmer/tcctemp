import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFeedback } from "../hooks/useFeedback";
import { useAuth } from "../context/useAuth";
import { financeiroService } from "../services/financeiro.service";
import { Button, PageHeader, Alert, TenantChip } from "../components/ui";
import { styles as crud } from "../components/crud";
import styles from "../styles/pages/financeiro.module.css";
import { TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Receipt, Wallet, ChevronRight } from "lucide-react";
import { formatMoney } from "../utils/format";

export function Financeiro() {
  const { tenant } = useAuth();
  const { feedback, showFeedback } = useFeedback();
  const navigate = useNavigate();

  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroData, setFiltroData] = useState("");

  useEffect(() => {
    let active = true;
    const params = {};
    if (filtroData) { params.data_inicio = filtroData; params.data_fim = filtroData; }
    financeiroService.resumo(params)
      .then((data) => { if (active) setResumo(data); })
      .catch((err) => {
        console.error("Erro resumo:", err);
        if (active) showFeedback("error", "Erro ao carregar resumo financeiro.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filtroData, showFeedback]);

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Visão geral do controle financeiro"
        action={<TenantChip nome={tenant?.nome} />}
      />

      {feedback && <Alert variant={feedback.type}>{feedback.message}</Alert>}

      <div className={crud.filtros}>
        <div className={crud.filtroGroup}>
          <label className={crud.filtroLabel}>Filtrar por data</label>
          <input type="date" className={crud.filtroInput} value={filtroData}
            onChange={(e) => { setLoading(true); setFiltroData(e.target.value); }} />
        </div>
        {filtroData && (
          <Button variant="ghost" onClick={() => { setLoading(true); setFiltroData(""); }}>Limpar</Button>
        )}
      </div>

      {loading ? (
        <div className={styles.resumoGrid}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={`skeleton ${styles.skeletonIcon}`} />
              <div className={`skeleton ${styles.skValue}`} />
              <div className={`skeleton ${styles.skLabel}`} />
            </div>
          ))}
        </div>
      ) : resumo && (
        <>
          <div className={styles.resumoGrid}>
            <div className={`${styles.resumoCard} ${styles.receitas}`}>
              <span className={styles.resumoIcon}><TrendingUp size={22} /></span>
              <div className={styles.resumoValue}>{formatMoney(resumo.receitas.total)}</div>
              <div className={styles.resumoLabel}>Total Receitas</div>
              <div className={styles.resumoDet}>
                <div className={`${styles.resumoDetRow} ${styles.done}`}>
                  <span className={styles.resumoDetLabel}>Recebido</span>
                  <span className={styles.resumoDetValue}>{formatMoney(resumo.receitas.recebido)}</span>
                </div>
                <div className={styles.resumoDetRow}>
                  <span className={styles.resumoDetLabel}>A receber</span>
                  <span className={styles.resumoDetValue}>{formatMoney(resumo.receitas.a_receber)}</span>
                </div>
              </div>
            </div>

            <div className={`${styles.resumoCard} ${styles.despesas}`}>
              <span className={styles.resumoIcon}><TrendingDown size={22} /></span>
              <div className={styles.resumoValue}>{formatMoney(resumo.despesas.total)}</div>
              <div className={styles.resumoLabel}>Total Despesas</div>
              <div className={styles.resumoDet}>
                <div className={`${styles.resumoDetRow} ${styles.done}`}>
                  <span className={styles.resumoDetLabel}>Pago</span>
                  <span className={styles.resumoDetValue}>{formatMoney(resumo.despesas.pago)}</span>
                </div>
                <div className={styles.resumoDetRow}>
                  <span className={styles.resumoDetLabel}>A pagar</span>
                  <span className={styles.resumoDetValue}>{formatMoney(resumo.despesas.a_pagar)}</span>
                </div>
              </div>
            </div>

            <div className={`${styles.resumoCard} ${resumo.saldo >= 0 ? styles.saldoPos : styles.saldoNeg}`}>
              <span className={styles.resumoIcon}>
                {resumo.saldo >= 0 ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
              </span>
              <div className={styles.resumoValue}>{formatMoney(resumo.saldo)}</div>
              <div className={styles.resumoLabel}>Saldo</div>
              <span className={styles.resumoTag}>
                {resumo.saldo >= 0 ? "Positivo" : "Negativo"}
              </span>
            </div>
          </div>

          <h3 className={styles.sectionTitle}>Acesso rápido</h3>
          <div className={styles.navGrid}>
            <button className={styles.navCard} onClick={() => navigate("/financeiro/contas-pagar")}>
              <span className={styles.navIcon}><Receipt size={20} /></span>
              <span className={styles.navBody}>
                <span className={styles.navTitle}>Contas a Pagar</span>
                <span className={styles.navDesc}>Cadastre e acompanhe as despesas da empresa</span>
              </span>
              <ChevronRight size={18} className={styles.navChevron} />
            </button>
            <button className={styles.navCard} onClick={() => navigate("/financeiro/faturamentos")}>
              <span className={styles.navIcon}><Wallet size={20} /></span>
              <span className={styles.navBody}>
                <span className={styles.navTitle}>Faturamentos</span>
                <span className={styles.navDesc}>Receitas geradas pelas ordens de serviço</span>
              </span>
              <ChevronRight size={18} className={styles.navChevron} />
            </button>
          </div>
        </>
      )}
    </>
  );
}