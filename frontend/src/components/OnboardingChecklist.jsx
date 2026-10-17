import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { dashboardService } from "../services/dashboard.service";
import { whatsappService } from "../services/whatsapp.service";
import { ArrowRight, Circle, CheckCircle2, X } from "lucide-react";
import styles from "../styles/components/OnboardingChecklist.module.css";

export function OnboardingChecklist() {
  const { isAdmin, tenant } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const storageKey = `onboarding_dismissed_${tenant?.id ?? "default"}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    async function carregar() {
      try {
        const [dados, wa] = await Promise.all([
          dashboardService.onboarding(),
          whatsappService.getStatus().catch(() => ({ status: "disconnected" })),
        ]);
        if (mounted) setStatus({ ...dados, whatsapp: wa?.status === "connected" });
      } catch {
        /* checklist é opcional */
      } finally {
        if (mounted) setLoading(false);
      }
    }
    carregar();
    return () => { mounted = false; };
  }, [isAdmin]);

  function dismiss() {
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  if (!isAdmin || loading || dismissed || !status) return null;

  const items = [
    { key: "servicos", label: "Revisar seus serviços", desc: "Preços e duração do catálogo", path: "/servicos", done: status.servicos },
    { key: "expediente", label: "Ajustar o horário de funcionamento", desc: "Dias e horários de atendimento", path: "/expediente", done: status.expediente },
    { key: "empresa", label: "Completar os dados da empresa", desc: "Telefone, endereço e identidade", path: "/configuracao-empresa", done: status.empresa },
    { key: "whatsapp", label: "Conectar o WhatsApp", desc: "Ative o atendimento automático", path: "/whatsapp", done: status.whatsapp },
  ];

  const concluidos = items.filter((i) => i.done).length;
  if (concluidos === items.length) return null;

  const progresso = Math.round((concluidos / items.length) * 100);

  return (
    <section className={styles.card}>
      <button className={styles.close} onClick={dismiss} aria-label="Ocultar" title="Ocultar">
        <X size={15} />
      </button>

      <div className={styles.head}>
        <div>
          <h3 className={styles.title}>Primeiros passos</h3>
          <p className={styles.subtitle}>Falta pouco para sua estética atender no automático</p>
        </div>
        <span className={styles.progressText}>{concluidos}/{items.length}</span>
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ transform: `scaleX(${progresso / 100})` }} />
      </div>

      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              className={`${styles.item} ${item.done ? styles.itemDone : ""}`}
              onClick={() => navigate(item.path)}
            >
              {item.done ? (
                <CheckCircle2 size={18} className={styles.iconDone} />
              ) : (
                <Circle size={18} className={styles.iconPending} />
              )}
              <span className={styles.itemText}>
                <strong>{item.label}</strong>
                <small>{item.desc}</small>
              </span>
              {!item.done && <ArrowRight size={16} className={styles.arrow} />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
