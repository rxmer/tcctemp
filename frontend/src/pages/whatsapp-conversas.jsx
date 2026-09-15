import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { whatsappService } from "../services/whatsapp.service";
import { useFeedback } from "../hooks/useFeedback";
import { useDebouncedEffect } from "../hooks/useDebouncedEffect";
import { usePolling } from "../hooks/usePolling";
import { PageHeader, SkeletonCard, Alert, Select, Pagination, Button } from "../components/ui";
import { ConversaDetalhe } from "./whatsapp-conversa-detalhe";
import styles from "../styles/pages/whatsapp.module.css";
import { estadoLabel, estadoGrupo } from "../utils/whatsappEstados";

const LIMIT = 20;

const ORDEM_OPCOES = [
  ["recentes", "Mais recentes"],
  ["naolidas", "Não lidas primeiro"],
  ["nome", "Nome A-Z"],
];

const ABAS = [
  ["todas", "Todas"],
  ["naolidas", "Não lidas"],
  ["atendente", "Com atendente"],
  ["menu", "No menu"],
  ["agendando", "Agendando"],
];

const AVATAR_CORES = [
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

function tempoRelativo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const horas = Math.floor(diffMin / 60);
  if (horas < 24) return `${horas}h`;
  const hoje = new Date();
  const diaDe = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDias = Math.round((diaDe(hoje) - diaDe(d)) / 86400000);
  if (diffDias === 1) return "ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function corAvatar(nome) {
  let hash = 0;
  for (const char of String(nome || "?")) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_CORES[hash % AVATAR_CORES.length];
}

function inicial(nome) {
  return (String(nome || "?").trim().charAt(0) || "?").toUpperCase();
}

function previewTexto(s) {
  if (s.ultima_mensagem_tipo_media === "audio") return "🎤 Áudio";
  const texto = s.ultima_mensagem_previa ?? s.ultima_mensagem ?? "";
  if (s.ultima_mensagem_remetente === "atendente") return `Você: ${texto}`;
  if (s.ultima_mensagem_remetente === "bot") return `Bot: ${texto}`;
  return texto;
}

function badgeClasse(state) {
  const grupo = estadoGrupo(state);
  if (grupo === "atendente") return styles.estadoBadgeAtendente;
  if (grupo === "menu") return styles.estadoBadgeMenu;
  return styles.estadoBadgeAgendando;
}

export function WhatsAppConversas() {
  const navigate = useNavigate();
  const { feedback, showFeedback } = useFeedback();
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [naoLidasTotal, setNaoLidasTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [ordem, setOrdem] = useState("recentes");
  const [aba, setAba] = useState("todas");
  const [busca, setBusca] = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const [conectado, setConectado] = useState(true);
  const [statusCheckado, setStatusCheckado] = useState(false);
  const [selecionadaId, setSelecionadaId] = useState(null);
  const mountedRef = useRef(true);

  const estado = aba === "todas" || aba === "naolidas" ? "" : aba;
  const naoLidas = aba === "naolidas";

  useDebouncedEffect(() => {
    setPage(1);
    setBusca(buscaInput.trim());
  }, [buscaInput]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let ativo = true;
    whatsappService
      .getStatus()
      .then((st) => { if (ativo) setConectado(st?.status === "connected"); })
      .catch(() => { if (ativo) setConectado(false); })
      .finally(() => {
        if (ativo) {
          setStatusCheckado(true);
          setLoading(false);
        }
      });

    return () => { ativo = false; };
  }, []);

  const carregar = useCallback(async (silencioso = false) => {
    if (!statusCheckado || !mountedRef.current) return;
    if (!conectado) {
      if (!silencioso) {
        setSessions([]);
        setTotal(0);
        setNaoLidasTotal(0);
        setLoading(false);
      }
      return;
    }
    if (!silencioso) setLoading(true);
    try {
      const result = await whatsappService.listSessions({
        page,
        limit: LIMIT,
        ordem,
        estado,
        busca,
        naoLidas,
      });
      if (!mountedRef.current) return;
      const lista = Array.isArray(result) ? result : (result?.data ?? []);
      setSessions(lista);
      setTotal(result?.total ?? lista.length);
      setNaoLidasTotal(result?.naoLidasTotal ?? 0);
    } catch (err) {
      if (!silencioso && mountedRef.current) showFeedback("error", err.message);
    } finally {
      if (!silencioso && mountedRef.current) setLoading(false);
    }
  }, [conectado, statusCheckado, page, ordem, estado, busca, naoLidas, showFeedback]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const polling = useCallback(() => carregar(true), [carregar]);
  usePolling(polling, 10000);

  function handleAba(novaAba) {
    setPage(1);
    setAba(novaAba);
  }

  function handleOrdem(e) {
    setPage(1);
    setOrdem(e.target.value);
  }

  function abrirConversa(id) {
    setSelecionadaId(id);
  }

  return (
    <>
      <PageHeader
        title="Conversas WhatsApp"
        subtitle="Histórico de conversas com clientes pelo chatbot"
      />

      {feedback && <Alert variant={feedback.type}>{feedback.message}</Alert>}

      <div className={styles.card} style={{ marginTop: 0 }}>
        <div className={styles.cardHeader}>
          <h2>Conversas</h2>
          <p>{total} conversa(s) encontrada(s)</p>
        </div>

        {!conectado ? (
          <div className={styles.emptyState}>
            <p>WhatsApp não conectado.</p>
            <p style={{ marginTop: 4 }}>Conecte para visualizar e responder as conversas do chatbot.</p>
            <div style={{ marginTop: 16 }}>
              <Button className="btn-whatsapp" onClick={() => navigate("/whatsapp")}>
                Conectar WhatsApp
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.convLayout}>
            <aside
              className={`${styles.convList} ${
                selecionadaId ? styles.convListMobileOculta : styles.convListCheia
              }`}
            >
              <nav className={styles.convTabs} aria-label="Filtrar conversas">
                {ABAS.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.convTab} ${aba === key ? styles.convTabAtivo : ""}`}
                    onClick={() => handleAba(key)}
                  >
                    {key === "naolidas" && naoLidasTotal > 0 ? `${label} (${naoLidasTotal})` : label}
                  </button>
                ))}
              </nav>

              <div className={styles.toolbar}>
                <input
                  type="search"
                  className={styles.toolbarSearch}
                  placeholder="Buscar por nome ou telefone..."
                  value={buscaInput}
                  onChange={(e) => setBuscaInput(e.target.value)}
                  aria-label="Buscar conversas"
                />
                <Select
                  name="ordem"
                  aria-label="Ordenar conversas"
                  value={ordem}
                  onChange={handleOrdem}
                  options={ORDEM_OPCOES}
                  placeholder={null}
                  wrapperClassName={styles.toolbarField}
                  className={`input-field ${styles.toolbarSelect}`}
                />
              </div>

              {loading ? (
                <div style={{ padding: 16 }}>
                  <SkeletonCard lines={4} />
                </div>
              ) : sessions.length === 0 ? (
                <div className={styles.emptyState}>
                  {busca || aba !== "todas"
                    ? "Nenhuma conversa encontrada com os filtros atuais."
                    : "Nenhuma conversa ainda. O chatbot começará a registrar as conversas assim que for conectado."}
                </div>
              ) : (
                <div className={styles.convRows}>
                  {sessions.map((s) => {
                    const nao = Number(s.nao_lidas) || 0;
                    const ativa = selecionadaId === s.id;
                    return (
                      <div
                        key={s.id}
                        role="button"
                        tabIndex={0}
                        className={`${styles.convRow} ${nao ? styles.convRowNaoLida : ""} ${
                          ativa ? styles.convRowAtiva : ""
                        }`}
                        onClick={() => abrirConversa(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            abrirConversa(s.id);
                          }
                        }}
                        title="Abrir conversa"
                      >
                        <span
                          className={styles.convAvatar}
                          style={{ background: corAvatar(s.client_name) }}
                          aria-hidden="true"
                        >
                          {inicial(s.client_name)}
                        </span>
                        <div className={styles.convRowCorpo}>
                          <div className={styles.convRowTop}>
                            <span className={styles.convRowNome}>
                              {s.client_name ?? "Cliente"}
                            </span>
                            {nao > 0 ? (
                              <span className={styles.convBadgeNao}>
                                {nao > 99 ? "99+" : nao}
                              </span>
                            ) : (
                              <span className={styles.convRowTempo}>
                                {tempoRelativo(s.ultima_atividade)}
                              </span>
                            )}
                          </div>
                          <div className={styles.convRowFundo}>
                            <span className={styles.convRowMsg}>{previewTexto(s)}</span>
                            <span className={`${styles.estadoBadge} ${badgeClasse(s.state)}`}>
                              {estadoLabel(s.state)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
            </aside>

            {selecionadaId && (
              <section className={styles.convPainel}>
                <ConversaDetalhe
                  embedded
                  id={selecionadaId}
                  onBack={() => setSelecionadaId(null)}
                />
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}