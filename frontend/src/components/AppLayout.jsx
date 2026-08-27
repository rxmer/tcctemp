import { Outlet, useNavigate, NavLink, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/ThemeContext";
import { NotificacaoBell } from "./NotificacaoBell";
import { ChatWidget } from "./ChatWidget";
import { configuracaoEmpresaService } from "../services/configuracao-empresa.service";
import styles from "../styles/components/AppLayout.module.css";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  DollarSign,
  MessageCircle,
  BarChart3,
  Settings,
  ChevronDown,
  UserCircle,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";

const NAV_GROUPS = [
  { label: "Início", icon: LayoutDashboard, path: "/dashboard" },
  {
    label: "Agenda",
    icon: CalendarDays,
    items: [
      { label: "Agendamentos", path: "/agendamentos" },
      { label: "Ordens de Serviço", path: "/ordens-servico" },
      { label: "Expediente", path: "/expediente", adminOnly: true },
      { label: "Feriados", path: "/feriados", adminOnly: true },
    ],
  },
  {
    label: "Cadastros",
    icon: Users,
    items: [
      { label: "Clientes", path: "/clientes" },
      { label: "Veículos", path: "/veiculos" },
      { label: "Serviços", path: "/servicos" },
    ],
  },
  {
    label: "Financeiro",
    icon: DollarSign,
    adminOnly: true,
    items: [
      { label: "Visão Geral", path: "/financeiro", exact: true },
      { label: "Contas a Pagar", path: "/financeiro/contas-pagar" },
      { label: "Faturamentos", path: "/financeiro/faturamentos" },
    ],
  },
  {
    label: "WhatsApp",
    icon: MessageCircle,
    adminOnly: true,
    items: [
      { label: "Conexão", path: "/whatsapp", exact: true },
      { label: "Conversas", path: "/whatsapp/conversas" },
      { label: "Comunicados", path: "/comunicados" },
    ],
  },
  {
    label: "Relatórios",
    icon: BarChart3,
    adminOnly: true,
    items: [
      { label: "Visão Geral", path: "/relatorios", exact: true },
      { label: "Agendamentos", path: "/relatorios/agendamentos" },
      { label: "Serviços", path: "/relatorios/servicos" },
      { label: "Receitas vs Despesas", path: "/relatorios/financeiro" },
      { label: "Clientes Frequentes", path: "/relatorios/clientes" },
    ],
  },
  {
    label: "Empresa",
    icon: Settings,
    adminOnly: true,
    items: [
      { label: "Dados da Empresa", path: "/configuracao-empresa" },
      { label: "Funcionários", path: "/funcionarios" },
    ],
  },
];

function grupoAtivo(grupo, pathname) {
  const itens = grupo.items ?? [{ path: grupo.path }];
  return itens.some((i) => pathname === i.path || pathname.startsWith(i.path + "/"));
}

export function AppLayout() {
  const { tenant, usuario, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [openMenu, setOpenMenu] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGrupoAberto, setMobileGrupoAberto] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const navRef = useRef(null);
  const userRef = useRef(null);
  const hoverCloseTimer = useRef(null);

  function abrirNoHover(label) {
    if (hoverCloseTimer.current) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
    setOpenMenu(label);
  }

  function fecharComAtraso() {
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = setTimeout(() => setOpenMenu(null), 150);
  }

  useEffect(() => () => {
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
  }, []);

  useEffect(() => {
    function fetchEmpresa() {
      configuracaoEmpresaService.buscar().then((d) => {
        setEmpresa(d);
        if (d?.nome_fantasia) {
          document.title = `${d.nome_fantasia} — Gestão de Estética Automotiva`;
        }
      }).catch(() => {});
    }
    fetchEmpresa();
    window.addEventListener("empresa-salva", fetchEmpresa);
    return () => window.removeEventListener("empresa-salva", fetchEmpresa);
  }, []);

  useEffect(() => {
    setOpenMenu(null);
    setUserMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleOutside(e) {
      const dentroNav = navRef.current && navRef.current.contains(e.target);
      const dentroUser = userRef.current && userRef.current.contains(e.target);
      if (!dentroNav && !dentroUser) {
        setOpenMenu(null);
        setUserMenuOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (err) {
      console.error("[LOGOUT] erro:", err);
    }
  };

  const gruposVisiveis = NAV_GROUPS.filter((g) => !g.adminOnly || isAdmin);

  return (
    <div className={styles.dashLayout}>
      {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)} />}

      <header className={styles.topbar}>
        <div className={styles.brand}>
          <button className={styles.hamburger} onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Menu size={22} />
          </button>
          {empresa?.logo_url ? (
            <img src={empresa.logo_url} alt="Logo" className={styles.brandLogo} />
          ) : (
            <img src="/esteticar.png" alt="EstetiCar" className={styles.brandLogo} />
          )}
          <span className={styles.brandName}>{empresa?.nome_fantasia || tenant?.nome}</span>
        </div>

        <nav className={styles.navDesktop} ref={navRef}>
          {gruposVisiveis.map((grupo) =>
            grupo.items ? (
              <div key={grupo.label} className={styles.navGroupWrap}
                onMouseEnter={() => abrirNoHover(grupo.label)}
                onMouseLeave={fecharComAtraso}
              >
                <button
                  className={`${styles.navLink} ${grupoAtivo(grupo, location.pathname) ? styles.navLinkActive : ""}`}
                  onClick={() => setOpenMenu(openMenu === grupo.label ? null : grupo.label)}
                >
                  <grupo.icon size={16} />
                  {grupo.label}
                  <ChevronDown size={14} className={`${styles.chevron} ${openMenu === grupo.label ? styles.chevronUp : ""}`} />
                </button>
                {openMenu === grupo.label && (
                  <div className={styles.dropdown}>
                    {grupo.items.filter((i) => !i.adminOnly || isAdmin).map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.exact}
                        className={({ isActive }) => `${styles.dropdownItem} ${isActive ? styles.dropdownItemActive : ""}`}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={grupo.label}
                to={grupo.path}
                className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
              >
                <grupo.icon size={16} />
                {grupo.label}
              </NavLink>
            )
          )}
        </nav>

        <div className={styles.topbarRight}>
          <NotificacaoBell />
          <button className={styles.iconBtn} onClick={toggleTheme} title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <div className={styles.navGroupWrap} ref={userRef}>
            <button
              className={`${styles.userBtn} ${userMenuOpen ? styles.navLinkActive : ""}`}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <UserCircle size={18} />
              <span className={styles.userName}>{usuario?.nome?.split(" ")[0] || "Conta"}</span>
              <ChevronDown size={13} className={`${styles.chevron} ${userMenuOpen ? styles.chevronUp : ""}`} />
            </button>
            {userMenuOpen && (
              <div className={`${styles.dropdown} ${styles.dropdownRight}`}>
                <NavLink to="/perfil" className={styles.dropdownItem}>Meu Perfil</NavLink>
                <button className={styles.dropdownItemDanger} onClick={handleLogout}>
                  <LogOut size={14} /> Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className={styles.mobileDrawer}>
          <div className={styles.mobileHead}>
            <span className={styles.brandName}>{empresa?.nome_fantasia || tenant?.nome}</span>
            <button className={styles.closeBtn} onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
              <X size={20} />
            </button>
          </div>
          <nav className={styles.mobileNav}>
            {gruposVisiveis.map((grupo) =>
              grupo.items ? (
                <div key={grupo.label}>
                  <button
                    className={styles.mobileGrupoBtn}
                    onClick={() => setMobileGrupoAberto(mobileGrupoAberto === grupo.label ? null : grupo.label)}
                  >
                    <grupo.icon size={16} />
                    {grupo.label}
                    <ChevronDown size={14} className={`${styles.chevron} ${mobileGrupoAberto === grupo.label ? styles.chevronUp : ""}`} />
                  </button>
                  {mobileGrupoAberto === grupo.label && (
                    <div className={styles.mobileSubnav}>
                      {grupo.items.filter((i) => !i.adminOnly || isAdmin).map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          end={item.exact}
                          className={({ isActive }) => `${styles.mobileItem} ${isActive ? styles.mobileItemActive : ""}`}
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  key={grupo.label}
                  to={grupo.path}
                  className={({ isActive }) => `${styles.mobileGrupoBtn} ${isActive ? styles.mobileItemActive : ""}`}
                >
                  <grupo.icon size={16} />
                  {grupo.label}
                </NavLink>
              )
            )}
            <button className={styles.mobileLogout} onClick={handleLogout}>
              <LogOut size={15} /> Sair
            </button>
          </nav>
        </div>
      )}

      <main className={styles.dashMain}>
        <Outlet />
      </main>

      <ChatWidget />
    </div>
  );
}
