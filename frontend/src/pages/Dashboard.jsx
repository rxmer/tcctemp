// src/pages/Dashboard.jsx
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";

export function Dashboard() {
  const { usuario, tenant, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon-sm">
            <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
              <path
                d="M4 20L8 8H20L24 20H4Z"
                stroke="#e85d04"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="22" r="2" fill="#e85d04" />
              <circle cx="19" cy="22" r="2" fill="#e85d04" />
            </svg>
          </div>
          <div>
            <div className="sidebar-tenant">{tenant?.nome}</div>
            <div className="sidebar-sub">Sistema de Gestão</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map(
            (item) => (
              <a
                key={item.label}
                href="#"
                className={`nav-item ${item.active ? "active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </a>
            ),
          )}
        </nav>

        <button className="sidebar-logout" onClick={handleLogout}>
          <span>⎋</span> Sair
        </button>
      </aside>

      {/* Main */}
      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1 className="dash-title">Dashboard</h1>
            <p className="dash-sub">
              Bem-vindo, {usuario?.nome?.split(" ")[0]}!
            </p>
          </div>
          <div className="user-chip">
            <div className="user-avatar">
              {usuario?.nome?.[0]?.toUpperCase()}
            </div>
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
      </main>

      <style>{dashStyles}</style>
    </div>
  );
}

const DebugRow = ({ label, value, accent }) => (
  <div className="debug-row">
    <span className="debug-key">{label}</span>
    <span className={`debug-val ${accent ? "accent" : ""}`}>{value}</span>
  </div>
);

const NAV_ITEMS = [
  { icon: "⊞", label: "Dashboard", active: true },
  { icon: "👥", label: "Clientes" },
  { icon: "🚗", label: "Veículos" },
  { icon: "✨", label: "Serviços" },
  { icon: "📅", label: "Agendamentos", badge: "3" },
  { icon: "📋", label: "Ordem de Serviço" },
  { icon: "💰", label: "Financeiro" },
  { icon: "👤", label: "Funcionários", adminOnly: true },
  { icon: "📊", label: "Relatórios", adminOnly: true },
];

const STATS = [
  { icon: "📅", label: "Agendamentos hoje", value: "0" },
  { icon: "✅", label: "Serviços realizados", value: "0" },
  { icon: "👥", label: "Total de clientes", value: "0" },
  { icon: "💵", label: "Faturamento mês", value: "R$ 0,00" },
];

const dashStyles = `
.dash-layout {
  display: flex; min-height: 100vh;
  background: var(--bg-base);
}

/* SIDEBAR */
.sidebar {
  width: 230px; flex-shrink: 0;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  padding: 20px 12px;
  position: sticky; top: 0; height: 100vh;
}
.sidebar-brand {
  display: flex; align-items: center; gap: 10px;
  padding: 4px 8px 20px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
}
.brand-icon-sm {
  width: 34px; height: 34px; border-radius: 8px;
  background: rgba(232,93,4,0.1); border: 1px solid rgba(232,93,4,0.2);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.sidebar-tenant { font-family: var(--font-display); font-size: 14px; font-weight: 700; line-height: 1.2; }
.sidebar-sub { font-size: 11px; color: var(--text-muted); }

.sidebar-nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px; border-radius: var(--radius-sm);
  font-size: 13px; color: var(--text-secondary);
  text-decoration: none; cursor: pointer;
  transition: all var(--transition);
  position: relative;
}
.nav-item:hover { background: var(--bg-elevated); color: var(--text-primary); }
.nav-item.active { background: var(--accent-dim); color: var(--accent); font-weight: 500; }
.nav-icon { font-size: 14px; width: 18px; text-align: center; }
.nav-badge {
  margin-left: auto; background: var(--accent); color: white;
  font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px;
}
.sidebar-logout {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 10px; border-radius: var(--radius-sm);
  background: none; border: none; cursor: pointer;
  color: var(--text-muted); font-size: 13px;
  transition: all var(--transition); margin-top: 8px;
}
.sidebar-logout:hover { background: rgba(239,68,68,0.1); color: #ef4444; }

/* MAIN */
.dash-main { flex: 1; padding: 32px; display: flex; flex-direction: column; gap: 24px; overflow-y: auto; }

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
