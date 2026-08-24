import { useState, useEffect } from "react";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";
import { useAuth } from "../context/useAuth";
import { ordensServicoService } from "../services/ordens-servico.service";
import { agendamentosService } from "../services/agendamentos.service";
import { servicosService } from "../services/servicos.service";
import { Button, PageHeader, Pagination, SkeletonTable } from "../components/ui";
import { Card, CardHeader, DataTable, ActionBtn, ActionBtns, styles as crud } from "../components/crud";
import { CheckCircle2, Clock, Trash2, ChevronRight, ChevronUp } from "lucide-react";

const STATUS_MAP = {
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const STATUS_COLORS = {
  em_andamento: { background: "rgba(59,130,246,0.1)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.2)" },
  finalizado: { background: "rgba(34,197,94,0.1)", color: "#86efac", border: "1px solid rgba(34,197,94,0.2)" },
  cancelado: { background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.2)" },
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
    if (selectedOs === osId) {
      setSelectedOs(null);
      return;
    }
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

  const columns = [
    { key: "os_id", label: "#" },
    { key: "cliente", label: "Cliente", render: (o) => o.agendamento?.cliente?.nome ?? "-" },
    { key: "veiculo", label: "Veículo", render: (o) => o.agendamento?.veiculo?.placa ?? "-" },
    { key: "valor_total", label: "Total", render: (o) => formatMoney(o.valor_total) },
    {
      key: "status",
      label: "Status",
      render: (o) => (
        <span className={crud.statusBadge} style={STATUS_COLORS[o.status] ?? {}}>
          {STATUS_MAP[o.status] ?? o.status}
        </span>
      ),
    },
    {
      key: "ver",
      label: "",
      width: "1px",
      render: (o) => (
        <ActionBtn title="Ver detalhes" onClick={() => selecionarOS(o.os_id)}>
          {selectedOs === o.os_id ? <ChevronUp size={14} /> : <ChevronRight size={14} />}
        </ActionBtn>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Ordens de Serviço"
        subtitle="Gerencie as ordens de serviço"
        action={
          <div className={crud.tenantChip}>
            <span className={crud.tenantDot} />
            <span>{tenant?.nome}</span>
          </div>
        }
      />

      {feedback && <div className={`alert alert-${feedback.type}`} role="alert">{feedback.message}</div>}

      <div className={crud.filtros} style={{ justifyContent: "space-between" }}>
        <div className={crud.filtroGroup}>
          <label className={crud.filtroLabel}>Filtrar por status</label>
          <select className={`input-field ${crud.filtroInput}`} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
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
        <Card>
          <CardHeader title="Criar ordem de serviço" />
          <form onSubmit={handleCriar} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className={crud.fieldGroup}>
              <label className={crud.fieldLabel}>Agendamento</label>
              <select className={`input-field ${crud.fieldSelect}`} value={agendamentoId} onChange={(e) => setAgendamentoId(e.target.value)} required>
                <option value="">Selecione um agendamento confirmado</option>
                {agendamentos.map((a) => (
                  <option key={a.agendamento_id} value={a.agendamento_id}>
                    {a.cliente?.nome ?? "N/A"} - {a.servico?.nome_servico ?? "N/A"} - {a.data_agendamento} {a.hora_agendamento?.slice(0, 5)}
                  </option>
                ))}
              </select>
            </div>

            <div className={crud.fieldGroup}>
              <label className={crud.fieldLabel}>Observações</label>
              <textarea className={`input-field ${crud.fieldTextarea}`} rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Opcional" />
            </div>

            <Button type="submit" loading={saving} fullWidth>Criar OS</Button>
          </form>
        </Card>
      )}

      <div
        className={crud.pageGrid + " responsiveGrid"}
        style={{
          gridTemplateColumns: osDetalhes ? "1fr 1.2fr" : "1fr",
          alignItems: "start",
        }}
      >
        <Card>
          <CardHeader title="Ordens de Serviço" subtitle={`${total} OS encontrada(s)`} />

          {loading ? (
            <SkeletonTable columns={[2, 3, 3, 2.5, 2, 2]} rows={5} />
          ) : (
            <DataTable
              columns={columns}
              rows={ordens.map((o) => ({ ...o, id: o.os_id }))}
              emptyMessage="Nenhuma OS encontrada."
            />
          )}
          <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
        </Card>

        {osDetalhes && (
          <Card>
            <CardHeader
              title={`OS #${osDetalhes.os_id}`}
              subtitle={`${osDetalhes.agendamento?.cliente?.nome ?? "N/A"} - ${osDetalhes.agendamento?.veiculo?.placa ?? "N/A"}`}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span className={crud.statusBadge} style={STATUS_COLORS[osDetalhes.status] ?? {}}>
                  {STATUS_MAP[osDetalhes.status] ?? osDetalhes.status}
                </span>

                {osDetalhes.status === "em_andamento" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button onClick={() => handleFinalizar(osDetalhes.os_id)}>Finalizar OS</Button>
                    <Button variant="ghost" onClick={() => handleCancelar(osDetalhes.os_id)}>Cancelar</Button>
                  </div>
                )}
              </div>

              {osDetalhes.faturamento && (
                <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                  <strong style={{ color: "var(--text-primary)" }}>Faturamento:</strong> {formatMoney(osDetalhes.faturamento.valor_total)}
                  {" · "}
                  {osDetalhes.faturamento.pago ? <><CheckCircle2 size={14} color="var(--success)" /> Pago</> : <><Clock size={14} color="var(--warning)" /> Pendente</>}
                  {osDetalhes.faturamento.data_pagamento && ` · ${formatDate(osDetalhes.faturamento.data_pagamento)}`}
                </div>
              )}

              {osDetalhes.observacoes && (
                <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", padding: 12, fontSize: 13 }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Observações</span>
                  <p style={{ marginTop: 4 }}>{osDetalhes.observacoes}</p>
                </div>
              )}

              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Itens</h3>
                <DataTable
                  columns={[
                    { key: "descricao", label: "Descrição" },
                    { key: "quantidade", label: "Qtd" },
                    { key: "valor_unitario", label: "Valor unit.", render: (item) => formatMoney(item.valor_unitario) },
                    { key: "subtotal", label: "Subtotal", render: (item) => formatMoney(item.quantidade * item.valor_unitario) },
                    ...(osDetalhes.status === "em_andamento" ? [{
                      key: "remover",
                      label: "",
                      width: "1px",
                      render: (item) => (
                        <ActionBtn title="Remover" danger onClick={() => handleRemoveItem(item.item_id)}>
                          <Trash2 size={14} />
                        </ActionBtn>
                      ),
                    }] : []),
                  ]}
                  rows={(osDetalhes.itens ?? []).map((item) => ({ ...item, id: item.item_id }))}
                  emptyMessage="Nenhum item adicionado."
                />

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700 }}>
                  Total: {formatMoney(osDetalhes.valor_total)}
                </div>
              </div>

              {osDetalhes.status === "em_andamento" && (
                <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", padding: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Adicionar item</h4>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <select
                      className={`input-field ${crud.fieldSelect}`}
                      style={{ flex: "1 1 180px" }}
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
                      className="input-field"
                      style={{ flex: "1 1 120px" }}
                      placeholder="Descrição"
                      value={novoItem.descricao}
                      onChange={(e) => setNovoItem((p) => ({ ...p, descricao: e.target.value }))}
                    />
                    <input
                      className="input-field"
                      type="number"
                      placeholder="Qtd"
                      style={{ width: 70 }}
                      min="1"
                      value={novoItem.quantidade}
                      onChange={(e) => setNovoItem((p) => ({ ...p, quantidade: e.target.value }))}
                    />
                    <input
                      className="input-field"
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
          </Card>
        )}
      </div>
      <ConfirmModal />
    </>
  );
}
