import { useState, useEffect, useRef } from "react";
import { whatsappService } from "../services/whatsapp.service";
import { useFeedback } from "../hooks/useFeedback";
import { PageHeader, Button } from "../components/ui";
import { QRCodeCanvas } from "qrcode.react";
import styles from "../styles/pages/whatsapp.module.css";

const STATUS_LABELS = {
  disconnected: { label: "Desconectado", cls: styles.disconnected },
  connected: { label: "Conectado", cls: styles.connected },
  awaiting_qr: { label: "Aguardando QR Code", cls: styles.awaitingQr },
  reconnecting: { label: "Reconectando...", cls: styles.reconnecting },
  connecting: { label: "Conectando...", cls: styles.reconnecting },
};

export function WhatsApp() {
  const [state, setState] = useState({ status: "disconnected" });
  const [loading, setLoading] = useState(false);
  const { feedback, showFeedback } = useFeedback();
  const mounted = useRef(true);

  async function carregarStatus() {
    try {
      const data = await whatsappService.getStatus();
      if (mounted.current) setState(data);
    } catch (err) {
      if (mounted.current) showFeedback("error", err.message);
    }
  }

  useEffect(() => {
    mounted.current = true;
    const timer = setTimeout(carregarStatus, 0);
    const interval = setInterval(carregarStatus, 3000);
    return () => {
      mounted.current = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  async function handleConnect() {
    try {
      setLoading(true);
      await whatsappService.connect();
      showFeedback("success", "Conectando ao WhatsApp...");
      await carregarStatus();
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
                ✅
                <p style={{ fontSize: 16, marginTop: 8, color: "var(--text-secondary)" }}>
                  WhatsApp conectado
                </p>
              </div>
            ) : state.status === "awaiting_qr" ? (
              <div style={{ fontSize: 48, textAlign: "center", padding: "40px 0", color: "var(--text-secondary)" }}>
                ⏳
                <p style={{ fontSize: 16, marginTop: 8 }}>
                  Gerando QR Code...
                </p>
              </div>
            ) : state.status === "connecting" ? (
              <div style={{ fontSize: 48, textAlign: "center", padding: "40px 0", color: "var(--text-secondary)" }}>
                ⏳
                <p style={{ fontSize: 16, marginTop: 8 }}>
                  Pareamento concluído, conectando...
                </p>
              </div>
            ) : (
              <div style={{ fontSize: 48, textAlign: "center", padding: "40px 0", color: "var(--text-secondary)" }}>
                📱
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
                {state.status === "connected"
                  ? "Conectado"
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
