import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { whatsappService } from "../services/whatsapp.service";
import { formatPhone } from "../utils/formatPhone";
import { useAuth } from "../context/useAuth";
import styles from "../styles/components/WhatsAppFab.module.css";
import { MessageCircle, X } from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const agora = new Date();
  const diffMs = agora - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function WhatsAppFab() {
  const { isAdmin } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    if (!isAdmin) return;

    let mounted = true;

    async function fetchCount() {
      try {
        const { count } = await whatsappService.getUnreadCount();
        if (mounted) setUnreadCount(count);
      } catch {
        /* polling — falha silenciosa */
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAdmin]);

  async function handleToggle() {
    if (!isOpen) {
      setLoading(true);
      try {
        const data = await whatsappService.listSessions();
        setSessions(data.slice(0, 10));
      } catch {
        /* ignorado */
      }
      setLoading(false);
    }
    setIsOpen(!isOpen);
  }

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleOpenConversation(id) {
    setIsOpen(false);
    navigate(`/whatsapp/conversas/${id}`);
  }

  if (!isAdmin) return null;

  return (
    <div className={styles.container} ref={ref}>
      <button
        className={styles.fab}
        onClick={handleToggle}
        title="Conversas WhatsApp"
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        {unreadCount > 0 && !isOpen && (
          <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.popup}>
          <div className={styles.header}>
            <strong>Conversas</strong>
            <button
              className={styles.viewAll}
              onClick={() => {
                setIsOpen(false);
                navigate("/whatsapp/conversas");
              }}
            >
              Ver todas
            </button>
          </div>
          <div className={styles.list}>
            {loading ? (
              <div className={styles.empty}>Carregando...</div>
            ) : sessions.length === 0 ? (
              <div className={styles.empty}>Nenhuma conversa ativa</div>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className={styles.sessionItem}
                  onClick={() => handleOpenConversation(s.id)}
                >
                  <div className={styles.sessionInfo}>
                    <div className={styles.sessionName}>{s.client_name || "Cliente"}</div>
                    <div className={styles.sessionPhone}>{formatPhone(s.client_phone)}</div>
                  </div>
                  <div className={styles.sessionRight}>
                    {s.state === "FALANDO_COM_ATENDENTE" && (
                      <span className={styles.liveBadge}>●</span>
                    )}
                    <span className={styles.sessionTime}>{formatDate(s.ultima_atividade)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
