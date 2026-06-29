import { useState, useEffect } from "react";
import { useFeedback } from "../hooks/useFeedback";
import { useAuth } from "../context/useAuth";
import { expedienteService } from "../services/expediente.service";
import { Button, PageHeader, SkeletonCard } from "../components/ui";
import { Card, CardHeader, styles as crud } from "../components/crud";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    expedienteService.listar().then((dados) => {
      if (!mounted || !dados?.length) return;
      const mapa = {};
      dados.forEach((d) => { mapa[d.dia_semana] = d; });
      setDias(DIAS_SEMANA.map((d) => {
        const salvo = mapa[d.id];
        return salvo
          ? { dia_semana: d.id, abertura: salvo.abertura || "08:00", fechamento: salvo.fechamento || "18:00", ativo: salvo.ativo }
          : { dia_semana: d.id, abertura: "08:00", fechamento: "18:00", ativo: false };
      }));
    }).catch((err) => {
      showFeedback("error", "Erro ao carregar expediente");
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

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
          <div className={crud.tenantChip}>
            <span className={crud.tenantDot} />
            <span>{tenant?.nome}</span>
          </div>
        }
      />

      {feedback && <div className={`alert alert-${feedback.type}`} role="alert">{feedback.message}</div>}

      <Card>
        <CardHeader title="Horários da semana" subtitle="Defina os horários de abertura e fechamento para cada dia" />

        {loading ? (
          <SkeletonCard lines={7} />
        ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="responsiveGrid" style={{ display: "grid", gap: 12, padding: "0 12px 8px", fontSize: 12, textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.5px", gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
            <span>Dia</span>
            <span>Aberto</span>
            <span>Abertura</span>
            <span>Fechamento</span>
          </div>

          {dias.map((dia) => {
            const diaInfo = DIAS_SEMANA.find((d) => d.id === dia.dia_semana);
            return (
              <div className="responsiveGrid" key={dia.dia_semana} style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr",
                gap: 12,
                alignItems: "center",
                padding: "12px",
                borderRadius: "var(--radius-sm)",
                background: dia.ativo ? "var(--bg-elevated)" : "var(--bg-base)",
                opacity: dia.ativo ? 1 : 0.5,
                border: "1px solid var(--border)",
              }}>
                <span style={{ fontWeight: 500, fontSize: 14 }}>{diaInfo?.nome}</span>
                <span>
                  <label style={{ position: "relative", display: "inline-block", width: 40, height: 22, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={dia.ativo}
                      onChange={(e) => handleChange(dia.dia_semana, "ativo", e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: "absolute",
                      inset: 0,
                      background: dia.ativo ? "var(--accent)" : "var(--border)",
                      borderRadius: 11,
                      transition: "background var(--transition)",
                    }} />
                    <span style={{
                      position: "absolute",
                      top: 2,
                      left: dia.ativo ? 20 : 2,
                      width: 18,
                      height: 18,
                      background: "white",
                      borderRadius: "50%",
                      transition: "left var(--transition)",
                    }} />
                  </label>
                </span>
                <span>
                  <input
                    type="time"
                    className="input-field"
                    style={{ padding: "8px 10px", fontSize: 13 }}
                    value={dia.abertura || ""}
                    disabled={!dia.ativo}
                    onChange={(e) => handleChange(dia.dia_semana, "abertura", e.target.value)}
                  />
                </span>
                <span>
                  <input
                    type="time"
                    className="input-field"
                    style={{ padding: "8px 10px", fontSize: 13 }}
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

        <div style={{ marginTop: 20 }}>
          <Button onClick={handleSave} loading={saving}>
            Salvar horários
          </Button>
        </div>
      </Card>
    </>
  );
}
