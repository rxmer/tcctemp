// src/pages/Dashboard.jsx
import { useAuth } from "../context/useAuth";

export function Dashboard() {
  const { usuario, tenant } = useAuth();

  return (
    <>
      <header className="dash-header">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-sub">Bem-vindo, {usuario?.nome?.split(" ")[0]}!</p>
        </div>
        <div className="user-chip">
          <div className="user-avatar">{usuario?.nome?.[0]?.toUpperCase()}</div>
          <div>
            <div className="user-name">{usuario?.nome}</div>
            <div className="user-role">
              {usuario?.perfil === "admin" ? "Administrador" : "Funcionário"}
            </div>
          </div>
        </div>
      </header>

      {/* Tenant info card */}
      <div className="info-banner">
        <span className="info-dot" />
        <span>
          Autenticação multi-tenant ativa · Tenant ID:{" "}
          <code>{tenant?.id?.slice(0, 8)}...</code>
        </span>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        {STATS.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Auth debug info */}
      <div className="debug-card">
        <div className="debug-title">🔐 Sessão ativa</div>
        <div className="debug-grid">
          <DebugRow
            label="Usuário ID"
            value={usuario?.id?.slice(0, 12) + "..."}
          />
          <DebugRow
            label="Tenant ID"
            value={tenant?.id?.slice(0, 12) + "..."}
          />
          <DebugRow label="Perfil" value={usuario?.perfil} accent />
          <DebugRow label="Empresa" value={tenant?.nome} />
          <DebugRow
            label="RLS Ativo"
            value="Sim — dados isolados por tenant"
            accent
          />
        </div>
      </div>

      <style>{dashStyles}</style>
    </>
  );
}

const DebugRow = ({ label, value, accent }) => (
  <div className="debug-row">
    <span className="debug-key">{label}</span>
    <span className={`debug-val ${accent ? "accent" : ""}`}>{value}</span>
  </div>
);

const STATS = [
  { icon: "📅", label: "Agendamentos hoje", value: "0" },
  { icon: "✅", label: "Serviços realizados", value: "0" },
  { icon: "👥", label: "Total de clientes", value: "0" },
  { icon: "💵", label: "Faturamento mês", value: "R$ 0,00" },
];

const dashStyles = `
.dash-header {
  display: flex; align-items: flex-start; justify-content: space-between;
}
.dash-title { font-family: var(--font-display); font-size: 28px; font-weight: 700; }
.dash-sub { color: var(--text-secondary); font-size: 14px; margin-top: 2px; }

.user-chip {
  display: flex; align-items: center; gap: 10px;
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 8px 14px;
}
.user-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--accent); color: white;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display); font-weight: 700; font-size: 14px;
}
.user-name { font-size: 13px; font-weight: 500; }
.user-role { font-size: 11px; color: var(--text-muted); }

.info-banner {
  display: flex; align-items: center; gap: 10px;
  background: rgba(232,93,4,0.06); border: 1px solid rgba(232,93,4,0.15);
  border-radius: var(--radius-sm); padding: 10px 14px;
  font-size: 12px; color: var(--text-secondary);
}
.info-dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--success); flex-shrink: 0;
  box-shadow: 0 0 6px var(--success);
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
code { background: var(--bg-elevated); padding: 1px 6px; border-radius: 4px; font-size: 11px; color: var(--accent); }

.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.stat-card {
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 20px;
  display: flex; flex-direction: column; gap: 8px;
}
.stat-icon { font-size: 20px; }
.stat-value { font-family: var(--font-display); font-size: 26px; font-weight: 700; }
.stat-label { font-size: 12px; color: var(--text-secondary); }

.debug-card {
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 20px;
}
.debug-title { font-family: var(--font-display); font-size: 15px; font-weight: 600; margin-bottom: 14px; }
.debug-grid { display: flex; flex-direction: column; gap: 8px; }
.debug-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.debug-key { color: var(--text-muted); }
.debug-val { font-family: monospace; font-size: 12px; color: var(--text-secondary); }
.debug-val.accent { color: var(--accent); font-weight: 600; font-family: var(--font-body); }
`;
