import { useEffect, useRef, useState } from "react";
import Recorder from "opus-recorder";
import { Mic, Square, Send, X } from "lucide-react";
import { Button } from "./ui";
import styles from "../styles/pages/whatsapp.module.css";

const ENCODER_PATH = "/opus/encoderWorker.min.js";

function limpando(fn) {
  try {
    fn();
  } catch {
    return;
  }
}

function formatoTempo(totalSegundos) {
  const min = Math.floor(totalSegundos / 60);
  const seg = totalSegundos % 60;
  return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
}

export function AudioRecorder({ onSend }) {
  const [status, setStatus] = useState("idle");
  const [segundos, setSegundos] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const blobRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current) limpando(() => recorderRef.current.close());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function iniciar() {
    setErro("");
    setSegundos(0);
    chunksRef.current = [];
    blobRef.current = null;

    try {
      const rec = new Recorder({
        encoderPath: ENCODER_PATH,
        streamPages: true,
        mediaTrackConstraints: { channelCount: 1 },
        encoderSampleRate: 48000,
      });
      recorderRef.current = rec;

      rec.ondataavailable = (arrayBuffer) => {
        chunksRef.current.push(arrayBuffer);
      };

      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/ogg" });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setPreviewUrl((antigo) => {
          if (antigo) URL.revokeObjectURL(antigo);
          return url;
        });
        setSegundos(0);
        setStatus("ready");
      };

      await rec.start();
      setStatus("recording");
      timerRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);
    } catch (err) {
      setErro(err?.message || "Não foi possível acessar o microfone.");
      setStatus("idle");
    }
  }

  function parar() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current) limpando(() => recorderRef.current.stop());
  }

  function cancelar() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current) limpando(() => recorderRef.current.close());
    recorderRef.current = null;
    chunksRef.current = [];
    blobRef.current = null;
    setPreviewUrl((antigo) => {
      if (antigo) URL.revokeObjectURL(antigo);
      return "";
    });
    setErro("");
    setSegundos(0);
    setStatus("idle");
  }

  async function enviar() {
    if (!blobRef.current || !onSend) return;
    setEnviando(true);
    try {
      await onSend(blobRef.current);
      cancelar();
    } finally {
      setEnviando(false);
    }
  }

  if (status === "recording") {
    return (
      <div className={styles.recBanner}>
        <span className={styles.recMic}>
          <Mic size={16} />
        </span>
        <span className={styles.recTimer}>{formatoTempo(segundos)}</span>
        <Button variant="ghost" onClick={parar} title="Parar gravação">
          <Square size={14} /> Parar
        </Button>
        <button
          type="button"
          className={styles.recIconBtn}
          onClick={cancelar}
          title="Cancelar gravação"
          aria-label="Cancelar gravação"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className={styles.recReady}>
        <audio controls src={previewUrl} className={styles.recPreview} />
        <button
          type="button"
          className={styles.recIconBtn}
          onClick={cancelar}
          title="Descartar gravação"
          aria-label="Descartar gravação"
        >
          <X size={16} />
        </button>
        <Button onClick={enviar} disabled={enviando}>
          {enviando ? "Enviando..." : (
            <>
              <Send size={14} /> Enviar
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <>
      {erro && <span className={styles.recError}>{erro}</span>}
      <button
        type="button"
        className={styles.recMicBtn}
        onClick={iniciar}
        title="Gravar nota de voz"
        aria-label="Gravar nota de voz"
      >
        <Mic size={18} />
      </button>
    </>
  );
}