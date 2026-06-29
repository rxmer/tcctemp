import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/ThemeContext";
import { NotificacaoBell } from "./NotificacaoBell";
import { configuracaoEmpresaService } from "../services/configuracao-empresa.service";
import styles from "../styles/components/AppLayout.module.css";
import {
  LayoutDashboard,
  Users,
  Car,
  Sparkles,
  CalendarDays,
  CalendarX2,
  Settings,
  ClipboardList,
  DollarSign,
  UserCog,
  Clock,
  BarChart3,
  MessageCircle,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Clientes", path: "/clientes" },
  { icon: Car, label: "Veículos", path: "/veiculos" },
  { icon: Sparkles, label: "Serviços", path: "/servicos" },
  { icon: CalendarDays, label: "Agendamentos", path: "/agendamentos" },
  { icon: ClipboardList, label: "Ordem de Serviço", path: "/ordens-servico" },
  { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
  { icon: UserCog, label: "Funcionários", path: "/funcionarios", adminOnly: true },
  { icon: Clock, label: "Expediente", path: "/expediente", adminOnly: true },
  { icon: CalendarX2, label: "Feriados", path: "/feriados", adminOnly: true },
  { icon: Settings, label: "Empresa", path: "/configuracao-empresa", adminOnly: true },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios", adminOnly: true },
  { icon: MessageCircle, label: "WhatsApp", path: "/whatsapp", adminOnly: true },
];

export function AppLayout() {
  const { tenant, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [empresa, setEmpresa] = useState(null);

  useEffect(() => {
    configuracaoEmpresaService.buscar().then((d) => setEmpresa(d)).catch(() => {});
    function handler() {
      configuracaoEmpresaService.buscar().then((d) => setEmpresa(d)).catch(() => {});
    }
    window.addEventListener("empresa-salva", handler);
    return () => window.removeEventListener("empresa-salva", handler);
  }, []);

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
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarBrand}>
          {empresa?.logo_url ? (
            <img src={empresa.logo_url} alt="Logo" style={{ width: 34, height: 34, borderRadius: 8, objectFit: "contain" }} />
          ) : (
          <div className={styles.brandIconSm}>
            <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
              <path d="M4 20L8 8H20L24 20H4Z" stroke="#d4a843" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="9" cy="22" r="2" fill="#d4a843" />
              <circle cx="19" cy="22" r="2" fill="#d4a843" />
            </svg>
          </div>
          )}
          <div>
            <div className={styles.sidebarTenant}>{empresa?.nome_fantasia || tenant?.nome}</div>
            <div className={styles.sidebarSub}>Sistema de Gestão</div>
          </div>
          <button className={styles.closeBtn} onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
          <NotificacaoBell />
        </div>

        <nav className={styles.sidebarNav}>
          {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={18} className={styles.navIcon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button className={styles.themeToggle} onClick={toggleTheme} title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          {theme === "dark" ? "Modo claro" : "Modo escuro"}
        </button>

        <button className={styles.sidebarLogout} onClick={handleLogout}>
          <LogOut size={16} /> Sair
        </button>
      </aside>

      <main className={styles.dashMain}>
        <button className={styles.hamburger} onClick={() => setSidebarOpen(true)}>
          <Menu size={22} />
        </button>
        <Outlet />
      </main>
    </div>
  );
}
