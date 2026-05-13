// src/components/AppLayout.jsx
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const NAV_ITEMS = [
  { icon: "⊞", label: "Dashboard", path: "/dashboard", active: true },
  { icon: "👥", label: "Clientes", path: "/clientes" },
  { icon: "🚗", label: "Veículos", path: "/veiculos" },
  { icon: "✨", label: "Serviços", path: "/servicos" },
  { icon: "📅", label: "Agendamentos", path: "/agendamentos", badge: "3" },
  { icon: "📋", label: "Ordem de Serviço", path: "/ordens" },
  { icon: "💰", label: "Financeiro", path: "/financeiro" },
  { icon: "👤", label: "Funcionários", path: "/funcionarios", adminOnly: true },
  { icon: "📊", label: "Relatórios", path: "/relatorios", adminOnly: true },
];

export function AppLayout() {
  const { tenant, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    console.log("[LOGOUT] clicou");
    try {
      await signOut();
      console.log("[LOGOUT] signOut ok, navegando");
      navigate("/login");
    } catch (err) {
      console.error("[LOGOUT] erro:", err);
    }
  };

  return (
    <div className="dash-layout">
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
                href={item.path}
                className={`nav-item ${window.location.pathname === item.path ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.path);
                }}
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

      <main className="dash-main">
        <Outlet />
      </main>

      <style>{layoutStyles}</style>
    </div>
  );
}

const layoutStyles = `
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
`;
