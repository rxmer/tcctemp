import { useState, useEffect, useRef, useCallback } from "react";
import { whatsappService } from "../services/whatsapp.service";
import styles from "./ChatWidget.module.css";
import { MessageCircle, X, ArrowLeft, Send, RotateCcw } from "lucide-react";

function autorLabel(m, session) {
  if (m.remetente === "cliente") return session?.client_name || "Cliente";
  if (m.remetente === "atendente") return "Atendente";
  return "Bot";
}

function horaLabel(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function estadoLabel(estado) {
  if (!estado) return "";
  const t = estado.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatPhone(phone) {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState({ total: 0, sessoes: [] });
  const [sessoes, setSessoes] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const bubblesRef = useRef(null);

  const carregarUnread = useCallback(async () => {
    try {
      const data = await whatsappService.getUnreadCount();
      setUnread(data);
    } catch { /* silencioso */ }
  }, []);

  const carregarSessoes = useCallback(async () => {
    try {
      const data = await whatsappService.listSessions();
      setSessoes(data ?? []);
    } catch { /* silencioso */ }
  }, []);

  const carregarMensagens = useCallback(async () => {
    if (!activeSession) return;
    try {
      const data = await whatsappService.getMensagens(activeSession.id);
      setMensagens(data ?? []);
    } catch { /* silencioso */ }
  }, [activeSession]);

  useEffect(() => {
    carregarUnread();
    const intervalo = setInterval(carregarUnread, 30000);
    return () => clearInterval(intervalo);
  }, [carregarUnread]);

  useEffect(() => {
    if (open && !activeSession) {
      carregarSessoes();
    }
  }, [open, activeSession, carregarSessoes]);

  useEffect(() => {
    if (activeSession) {
      carregarMensagens();
      const intervalo = setInterval(carregarMensagens, 5000);
      return () => clearInterval(intervalo);
    }
  }, [activeSession, carregarMensagens]);

  useEffect(() => {
    if (bubblesRef.current) {
      bubblesRef.current.scrollTop = bubblesRef.current.scrollHeight;
    }
  }, [mensagens]);

  function abrirConversa(sess) {
    setActiveSession(sess);
    setMensagens([]);
  }

  function voltarLista() {
    setActiveSession(null);
    setMensagens([]);
    carregarSessoes();
    carregarUnread();
  }

  async function handleEnviar(e) {
    e.preventDefault();
    const msg = texto.trim();
    if (!msg || !activeSession) return;
    try {
      setEnviando(true);
      await whatsappService.sendReply(activeSession.id, msg);
      setTexto("");
      await carregarMensagens();
    } catch { /* silencioso */ } finally {
      setEnviando(false);
    }
  }

  async function handleReset() {
    if (!activeSession) return;
    try {
      await whatsappService.resetSessao(activeSession.id);
      const s = await whatsappService.getSession(activeSession.id);
      setActiveSession(s);
    } catch { /* silencioso */ }
  }

  function handleToggle() {
    setOpen((v) => !v);
    if (!open) {
      setActiveSession(null);
      setMensagens([]);
    }
  }

  return (
    <>
      {open && <div className={styles.overlay} onClick={handleToggle} />}

      {open && (
        <div className={styles.panel}>
          {activeSession ? (
            <div className={styles.chatView}>
              <div className={styles.chatHeader}>
                <button className={styles.chatBack} onClick={voltarLista}>
                  <ArrowLeft size={16} />
                </button>
                <div className={styles.chatHeaderInfo}>
                  <div className={styles.chatHeaderName}>{activeSession.client_name || "Cliente"}</div>
                  <div className={styles.chatHeaderState}>{estadoLabel(activeSession.state)}</div>
                </div>
                <button className={styles.chatHeaderReset} onClick={handleReset}>
                  <RotateCcw size={12} /> Bot
                </button>
              </div>

              <div className={styles.bubbles} ref={bubblesRef}>
                {mensagens.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>
                    Nenhuma mensagem.
                  </p>
                ) : (
                  mensagens.map((m) => (
                    <div key={m.id}
                      className={`${styles.bubbleRow} ${m.remetente === "cliente" ? styles.bubbleRowCliente : styles.bubbleRowAtendente}`}>
                      <div className={`${styles.bubble} ${
                        m.remetente === "cliente" ? styles.bubbleCliente
                          : m.remetente === "atendente" ? styles.bubbleAtendente
                          : styles.bubbleBot}`}>
                        <span className={styles.bubbleAutor}>{autorLabel(m, activeSession)}</span>
                        {m.texto}
                        <span className={styles.bubbleHora}>{horaLabel(m.criado_em)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form className={styles.chatInputRow} onSubmit={handleEnviar}>
                <textarea
                  className={styles.chatInput}
                  placeholder="Responder..."
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleEnviar(e);
                    }
                  }}
                />
                <button type="submit" className={styles.chatSend} disabled={enviando || !texto.trim()}>
                  <Send size={14} />
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>Conversas WhatsApp</span>
                <button className={styles.panelClose} onClick={handleToggle}>
                  <X size={18} />
                </button>
              </div>
              <div className={styles.sessionList}>
                {sessoes.length === 0 ? (
                  <div className={styles.emptyState}>Nenhuma conversa ativa.</div>
                ) : (
                  sessoes.map((s) => {
                    const naoLidas = unread.sessoes?.find((u) => u.session_id === s.id)?.nao_lidas ?? 0;
                    return (
                      <div key={s.id} className={styles.sessionItem} onClick={() => abrirConversa(s)}>
                        <div className={styles.sessionAvatar}>
                          {(s.client_name || "C")[0].toUpperCase()}
                        </div>
                        <div className={styles.sessionInfo}>
                          <div className={styles.sessionName}>{s.client_name || "Cliente"}</div>
                          <div className={styles.sessionPreview}>{s.ultima_mensagem || "Sem mensagens"}</div>
                        </div>
                        {naoLidas > 0 && (
                          <div className={styles.sessionUnread}>{naoLidas}</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      <button className={styles.widgetBtn} onClick={handleToggle} title="Conversas WhatsApp">
        <MessageCircle size={26} />
        {unread.total > 0 && <span className={styles.badge}>{unread.total > 99 ? "99+" : unread.total}</span>}
      </button>
    </>
  );
}
