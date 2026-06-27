import { useState, useEffect } from "react";
import { useFeedback } from "../hooks/useFeedback";
import { useAuth } from "../context/useAuth";
import { expedienteService } from "../services/expediente.service";
import { Button, PageHeader, SkeletonCard } from "../components/ui";
import styles from "../styles/pages/expediente.module.css";

const DIAS_SEMANA = [
  { id: 0, nome: "Domingo" },
  { id: 1, nome: "Segunda-feira" },
  { id: 2, nome: "Terça-feira" },
  { id: 3, nome: "Quarta-feira" },
  { id: 4, nome: "Quinta-feira" },
  { id: 5, nome: "Sexta-feira" },
  { id: 6, nome: "Sábado" },
];

export function Expediente() {
  const { tenant } = useAuth();
  const { feedback, showFeedback } = useFeedback();
  const [dias, setDias] = useState(
    DIAS_SEMANA.map((d) => ({ dia_semana: d.id, abertura: "08:00", fechamento: "18:00", ativo: d.id >= 1 && d.id <= 5 }))
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleChange(diaSemana, field, value) {
    setDias((prev) =>
      prev.map((d) => (d.dia_semana === diaSemana ? { ...d, [field]: value } : d))
    );
  }

  async function handleSave() {
    for (const d of dias) {
      if (d.ativo && (!d.abertura || !d.fechamento)) {
        const nome = DIAS_SEMANA.find((ds) => ds.id === d.dia_semana)?.nome ?? "Dia";
        showFeedback("error", `Informe abertura e fechamento para ${nome} ou desmarque como aberto`);
        return;
      }
    }

    setSaving(true);
    try {
      const dados = dias.map((d) => ({
        ...d,
        abertura: d.ativo ? d.abertura : null,
        fechamento: d.ativo ? d.fechamento : null,
      }));
      await expedienteService.upsertAll(dados);
      showFeedback("success", "Expediente salvo com sucesso!");
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Expediente"
        subtitle="Configure os horários de funcionamento"
        action={
          <div className={styles.tenantChip}>
            <span className={styles.tenantDot} />
            <span>{tenant?.nome}</span>
          </div>
        }
      />

      {feedback && <div className={`alert alert-${feedback.type}`} role="alert">{feedback.message}</div>}

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Horários da semana</h2>
          <p>Defina os horários de abertura e fechamento para cada dia</p>
        </div>

        {loading ? (
          <SkeletonCard lines={7} />
        ) : (
          <div className={styles.grid}>
            <div className={styles.gridHeader}>
              <span className={styles.colDia}>Dia</span>
              <span className={styles.colAtivo}>Aberto</span>
              <span className={styles.colHora}>Abertura</span>
              <span className={styles.colHora}>Fechamento</span>
            </div>

            {dias.map((dia) => {
              const diaInfo = DIAS_SEMANA.find((d) => d.id === dia.dia_semana);
              return (
                <div key={dia.dia_semana} className={`${styles.gridRow} ${!dia.ativo ? styles.gridRowInativo : ""}`}>
                  <span className={styles.colDia}>
                    <span className={styles.diaNome}>{diaInfo?.nome}</span>
                  </span>
                  <span className={styles.colAtivo}>
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={dia.ativo}
                        onChange={(e) => handleChange(dia.dia_semana, "ativo", e.target.checked)}
                      />
                      <span className={styles.toggleSlider} />
                    </label>
                  </span>
                  <span className={styles.colHora}>
                    <input
                      type="time"
                      className={styles.timeInput}
                      value={dia.abertura || ""}
                      disabled={!dia.ativo}
                      onChange={(e) => handleChange(dia.dia_semana, "abertura", e.target.value)}
                    />
                  </span>
                  <span className={styles.colHora}>
                    <input
                      type="time"
                      className={styles.timeInput}
                      value={dia.fechamento || ""}
                      disabled={!dia.ativo}
                      onChange={(e) => handleChange(dia.dia_semana, "fechamento", e.target.value)}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.footer}>
          <Button onClick={handleSave} loading={saving}>
            Salvar horários
          </Button>
        </div>
      </div>
    </>
  );
}
