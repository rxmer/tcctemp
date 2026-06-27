import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { PageHeader, Button, SkeletonCard } from "../components/ui";
import { dashboardService } from "../services/dashboard.service";
import styles from "../styles/pages/Dashboard.module.css";

export function Dashboard() {
  const { usuario, tenant, loading } = useAuth();
  const [stats, setStats] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);

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
        <div className={styles.dashErrorIcon}>⚠️</div>
        <h2>Erro ao carregar perfil</h2>
        <p>Não foi possível carregar os dados do usuário. Tente fazer login novamente.</p>
        <Button onClick={() => window.location.reload()}>Recarregar página</Button>
      </div>
    );
  }

  if (dashError) {
    return (
      <div className={styles.dashError}>
        <div className={styles.dashErrorIcon}>⚠️</div>
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

  const STATS = [
    { icon: "📅", label: "Agendamentos hoje", value: String(stats?.agendamentos_hoje ?? 0) },
    { icon: "✅", label: "Serviços realizados", value: String(stats?.servicos_realizados ?? 0) },
    { icon: "👥", label: "Total de clientes", value: String(stats?.total_clientes ?? 0) },
    { icon: "💵", label: "Faturamento mês", value: formatMoney(stats?.faturamento_mes ?? 0) },
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
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.debugCard}>
        <div className={styles.debugTitle}>🔐 Sessão ativa</div>
        <div className={styles.debugGrid}>
          <DebugRow label="Usuário ID" value={usuario?.id?.slice(0, 12) + "..."} />
          <DebugRow label="Tenant ID" value={tenant?.id?.slice(0, 12) + "..."} />
          <DebugRow label="Perfil" value={usuario?.perfil} accent />
          <DebugRow label="Empresa" value={tenant?.nome} />
        </div>
      </div>
    </>
  );
}

function DebugRow({ label, value, accent }) {
  return (
    <div className={styles.debugRow}>
      <span className={styles.debugKey}>{label}</span>
      <span className={`${styles.debugVal} ${accent ? styles.debugValAccent : ""}`}>{value}</span>
    </div>
  );
}
