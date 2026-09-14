import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { whatsappService } from "../services/whatsapp.service";
import { useFeedback } from "../hooks/useFeedback";
import { useDebouncedEffect } from "../hooks/useDebouncedEffect";
import { PageHeader, SkeletonCard, Alert, Select, Pagination, Button } from "../components/ui";
import styles from "../styles/pages/whatsapp.module.css";
import { formatPhone } from "../utils/formatPhone";

const LIMIT = 20;

const ORDEM_OPCOES = [
  ["recentes", "Mais recentes"],
  ["nome", "Nome A-Z"],
];

const ESTADO_OPCOES = [
  ["atendente", "Com atendente"],
  ["menu", "No menu"],
  ["agendando", "Agendando"],
];

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

function estadoLabel(estado) {
  if (!estado) return "";
  const t = estado.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function WhatsAppConversas() {
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [ordem, setOrdem] = useState("recentes");
  const [estado, setEstado] = useState("");
  const [busca, setBusca] = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const [conectado, setConectado] = useState(true);
  const [statusCheckado, setStatusCheckado] = useState(false);
  const { feedback, showFeedback } = useFeedback();
  const navigate = useNavigate();
  useDebouncedEffect(() => {
    setPage(1);
    setBusca(buscaInput.trim());
  }, [buscaInput]);

  useEffect(() => {
    let ativo = true;
    whatsappService
      .getStatus()
      .then((st) => { if (ativo) setConectado(st?.status === "connected"); })
      .catch(() => { if (ativo) setConectado(false); })
      .finally(() => {
        if (ativo) {
          setStatusCheckado(true);
          setLoading(false);
        }
      });

    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!statusCheckado) return;
    if (!conectado) {
      setSessions([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    let ativo = true;
    async function carregar() {
      try {
        setLoading(true);
        const result = await whatsappService.listSessions({
          page,
          limit: LIMIT,
          ordem,
          estado,
          busca,
        });

        if (!ativo) return;
        const lista = Array.isArray(result) ? result : (result?.data ?? []);
        setSessions(lista);
        setTotal(result?.total ?? lista.length);
      } catch (err) {
        if (ativo) showFeedback("error", err.message);
      } finally {
        if (ativo) setLoading(false);
      }
    }

    carregar();
    return () => { ativo = false; };
  }, [conectado, statusCheckado, page, ordem, estado, busca]);

  function handleOrdem(e) {
    setPage(1);
    setOrdem(e.target.value);
  }

  function handleEstado(e) {
    setPage(1);
    setEstado(e.target.value);
  }

  return (
    <>
      <PageHeader
        title="Conversas WhatsApp"
        subtitle="Histórico de conversas com clientes pelo chatbot"
      />

      {feedback && <Alert variant={feedback.type}>{feedback.message}</Alert>}

      <div className={styles.card} style={{ marginTop: 0 }}>
        <div className={styles.cardHeader}>
          <h2>Conversas</h2>
          <p>{total} conversa(s) encontrada(s)</p>
        </div>

        {conectado && (
          <div className={styles.toolbar}>
            <input
              type="search"
              className={styles.toolbarSearch}
              placeholder="Buscar por nome ou telefone..."
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
              aria-label="Buscar conversas"
            />
            <Select
              name="ordem"
              aria-label="Ordenar conversas"
              value={ordem}
              onChange={handleOrdem}
              options={ORDEM_OPCOES}
              placeholder={null}
              wrapperClassName={styles.toolbarField}
              className={`input-field ${styles.toolbarSelect}`}
            />
            <Select
              name="estado"
              aria-label="Filtrar por situação"
              value={estado}
              onChange={handleEstado}
              options={ESTADO_OPCOES}
              placeholder="Todas as situações"
              wrapperClassName={styles.toolbarField}
              className={`input-field ${styles.toolbarSelect}`}
            />
          </div>
        )}

        {!conectado ? (
          <div className={styles.emptyState}>
            <p>WhatsApp não conectado.</p>
            <p style={{ marginTop: 4 }}>Conecte para visualizar e responder as conversas do chatbot.</p>
            <div style={{ marginTop: 16 }}>
              <Button className="btn-whatsapp" onClick={() => navigate("/whatsapp")}>
                Conectar WhatsApp
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div style={{ padding: 16 }}><SkeletonCard lines={4} /></div>
        ) : sessions.length === 0 ? (
          <div className={styles.emptyState}>
            {busca || estado
              ? "Nenhuma conversa encontrada com os filtros atuais."
              : "Nenhuma conversa ainda. O chatbot começará a registrar as conversas assim que for conectado."}
          </div>
        ) : (
          <div className={styles.sessionsGrid}>
            {sessions.map((s) => (
              <div key={s.id} className={`${styles.sessionCard} ${styles.convCard}`}
                onClick={() => navigate(`/whatsapp/conversas/${s.id}`)}
                title="Abrir conversa">
                <div className={styles.sessionName}>{s.client_name ?? "Cliente"}</div>
                <div className={styles.sessionPhone}>{formatPhone(s.client_phone) || "—"}</div>
                <div className={styles.sessionMeta}>
                  <span className={styles.estadoBadge}>{estadoLabel(s.state)}</span>
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

        <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
      </div>
    </>
  );
}