import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { whatsappService } from "../services/whatsapp.service";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";
import { PageHeader, Button, SkeletonCard } from "../components/ui";
import { AudioRecorder } from "../components/AudioRecorder";
import styles from "../styles/pages/whatsapp.module.css";
import { ArrowLeft, Send, RotateCcw } from "lucide-react";
import { formatPhone } from "../utils/formatPhone";
import { estadoLabel, estadoGrupo } from "../utils/whatsappEstados";

function autorLabel(m, session) {
  if (m.remetente === "cliente") return session?.client_name || "Cliente";
  if (m.remetente === "atendente") return "Atendente";
  return "Bot";
}

function horaLabel(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function badgeClasse(state) {
  const grupo = estadoGrupo(state);
  if (grupo === "atendente") return styles.estadoBadgeAtendente;
  if (grupo === "menu") return styles.estadoBadgeMenu;
  return styles.estadoBadgeAgendando;
}

export function ConversaDetalhe({ id: idProp, embedded = false, onBack }) {
  const { id: idRota } = useParams();
  const id = idProp ?? idRota;
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const { confirm, ConfirmModal } = useConfirm();

  const [session, setSession] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const bubblesRef = useRef(null);

  const carregarMensagens = useCallback(async () => {
    try {
      const data = await whatsappService.getMensagens(id);
      setMensagens(data ?? []);
    } catch {
      /* silencioso durante polling */
    }
  }, [id]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [s] = await Promise.all([
          whatsappService.getSession(id),
          carregarMensagens(),
        ]);
        if (mounted) setSession(s);
      } catch (err) {
        if (mounted) showFeedback("error", err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  usePolling(carregarMensagens, 5000);

  useEffect(() => {
    if (bubblesRef.current) {
      bubblesRef.current.scrollTop = bubblesRef.current.scrollHeight;
    }
  }, [mensagens]);

  async function handleEnviar(e) {
    e.preventDefault();
    const msg = texto.trim();
    if (!msg) return;
    try {
      setEnviando(true);
      await whatsappService.sendReply(id, msg);
      setTexto("");
      await carregarMensagens();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function handleEnviarAudio(blob) {
    try {
      await whatsappService.sendAudio(id, blob);
      await carregarMensagens();
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  async function handleReset() {
    const ok = await confirm("Reiniciar o fluxo do bot para este cliente?");
    if (!ok) return;
    try {
      await whatsappService.resetSessao(id);
      showFeedback("success", "Sessão reiniciada!");
      const s = await whatsappService.getSession(id);
      setSession(s);
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  function voltar() {
    if (onBack) onBack();
    else navigate("/whatsapp/conversas");
  }

  return (
    <>
      {embedded ? (
        <header className={styles.detailTop}>
          <button
            type="button"
            className={styles.detailVoltar}
            onClick={voltar}
            aria-label="Voltar para a lista de conversas"
          >
            <ArrowLeft size={16} />
          </button>
          <div className={styles.detailTitulo}>
            <span className={styles.detailNome}>{session?.client_name || "Conversa"}</span>
            <span className={styles.detailSub}>
              {formatPhone(session?.client_phone) || "—"}
              {session ? (
                <>
                  {formatPhone(session?.client_phone) ? <span aria-hidden="true">·</span> : null}
                  <span className={`${styles.estadoBadge} ${badgeClasse(session.state)}`}>
                    {estadoLabel(session.state)}
                  </span>
                </>
              ) : null}
            </span>
          </div>
          <Button variant="ghost" onClick={handleReset}>
            <RotateCcw size={14} /> Reiniciar
          </Button>
        </header>
      ) : (
        <>
          <PageHeader
            title={session?.client_name || "Conversa"}
            subtitle={formatPhone(session?.client_phone) || ""}
            action={
              <div className={styles.convAcoes}>
                <Button variant="ghost" onClick={() => navigate("/whatsapp/conversas")}>
                  <ArrowLeft size={14} /> Voltar
                </Button>
                <Button variant="ghost" onClick={handleReset}>
                  <RotateCcw size={14} /> Reiniciar bot
                </Button>
              </div>
            }
          />

          {session && (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: -8 }}>
              Estado do bot:{" "}
              <span className={`${styles.estadoBadge} ${badgeClasse(session.state)}`}>
                {estadoLabel(session.state)}
              </span>
            </p>
          )}
        </>
      )}

      <div className={styles.card} style={{ marginTop: embedded ? 0 : 16 }}>
        {loading ? (
          <div style={{ padding: 16 }}>
            <SkeletonCard lines={5} />
          </div>
        ) : (
          <>
            <div className={styles.convBubbles} ref={bubblesRef}>
              {mensagens.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: 14, textAlign: "center", padding: 24 }}>
                  Nenhuma mensagem registrada ainda.
                </p>
              ) : (
                mensagens.map((m) => (
                  <div key={m.id}
                    className={`${styles.bubbleRow} ${m.remetente === "cliente" ? styles.bubbleRowCliente : styles.bubbleRowAtendente}`}>
                    <div className={`${styles.bubble} ${
                      m.remetente === "cliente" ? styles.bubbleCliente
                        : m.remetente === "atendente" ? styles.bubbleAtendente
                        : styles.bubbleBot}`}>
                      <span className={styles.bubbleAutor}>{autorLabel(m, session)}</span>
                      {m.tipo_media === "audio" && m.media_url ? (
                        <audio controls preload="none" src={m.media_url} className={styles.bubbleAudio} />
                      ) : (
                        m.texto
                      )}
                      <span className={styles.bubbleHora}>{horaLabel(m.criado_em)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form className={styles.convInputRow} onSubmit={handleEnviar}>
              <AudioRecorder onSend={handleEnviarAudio} />
              <textarea
                className={styles.convInput}
                placeholder="Responder como atendente..."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleEnviar(e);
                  }
                }}
              />
              <Button type="submit" disabled={enviando || !texto.trim()}>
                <Send size={14} /> Enviar
              </Button>
            </form>
          </>
        )}
      </div>

      <ConfirmModal />
    </>
  );
}
