import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { notificacoesService } from "../services/notificacoes.service";
import { agendamentosService } from "../services/agendamentos.service";
import styles from "../styles/components/NotificacaoBell.module.css";

export function NotificacaoBell() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [contagem, setContagem] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [processando, setProcessando] = useState(null);
  const navigate = useNavigate();
  const ref = useRef(null);

  async function carregar() {
    try {
      const [lista, cnt] = await Promise.all([
        notificacoesService.listar(),
        notificacoesService.contar(),
      ]);
      setNotificacoes(lista);
      setContagem(cnt.count);
    } catch (err) {
      console.error("Erro notificações:", err);
    }
  }

  async function carregarContagem() {
    try {
      const cnt = await notificacoesService.contar();
      setContagem(cnt.count);
    } catch {
      // polling — falha silenciosa
    }
  }

  async function toggle() {
    if (!aberto) {
      try {
        const lista = await notificacoesService.listar();
        setNotificacoes(lista);
        const cnt = await notificacoesService.contar();
        setContagem(cnt.count);
      } catch {
        // ignorado
      }
    }
    setAberto((prev) => !prev);
  }

  async function handleMarcarLida(id) {
    try {
      await notificacoesService.marcarLida(id);
      setNotificacoes((prev) =>
        prev.map((n) => (n.notificacao_id === id ? { ...n, lida: true } : n))
      );
      setContagem((prev) => Math.max(0, prev - 1));
    } catch {
      // ignorado
    }
  }

  async function handleMarcarFalta(n) {
    setProcessando(n.notificacao_id);
    try {
      await agendamentosService.atualizar(n.referencia_id, { status: "falta" });
      setNotificacoes((prev) => prev.filter((x) => x.notificacao_id !== n.notificacao_id));
      if (!n.lida) setContagem((prev) => Math.max(0, prev - 1));
    } catch (err) {
      if (/não é permitido mudar de "falta"/i.test(err.message || "")) {
        setNotificacoes((prev) => prev.filter((x) => x.notificacao_id !== n.notificacao_id));
        if (!n.lida) setContagem((prev) => Math.max(0, prev - 1));
      } else {
        alert(err.message || "Não foi possível marcar a falta.");
      }
    } finally {
      setProcessando(null);
    }
  }

  function abrirAgenda() {
    setAberto(false);
    navigate("/agendamentos");
  }

  async function handleMarcarTodas() {
    try {
      await notificacoesService.marcarTodasLidas();
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
      setContagem(0);
    } catch {
      // ignorado
    }
  }

  function formatTempo(dataStr) {
    const d = new Date(dataStr);
    const agora = new Date();
    const diffMs = agora - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "agora";
    if (diffMin < 60) return `${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    return d.toLocaleDateString("pt-BR");
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const [lista, cnt] = await Promise.all([
          notificacoesService.listar(),
          notificacoesService.contar(),
        ]);
        if (!mounted) return;
        setNotificacoes(lista);
        setContagem(cnt.count);
      } catch (err) {
        console.error("Erro notificações:", err);
      }
    }

    async function poll() {
      try {
        const cnt = await notificacoesService.contar();
        if (mounted) setContagem(cnt.count);
      } catch { /* polling */ }
    }

    init();
    const interval = setInterval(poll, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className={styles.container} ref={ref}>
      <button className={styles.bell} onClick={toggle} title="Notificações" aria-expanded={aberto} aria-controls="notificacoes-dropdown">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {contagem > 0 && <span className={styles.badge}>{contagem > 99 ? "99+" : contagem}</span>}
      </button>

      {aberto && (
        <div id="notificacoes-dropdown" className={styles.dropdown}>
          <div className={styles.header}>
            <strong>Notificações</strong>
            {notificacoes.some((n) => !n.lida) && (
              <button className={styles.markAllBtn} onClick={handleMarcarTodas}>
                Marcar todas lidas
              </button>
            )}
          </div>
          <div className={styles.lista}>
            {notificacoes.length === 0 ? (
              <div className={styles.vazio}>Nenhuma notificação</div>
            ) : (
              notificacoes.map((n) => (
                <div
                  key={n.notificacao_id}
                  className={`${styles.item} ${!n.lida ? styles.itemNaoLida : ""}`}
                  onClick={() => !n.lida && handleMarcarLida(n.notificacao_id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (!n.lida && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      handleMarcarLida(n.notificacao_id);
                    }
                  }}
                >
                  <div className={styles.itemTitulo}>{n.titulo}</div>
                  <div className={styles.itemMsg}>{n.mensagem}</div>
                  {n.tipo === "revisao_agendamento_passado" && (
                    <div className={styles.acoes} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={styles.btnFalta}
                        disabled={processando === n.notificacao_id}
                        onClick={() => handleMarcarFalta(n)}
                      >
                        {processando === n.notificacao_id ? "Salvando..." : "Cliente faltou"}
                      </button>
                      <button className={styles.btnAbrir} onClick={abrirAgenda}>
                        Ver agenda
                      </button>
                    </div>
                  )}
                  <div className={styles.itemTempo}>{formatTempo(n.criado_em)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
