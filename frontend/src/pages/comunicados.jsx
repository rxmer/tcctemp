import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFeedback } from "../hooks/useFeedback";
import { usePolling } from "../hooks/usePolling";
import { comunicadosService } from "../services/comunicados.service";
import { whatsappService } from "../services/whatsapp.service";
import { Button, PageHeader, Alert } from "../components/ui";
import { Card, CardHeader, styles as crud } from "../components/crud";
import { Megaphone, CheckCircle2, XCircle, Loader2, Clock, Smartphone } from "lucide-react";

const FILTROS = [
  { value: "todos", label: "Todos os clientes com telefone" },
  { value: "agendados", label: "Só quem tem agendamento futuro" },
  { value: "chatbot", label: "Só quem já usou o chatbot" },
];

const STATUS_LABEL = {
  enviando: "Enviando...",
  concluido: "Concluído",
  concluido_com_falhas: "Concluído com falhas",
  falhou: "Falhou",
};

export function Comunicados() {
  const { feedback, showFeedback } = useFeedback();
  const location = useLocation();
  const navigate = useNavigate();
  const [mensagem, setMensagem] = useState(location.state?.mensagem ?? "");
  const [filtro, setFiltro] = useState("todos");
  const [enviando, setEnviando] = useState(false);
  const [comunicados, setComunicados] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [conectado, setConectado] = useState(false);
  const mounted = useRef(true);
  const inFlight = useRef(false);

  const carregarLista = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const data = await comunicadosService.listar();
      if (mounted.current) setComunicados(data);
    } catch (err) {
      if (mounted.current) showFeedback("error", err.message);
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoadingList(false);
    }
  }, [showFeedback]);

  useEffect(() => {
    mounted.current = true;
    whatsappService
      .getStatus()
      .then((st) => {
        if (!mounted.current) return;
        const online = st?.status === "connected";
        setConectado(online);
        if (online) carregarLista();
      })
      .catch(() => {
        if (mounted.current) setConectado(false);
      });
    return () => {
      mounted.current = false;
    };
  }, [carregarLista]);

  const temEnvioAtivo = comunicados.some((c) => c.status === "enviando");
  usePolling(temEnvioAtivo ? carregarLista : null, temEnvioAtivo ? 5000 : null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (mensagem.trim().length < 5) {
      showFeedback("error", "Escreva a mensagem do comunicado (mínimo 5 caracteres)");
      return;
    }
    setEnviando(true);
    try {
      await comunicadosService.criar({ mensagem: mensagem.trim(), filtro });
      showFeedback("success", "Disparo iniciado! As mensagens estão sendo enviadas.");
      setMensagem("");
      await carregarLista();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setEnviando(false);
    }
  }

  function formatarData(iso) {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  function iconeStatus(status) {
    if (status === "concluido") return <CheckCircle2 size={15} color="var(--success)" />;
    if (status === "enviando") return <Loader2 size={15} className="spin" />;
    if (status === "falhou") return <XCircle size={15} color="var(--danger)" />;
    return <Clock size={15} color="var(--warning)" />;
  }

  function barraProgresso(c) {
    const processados = c.enviados + c.falhas;
    const pct = c.total_destinatarios ? Math.round((processados / c.total_destinatarios) * 100) : 0;
    return (
      <div style={{ background: "var(--border)", borderRadius: 4, height: 6, flex: 1, minWidth: 80 }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: "var(--accent)", transition: "width 0.4s" }} />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Comunicados"
        subtitle="Envie avisos pelo WhatsApp para os seus clientes"
      />

      {feedback && <Alert variant={feedback.type}>{feedback.message}</Alert>}

      {!conectado ? (
        <div className={crud.pageGrid}>
          <Card>
            <CardHeader
              title="Comunicados"
              subtitle="É necessário conectar o WhatsApp para enviar comunicados e visualizar o histórico de disparos"
            />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 16px", color: "var(--text-secondary)", textAlign: "center" }}>
              <Smartphone size={40} style={{ opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: 14 }}>
                Nenhum comunicado disponível. Conecte o WhatsApp para enviar comunicados e ver o histórico de disparos.
              </p>
              <Button className="btn-whatsapp" onClick={() => navigate("/whatsapp")}>
                Conectar WhatsApp
              </Button>
            </div>
          </Card>
        </div>
      ) : (
      <div className={crud.pageGrid + " responsiveGrid"} style={{ gridTemplateColumns: "1fr 1.5fr" }}>
        <Card>
          <CardHeader title="Novo comunicado" subtitle="A mensagem é enviada com o nome da empresa no topo" />

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Mensagem</label>
              <textarea
                name="mensagem"
                placeholder="Ex: Olá! Informamos que dia 25/12 estaremos fechados..."
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                maxLength={500}
                rows={5}
                required
                style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 14, resize: "vertical" }}
              />
              <small style={{ color: "var(--text-secondary)", alignSelf: "flex-end" }}>{mensagem.length}/500</small>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Enviar para</label>
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-primary)" }}
              >
                {FILTROS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <Button type="submit" loading={enviando} fullWidth>
              <Megaphone size={16} style={{ marginRight: 8 }} /> Enviar comunicado
            </Button>
            <small style={{ color: "var(--text-secondary)", textAlign: "center" }}>
              As mensagens são enviadas com intervalo de segurança para proteger seu número.
            </small>
          </form>
        </Card>

        <Card>
          <CardHeader title="Histórico de disparos" subtitle={loadingList ? "Carregando..." : `${comunicados.length} registro(s)`} />

          {loadingList ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center", padding: 24 }}>Carregando...</p>
          ) : comunicados.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center", padding: 24 }}>
              Nenhum comunicado enviado ainda
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {comunicados.map((c) => (
                <div key={c.comunicado_id} style={{ padding: 14, background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    {iconeStatus(c.status)}
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{STATUS_LABEL[c.status] ?? c.status}</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: "auto" }}>{formatarData(c.criado_em)}</span>
                  </div>
                  <p style={{ fontSize: 13, margin: "0 0 10px", whiteSpace: "pre-wrap" }}>{c.mensagem.length > 120 ? c.mensagem.slice(0, 120) + "..." : c.mensagem}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--text-secondary)" }}>
                    <span>{c.enviados}/{c.total_destinatarios} entregues</span>
                    {c.falhas > 0 && <span style={{ color: "var(--danger)" }}>{c.falhas} falha(s)</span>}
                    {barraProgresso(c)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      )}
    </>
  );
}
