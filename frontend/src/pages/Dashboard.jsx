import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { PageHeader, Button } from "../components/ui";
import { dashboardService } from "../services/dashboard.service";
import styles from "../styles/pages/Dashboard.module.css";
import { CalendarDays, CheckCircle2, Users, DollarSign, AlertTriangle, CalendarPlus, UserPlus, Clock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatMoney } from "../utils/format";

export function Dashboard() {
  const { usuario, loading } = useAuth();
  const [stats, setStats] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function carregar() {
      try {
        const dados = await dashboardService.resumo();
        setStats(dados);
      } catch (err) {
        setDashError("Não foi possível carregar os dados do dashboard.");
        console.error("Erro dashboard:", err.message);
      } finally {
        setDashLoading(false);
      }
    }
    carregar();
  }, []);

  if (loading || dashLoading) {
    return (
      <div className={styles.dashLoading}>
        <div className={styles.skeletonStatGrid}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={styles.skeletonStat}>
              <div className={`${styles.skeletonStatIcon} skeleton`} />
              <div className={`skeleton ${styles.skStatValue}`} />
              <div className={`skeleton ${styles.skStatLabel}`} />
            </div>
          ))}
        </div>
        <div className={styles.skeletonLowerGrid}>
          <div className={styles.skeletonProximos}>
            <div className={`skeleton ${styles.skTitle}`} />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className={styles.skeletonProximo}>
                <div className={`skeleton ${styles.skTime}`} />
                <div className={styles.skListBody}>
                  <div className={`skeleton ${styles.skName}`} />
                  <div className={`skeleton ${styles.skDetail}`} />
                </div>
                <div className={`skeleton ${styles.skPill}`} />
              </div>
            ))}
          </div>
          <div className={styles.skeletonQuick}>
            <div className={`skeleton ${styles.skActionTitle}`} />
            <div className={`skeleton ${styles.skAction}`} />
            <div className={`skeleton ${styles.skAction}`} />
          </div>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className={styles.dashError}>
        <div className={styles.dashErrorIcon}><AlertTriangle size={40} /></div>
        <h2>Erro ao carregar perfil</h2>
        <p>Não foi possível carregar os dados do usuário. Tente fazer login novamente.</p>
        <Button onClick={() => window.location.reload()}>Recarregar página</Button>
      </div>
    );
  }

  if (dashError) {
    return (
      <div className={styles.dashError}>
        <div className={styles.dashErrorIcon}><AlertTriangle size={40} /></div>
        <h2>Erro no dashboard</h2>
        <p>{dashError}</p>
        <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
      </div>
    );
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const [, m, d] = dateStr.split("-");
    return `${d}/${m}`;
  }

const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const ehAdmin = usuario?.perfil === "admin";
  const STATS = [
    { icon: CalendarDays, label: "Agendamentos hoje", value: String(stats?.agendamentos_hoje ?? 0) },
    { icon: CheckCircle2, label: "Serviços realizados", value: String(stats?.servicos_realizados ?? 0) },
    { icon: Users, label: "Total de clientes", value: String(stats?.total_clientes ?? 0) },
    ...(ehAdmin
      ? [{ icon: DollarSign, label: "Faturamento mês", value: formatMoney(stats?.faturamento_mes ?? 0) }]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={hoje}
        action={
          <div className={styles.userChip}>
            <div className={styles.userAvatar}>{usuario?.nome?.[0]?.toUpperCase() ?? "?"}</div>
            <div>
              <div className={styles.userName}>{usuario?.nome ?? "Sem nome"}</div>
              <div className={styles.userRole}>{usuario?.perfil === "admin" ? "Administrador" : "Funcionário"}</div>
            </div>
          </div>
        }
      />

      <div className={styles.dashContent}>
        <div className={styles.statGrid}>
          {STATS.map((s) => (
            <div key={s.label} className={styles.statCard}>
              <div className={styles.statIcon}><s.icon size={22} /></div>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className={styles.lowerGrid}>
          <div className={styles.proximosSection}>
            <h3 className={styles.sectionTitle}>Próximos Agendamentos</h3>
            {stats?.proximos_agendamentos?.length > 0 ? (
              <div className={styles.proximosList}>
                {stats.proximos_agendamentos.map((ag) => (
                  <div key={ag.agendamento_id} className={styles.proximoCard}>
                    <div className={styles.proximoTime}>
                      <div>{ag.hora_agendamento?.slice(0, 5)}</div>
                      <div className={styles.proximoDate}>{formatDate(ag.data_agendamento)}</div>
                    </div>
                    <div className={styles.proximoInfo}>
                      <div className={styles.proximoCliente}>{ag.cliente?.nome ?? "Cliente"}</div>
                      <div className={styles.proximoDetalhe}>
                        {ag.servico?.nome_servico} · {ag.veiculo ? `${ag.veiculo.marca} ${ag.veiculo.modelo}` : "—"}
                      </div>
                    </div>
                    <span className={`${styles.proximoStatus} ${ag.status === "confirmado" ? styles.statusConfirmado : styles.statusPendente}`}>
                      {ag.status === "confirmado" ? "Confirmado" : "Pendente"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyProximos}>
                <Clock size={20} />
                <p>Nenhum agendamento próximo.</p>
              </div>
            )}
          </div>

          <aside className={styles.quickCol}>
            <h3 className={styles.quickTitle}>Ações rápidas</h3>
            <button className={styles.quickBtn} onClick={() => navigate("/agendamentos")}>
              <CalendarPlus size={20} />
              <span>Novo Agendamento</span>
              <ChevronRight size={18} className={styles.quickChevron} />
            </button>
            <button className={styles.quickBtn} onClick={() => navigate("/clientes")}>
              <UserPlus size={20} />
              <span>Novo Cliente</span>
              <ChevronRight size={18} className={styles.quickChevron} />
            </button>
          </aside>
        </div>
      </div>
    </>
  );
}
