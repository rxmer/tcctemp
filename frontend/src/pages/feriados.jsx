import { useState, useEffect } from "react";
import { useFeedback } from "../hooks/useFeedback";
import { useAuth } from "../context/useAuth";
import { datasBloqueadasService } from "../services/datas-bloqueadas.service";
import { Input, Button, PageHeader, SkeletonCard, Card } from "../components/ui";
import { Trash2 } from "lucide-react";

export function Feriados() {
  const { tenant } = useAuth();
  const { feedback, showFeedback } = useFeedback();
  const [datas, setDatas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      setLoading(true);
      const result = await datasBloqueadasService.listar(anoAtual);
      setDatas(result);
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdicionar(e) {
    e.preventDefault();
    if (!data) { showFeedback("error", "Selecione uma data"); return; }
    setSaving(true);
    try {
      await datasBloqueadasService.criar(data, motivo);
      showFeedback("success", "Data bloqueada com sucesso");
      setData("");
      setMotivo("");
      await carregar();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemover(id) {
    try {
      await datasBloqueadasService.remover(id);
      await carregar();
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  function formatDate(dateStr) {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }

  return (
    <>
      <PageHeader
        title="Feriados e Recessos"
        subtitle="Gerencie datas bloqueadas para agendamentos"
      />

      {feedback && <div className={`alert alert-${feedback.type}`} role="alert">{feedback.message}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 18 }}>
        <Card>
          <h2 style={{ fontSize: 18, fontFamily: "var(--font-display)", marginBottom: 16 }}>Nova data bloqueada</h2>
          <form onSubmit={handleAdicionar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="Data" name="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            <Input label="Motivo (opcional)" name="motivo" placeholder="Ex: Feriado municipal" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <Button type="submit" loading={saving} fullWidth>Bloquear data</Button>
          </form>
        </Card>

        <Card>
          <h2 style={{ fontSize: 18, fontFamily: "var(--font-display)", marginBottom: 16 }}>Datas bloqueadas em {anoAtual}</h2>
          {loading ? (
            <SkeletonCard lines={5} />
          ) : datas.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>Nenhuma data bloqueada.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {datas.map((d) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--accent)", minWidth: 80 }}>{formatDate(d.data)}</div>
                  <div style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)" }}>{d.motivo || "—"}</div>
                  <button style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "4px 8px", cursor: "pointer", color: "var(--text-secondary)", display: "inline-flex", alignItems: "center" }} title="Remover" onClick={() => handleRemover(d.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
