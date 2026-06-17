import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import styles from "../styles/components/AppLayout.module.css";

const NAV_ITEMS = [
  { icon: "⊞", label: "Dashboard", path: "/dashboard" },
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
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (err) {
      console.error("[LOGOUT] erro:", err);
    }
  };

  return (
    <div className={styles.dashLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandIconSm}>
            <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
              <path d="M4 20L8 8H20L24 20H4Z" stroke="#e85d04" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="9" cy="22" r="2" fill="#e85d04" />
              <circle cx="19" cy="22" r="2" fill="#e85d04" />
            </svg>
          </div>
          <div>
            <div className={styles.sidebarTenant}>{tenant?.nome}</div>
            <div className={styles.sidebarSub}>Sistema de Gestão</div>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <a
              key={item.label}
              href={item.path}
              className={`${styles.navItem} ${location.pathname === item.path ? styles.navItemActive : ""}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.path);
              }}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
              {item.badge && <span className={styles.navBadge}>{item.badge}</span>}
            </a>
          ))}
        </nav>

        <button className={styles.sidebarLogout} onClick={handleLogout}>
          <span>⎋</span> Sair
        </button>
      </aside>

      <main className={styles.dashMain}>
        <Outlet />
      </main>
    </div>
  );
}
