import { useAuth } from "../context/useAuth";
import { PageHeader, Button } from "../components/ui";
import styles from "../styles/pages/Dashboard.module.css";

export function Dashboard() {
  const { usuario, tenant, loading } = useAuth();

  if (loading) {
    return (
      <div className={styles.dashLoading}>
        <div className="spinner" />
        <p>Carregando dashboard...</p>
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

      <div className={styles.infoBanner}>
        <span className={styles.infoDot} />
        <span>
          Autenticação multi-tenant ativa · Tenant ID:{" "}
          <code>{tenant?.id?.slice(0, 8) ?? "N/A"}...</code>
        </span>
      </div>

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
          <DebugRow label="RLS Ativo" value="Sim — dados isolados por tenant" accent />
        </div>
      </div>
    </>
  );
}

const DebugRow = ({ label, value, accent }) => (
  <div className={styles.debugRow}>
    <span className={styles.debugKey}>{label}</span>
    <span className={`${styles.debugVal} ${accent ? styles.debugValAccent : ""}`}>{value}</span>
  </div>
);

const STATS = [
  { icon: "📅", label: "Agendamentos hoje", value: "0" },
  { icon: "✅", label: "Serviços realizados", value: "0" },
  { icon: "👥", label: "Total de clientes", value: "0" },
  { icon: "💵", label: "Faturamento mês", value: "R$ 0,00" },
];
