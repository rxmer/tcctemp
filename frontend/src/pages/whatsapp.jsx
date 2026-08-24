import { useState, useEffect, useRef } from "react";
import { whatsappService } from "../services/whatsapp.service";
import { useFeedback } from "../hooks/useFeedback";
import { PageHeader, Button } from "../components/ui";
import { QRCodeCanvas } from "qrcode.react";
import styles from "../styles/pages/whatsapp.module.css";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";

const STATUS_LABELS = {
  disconnected: { label: "Desconectado", cls: styles.disconnected },
  connected: { label: "Conectado", cls: styles.connected },
  awaiting_qr: { label: "Aguardando QR Code", cls: styles.awaitingQr },
  reconnecting: { label: "Reconectando...", cls: styles.reconnecting },
  connecting: { label: "Conectando...", cls: styles.reconnecting },
};

function formatarNumero(num) {
  const d = String(num).replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12 && d.length <= 13) {
    const rest = d.slice(2);
    const ddd = rest.slice(0, 2);
    const tel = rest.slice(2);
    return tel.length >= 9
      ? `+55 (${ddd}) ${tel.slice(0, 5)}-${tel.slice(5)}`
      : `+55 (${ddd}) ${tel.slice(0, 4)}-${tel.slice(4)}`;
  }
  return `+${d}`;
}

export function WhatsApp() {
  const [state, setState] = useState({ status: "disconnected" });
  const [loading, setLoading] = useState(false);
  const { feedback, showFeedback } = useFeedback();
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const lastErrorShown = useRef(0);

  async function carregarStatus() {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const data = await whatsappService.getStatus();
      if (mounted.current) setState(data);
    } catch (err) {
      const now = Date.now();
      if (mounted.current && now - lastErrorShown.current > 30000) {
        lastErrorShown.current = now;
        showFeedback("error", err.message);
      }
    } finally {
      inFlight.current = false;
    }
  }

  useEffect(() => {
    mounted.current = true;
    carregarStatus();
    const fast = ["awaiting_qr", "connecting", "reconnecting"].includes(state.status);
    const interval = setInterval(carregarStatus, fast ? 1000 : 10000);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [state.status]);

  async function handleConnect() {
    try {
      setLoading(true);
      await whatsappService.connect();
      showFeedback("success", "Conectando ao WhatsApp...");
      setState((prev) => ({ ...prev, status: "connecting" }));
      await carregarStatus();
      setTimeout(() => { if (mounted.current) carregarStatus(); }, 600);
      setTimeout(() => { if (mounted.current) carregarStatus(); }, 1500);
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    try {
      setLoading(true);
      await whatsappService.disconnect();
      showFeedback("success", "Desconectado");
      await carregarStatus();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  const statusInfo = STATUS_LABELS[state.status] ?? STATUS_LABELS.disconnected;

  return (
    <>
      <PageHeader
        title="WhatsApp"
        subtitle="Conecte o WhatsApp da sua empresa para atender clientes automaticamente"
      />

      {feedback && <div className={`alert alert-${feedback.type}`}>{feedback.message}</div>}

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Conexão</h2>
            <p>Escaneie o QR Code com o WhatsApp do seu celular</p>
          </div>

          <div className={styles.qrContainer}>
            {state.status === "awaiting_qr" && state.qrCode ? (
              <QRCodeCanvas value={state.qrCode} size={280} level="M" />
            ) : state.status === "connected" ? (
              <div style={{ fontSize: 48, textAlign: "center", padding: "40px 0" }}>
                <CheckCircle2 size={48} color="var(--success)" />
                <p style={{ fontSize: 16, marginTop: 8, color: "var(--text-secondary)" }}>
                  WhatsApp conectado
                </p>
              </div>
            ) : state.status === "awaiting_qr" ? (
              <div style={{ fontSize: 48, textAlign: "center", padding: "40px 0", color: "var(--text-secondary)" }}>
                <Loader2 size={48} className="spin" />
                <p style={{ fontSize: 16, marginTop: 8 }}>
                  Gerando QR Code...
                </p>
              </div>
            ) : state.status === "connecting" ? (
              <div style={{ fontSize: 48, textAlign: "center", padding: "40px 0", color: "var(--text-secondary)" }}>
                <Loader2 size={48} className="spin" />
                <p style={{ fontSize: 16, marginTop: 8 }}>
                  Conectando ao WhatsApp...
                </p>
              </div>
            ) : (
              <div style={{ fontSize: 48, textAlign: "center", padding: "40px 0", color: "var(--text-secondary)" }}>
                <Smartphone size={48} />
                <p style={{ fontSize: 16, marginTop: 8 }}>
                  {state.status === "reconnecting"
                    ? "Reconectando..."
                    : "Clique em Conectar para iniciar"}
                </p>
              </div>
            )}
          </div>

          <div className={styles.actions}>
            {(state.status === "disconnected" || state.status === "reconnecting") && (
              <Button onClick={handleConnect} loading={loading} fullWidth>
                Conectar
              </Button>
            )}
            {state.status === "connected" && (
              <Button variant="ghost" onClick={handleDisconnect} loading={loading} fullWidth>
                Desconectar
              </Button>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Informações</h2>
            <p>Status da conexão com o WhatsApp</p>
          </div>

          <div className={styles.infoList}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status</span>
              <span className={`${styles.statusBadge} ${statusInfo.cls}`}>
                <span className={styles.statusDot} />
                {statusInfo.label}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Número conectado</span>
              <span className={styles.infoValue}>
                {state.phoneNumber
                  ? formatarNumero(state.phoneNumber)
                  : "—"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Funcionamento</span>
              <span className={styles.infoValue}>
                {state.status === "connected"
                  ? "O chatbot está respondendo automaticamente"
                  : "Conecte para ativar o chatbot"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
