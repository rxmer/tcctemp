import { useState, useEffect } from "react";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";
import { useAuth } from "../context/useAuth";
import { ordensServicoService } from "../services/ordens-servico.service";
import { agendamentosService } from "../services/agendamentos.service";
import { servicosService } from "../services/servicos.service";
import { Button, PageHeader, Pagination, SkeletonTable } from "../components/ui";
import styles from "../styles/pages/ordens-servico.module.css";

const STATUS_MAP = {
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export function OrdensServico() {
  const { tenant } = useAuth();

  const [ordens, setOrdens] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedOs, setSelectedOs] = useState(null);
  const [showCriar, setShowCriar] = useState(false);
  const [agendamentoId, setAgendamentoId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const { feedback, showFeedback } = useFeedback();
  const { confirm, ConfirmModal } = useConfirm();
  const LIMIT = 20;

  const [novoItem, setNovoItem] = useState({ servico_id: "", descricao: "", quantidade: 1, valor_unitario: "" });

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    setPage(1);
    carregarOrdens();
  }, [filtroStatus]);

  useEffect(() => {
    carregarOrdens();
  }, [page]);

  async function carregarDados() {
    setLoading(true);
    try {
      const [os, ag, se] = await Promise.all([
        ordensServicoService.listar({ page, limit: LIMIT }),
        agendamentosService.listar({ status: "confirmado", limit: 9999 }),
        servicosService.listar({ limit: 9999 }),
      ]);
      setOrdens(os.data);
      setTotal(os.total);
      setAgendamentos(ag.data);
      setServicos(se.data.filter((s) => s.ativo));
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function carregarOrdens() {
    try {
      setLoading(true);
      const params = { page, limit: LIMIT };
      if (filtroStatus) params.status = filtroStatus;
      const result = await ordensServicoService.listar(params);
      setOrdens(result.data);
      setTotal(result.total);
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCriar(e) {
    e.preventDefault();
    if (!agendamentoId) { showFeedback("error", "Selecione um agendamento"); return; }

    try {
      setSaving(true);
      const os = await ordensServicoService.criar({ agendamento_id: Number(agendamentoId), observacoes: observacoes || null });
      setShowCriar(false);
      setAgendamentoId("");
      setObservacoes("");
      await carregarDados();
      setSelectedOs(os.os_id);
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalizar(osId) {
    try {
      await ordensServicoService.atualizar(osId, { status: "finalizado" });
      await carregarDados();
      if (selectedOs === osId) {
        const os = await ordensServicoService.buscarPorId(osId);
        setSelectedOs(os.os_id);
        setOrdens((prev) => prev.map((o) => (o.os_id === osId ? os : o)));
      }
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  async function handleCancelar(osId) {
    const ok = await confirm("Cancelar esta ordem de serviço?");
    if (!ok) return;
    try {
      await ordensServicoService.atualizar(osId, { status: "cancelado" });
      await carregarDados();
      setSelectedOs(null);
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  async function handleAddItem() {
    if (!novoItem.descricao || !novoItem.quantidade || !novoItem.valor_unitario) {
      showFeedback("error", "Preencha descrição, quantidade e valor");
      return;
    }

    try {
      const os = await ordensServicoService.adicionarItem(selectedOs, {
        servico_id: novoItem.servico_id ? Number(novoItem.servico_id) : null,
        descricao: novoItem.descricao,
        quantidade: Number(novoItem.quantidade),
        valor_unitario: Number(novoItem.valor_unitario),
      });
      setNovoItem({ servico_id: "", descricao: "", quantidade: 1, valor_unitario: "" });
      setSelectedOs(os.os_id);
      setOrdens((prev) => prev.map((o) => (o.os_id === os.os_id ? os : o)));
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  async function handleRemoveItem(itemId) {
    const ok = await confirm("Remover este item?");
    if (!ok) return;
    try {
      const os = await ordensServicoService.removerItem(selectedOs, itemId);
      setSelectedOs(os.os_id);
      setOrdens((prev) => prev.map((o) => (o.os_id === os.os_id ? os : o)));
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  async function selecionarOS(osId) {
    try {
      const os = await ordensServicoService.buscarPorId(osId);
      setSelectedOs(os.os_id);
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  function formatMoney(value) {
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  }

  const osDetalhes = ordens.find((o) => o.os_id === selectedOs);

  return (
    <>
      <PageHeader
        title="Ordens de Serviço"
        subtitle="Gerencie as ordens de serviço"
        action={
          <div className={styles.tenantChip}>
            <span className={styles.tenantDot} />
            <span>{tenant?.nome}</span>
          </div>
        }
      />

      {feedback && <div className={`alert alert-${feedback.type}`} role="alert">{feedback.message}</div>}

      <div className={styles.filtros}>
        <div className={styles.filtroGroup}>
          <label className={styles.filtroLabel}>Filtrar por status</label>
          <select className={styles.filtroInput} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(STATUS_MAP).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <Button onClick={() => setShowCriar(!showCriar)}>
          {showCriar ? "Cancelar" : "Nova OS"}
        </Button>
      </div>

      {showCriar && (
        <div className={styles.criarCard}>
          <h3>Criar ordem de serviço</h3>
          <form onSubmit={handleCriar} className={styles.criarForm}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Agendamento</label>
              <select className={styles.fieldSelect} value={agendamentoId} onChange={(e) => setAgendamentoId(e.target.value)} required>
                <option value="">Selecione um agendamento confirmado</option>
                {agendamentos.map((a) => (
                  <option key={a.agendamento_id} value={a.agendamento_id}>
                    {a.cliente?.nome ?? "N/A"} - {a.servico?.nome_servico ?? "N/A"} - {a.data_agendamento} {a.hora_agendamento?.slice(0, 5)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Observações</label>
              <textarea className={styles.fieldTextarea} rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Opcional" />
            </div>

            <Button type="submit" loading={saving} fullWidth>Criar OS</Button>
          </form>
        </div>
      )}

      <div className={styles.osLayout}>
        <div className={styles.listCard}>
          <div className={styles.cardHeader}>
            <h2>Ordens de Serviço</h2>
            <p>{total} OS encontrada(s)</p>
          </div>

          {loading ? (
            <SkeletonTable columns={[2, 3, 3, 2.5, 2, 2]} rows={5} />
          ) : ordens.length === 0 ? (
            <div className={styles.emptyState}>Nenhuma OS encontrada.</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Veículo</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ordens.map((o) => (
                    <tr key={o.os_id} className={selectedOs === o.os_id ? styles.rowActive : ""}>
                      <td className={styles.osId}>{o.os_id}</td>
                      <td>{o.agendamento?.cliente?.nome ?? "-"}</td>
                      <td>{o.agendamento?.veiculo?.placa ?? "-"}</td>
                      <td className={styles.valorCell}>{formatMoney(o.valor_total)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`status_${o.status}`]}`}>
                          {STATUS_MAP[o.status] ?? o.status}
                        </span>
                      </td>
                      <td>
                        <button className={styles.verBtn} onClick={() => selecionarOS(o.os_id)}>
                          {selectedOs === o.os_id ? "▲" : "▶"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
        </div>

        {osDetalhes && (
          <div className={styles.detalhesCard}>
            <div className={styles.cardHeader}>
              <h2>OS #{osDetalhes.os_id}</h2>
              <p>
                {osDetalhes.agendamento?.cliente?.nome ?? "N/A"} - {osDetalhes.agendamento?.veiculo?.placa ?? "N/A"}
              </p>
            </div>

            <div className={styles.detalhesInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Status</span>
                <span className={`${styles.statusBadge} ${styles[`status_${osDetalhes.status}`]}`}>
                  {STATUS_MAP[osDetalhes.status] ?? osDetalhes.status}
                </span>
              </div>

              {osDetalhes.status === "em_andamento" && (
                <div className={styles.detalhesAcoes}>
                  <Button onClick={() => handleFinalizar(osDetalhes.os_id)}>Finalizar OS</Button>
                  <Button variant="ghost" onClick={() => handleCancelar(osDetalhes.os_id)}>Cancelar</Button>
                </div>
              )}

              {osDetalhes.faturamento && (
                <div className={styles.faturamentoInfo}>
                  <strong>Faturamento:</strong> {formatMoney(osDetalhes.faturamento.valor_total)}
                  {" · "}
                  {osDetalhes.faturamento.pago ? "✅ Pago" : "⏳ Pendente"}
                  {osDetalhes.faturamento.data_pagamento && ` · ${formatDate(osDetalhes.faturamento.data_pagamento)}`}
                </div>
              )}

              {osDetalhes.observacoes && (
                <div className={styles.obsBox}>
                  <span className={styles.infoLabel}>Observações</span>
                  <p>{osDetalhes.observacoes}</p>
                </div>
              )}
            </div>

            <div className={styles.itensSection}>
              <h3>Itens</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Qtd</th>
                    <th>Valor unit.</th>
                    <th>Subtotal</th>
                    {osDetalhes.status === "em_andamento" && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {osDetalhes.itens?.map((item) => (
                    <tr key={item.item_id}>
                      <td>{item.descricao}</td>
                      <td>{item.quantidade}</td>
                      <td>{formatMoney(item.valor_unitario)}</td>
                      <td>{formatMoney(item.quantidade * item.valor_unitario)}</td>
                      {osDetalhes.status === "em_andamento" && (
                        <td>
                          <button className={styles.removeBtn} onClick={() => handleRemoveItem(item.item_id)}>🗑️</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={styles.totalRow}>
                    <td colSpan={3}><strong>Total</strong></td>
                    <td><strong>{formatMoney(osDetalhes.valor_total)}</strong></td>
                    {osDetalhes.status === "em_andamento" && <td></td>}
                  </tr>
                </tfoot>
              </table>

              {osDetalhes.status === "em_andamento" && (
                <div className={styles.addItemForm}>
                  <h4>Adicionar item</h4>
                  <div className={styles.addItemRow}>
                    <select
                      className={styles.fieldSelect}
                      value={novoItem.servico_id}
                      onChange={(e) => {
                        const servico = servicos.find((s) => s.servico_id === Number(e.target.value));
                        setNovoItem({
                          servico_id: e.target.value,
                          descricao: servico?.nome_servico ?? "",
                          quantidade: 1,
                          valor_unitario: servico ? String(servico.preco_base) : "",
                        });
                      }}
                    >
                      <option value="">Serviço (opcional)</option>
                      {servicos.map((s) => (
                        <option key={s.servico_id} value={s.servico_id}>{s.nome_servico}</option>
                      ))}
                    </select>
                    <input
                      className={styles.fieldInput}
                      placeholder="Descrição"
                      value={novoItem.descricao}
                      onChange={(e) => setNovoItem((p) => ({ ...p, descricao: e.target.value }))}
                    />
                    <input
                      className={styles.fieldInput}
                      type="number"
                      placeholder="Qtd"
                      style={{ width: 70 }}
                      min="1"
                      value={novoItem.quantidade}
                      onChange={(e) => setNovoItem((p) => ({ ...p, quantidade: e.target.value }))}
                    />
                    <input
                      className={styles.fieldInput}
                      type="number"
                      step="0.01"
                      placeholder="Valor"
                      style={{ width: 110 }}
                      min="0"
                      value={novoItem.valor_unitario}
                      onChange={(e) => setNovoItem((p) => ({ ...p, valor_unitario: e.target.value }))}
                    />
                    <Button onClick={handleAddItem}>+</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <ConfirmModal />
    </>
  );
}
