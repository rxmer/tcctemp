import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { PageHeader, Button, SkeletonCard } from "../components/ui";
import { dashboardService } from "../services/dashboard.service";
import styles from "../styles/pages/Dashboard.module.css";
import { CalendarDays, CheckCircle2, Users, DollarSign, AlertTriangle, CalendarPlus, UserPlus, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Dashboard() {
  const { usuario, tenant, loading } = useAuth();
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
        console.error("Erro dashboard:", err);
      } finally {
        setDashLoading(false);
      }
    }
    carregar();
  }, []);

  if (loading || dashLoading) {
    return (
      <div className={styles.dashLoading}>
        <SkeletonCard lines={6} />
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

  function formatMoney(value) {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}`;
  }

  const STATS = [
    { icon: CalendarDays, label: "Agendamentos hoje", value: String(stats?.agendamentos_hoje ?? 0) },
    { icon: CheckCircle2, label: "Serviços realizados", value: String(stats?.servicos_realizados ?? 0) },
    { icon: Users, label: "Total de clientes", value: String(stats?.total_clientes ?? 0) },
    { icon: DollarSign, label: "Faturamento mês", value: formatMoney(stats?.faturamento_mes ?? 0) },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Bem-vindo, ${usuario?.nome?.split(" ")[0] ?? "usuário"}!`}
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

      <div className={styles.statGrid}>
        {STATS.map((s) => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statIcon}><s.icon size={22} /></div>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.quickActions}>
        <button className={styles.quickBtn} onClick={() => navigate("/agendamentos")}>
          <CalendarPlus size={20} />
          <span>Novo Agendamento</span>
        </button>
        <button className={styles.quickBtn} onClick={() => navigate("/clientes")}>
          <UserPlus size={20} />
          <span>Novo Cliente</span>
        </button>
      </div>

      <div className={styles.proximosSection}>
        <h3 className={styles.sectionTitle}>Próximos Agendamentos</h3>
        {stats?.proximos_agendamentos?.length > 0 ? (
          <div className={styles.proximosList}>
            {stats.proximos_agendamentos.map((ag) => (
              <div key={ag.agendamento_id} className={styles.proximoCard}>
                <div className={styles.proximoTime}>
                  <div>{ag.hora_agendamento?.slice(0, 5)}</div>
                  <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>{formatDate(ag.data_agendamento)}</div>
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
    </>
  );
}
