import { useState, useEffect, useRef } from "react";
import { whatsappService } from "../services/whatsapp.service";
import { useFeedback } from "../hooks/useFeedback";
import { PageHeader, SkeletonCard } from "../components/ui";
import styles from "../styles/pages/whatsapp.module.css";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WhatsAppConversas() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { feedback, showFeedback } = useFeedback();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    async function load() {
      try {
        setLoading(true);
        const data = await whatsappService.listSessions();
        if (mounted.current) setSessions(data);
      } catch (err) {
        if (mounted.current) showFeedback("error", err.message);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }

    load();
    return () => { mounted.current = false; };
  }, []);

  return (
    <>
      <PageHeader
        title="Conversas WhatsApp"
        subtitle="Histórico de conversas com clientes pelo chatbot"
      />

      {feedback && <div className={`alert alert-${feedback.type}`}>{feedback.message}</div>}

      <div className={styles.card} style={{ marginTop: 0 }}>
        <div className={styles.cardHeader}>
          <h2>Últimas conversas</h2>
          <p>{sessions.length} conversa(s)</p>
        </div>

        {loading ? (
          <div style={{ padding: 16 }}><SkeletonCard lines={4} /></div>
        ) : sessions.length === 0 ? (
          <div className={styles.emptyState}>
            Nenhuma conversa ainda. O chatbot começará a registrar as conversas assim que for conectado.
          </div>
        ) : (
          <div className={styles.sessionsGrid}>
            {sessions.map((s) => (
              <div key={s.id} className={styles.sessionCard}>
                <div className={styles.sessionName}>{s.client_name ?? "Cliente"}</div>
                <div className={styles.sessionPhone}>{s.client_phone ?? "—"}</div>
                <div className={styles.sessionMeta}>
                  <span>Estado: {s.state}</span>
                  <span>•</span>
                  <span>{formatDate(s.ultima_atividade)}</span>
                </div>
                {s.ultima_mensagem && (
                  <div className={styles.sessionLastMsg}>{s.ultima_mensagem}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
