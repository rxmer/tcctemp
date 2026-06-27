import { useState, useEffect } from "react";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";
import { useAuth } from "../context/useAuth";
import { agendamentosService } from "../services/agendamentos.service";
import { clientesService } from "../services/clientes.service";
import { veiculosService } from "../services/veiculos.service";
import { servicosService } from "../services/servicos.service";
import { Input, Button, PageHeader, Pagination, Calendar, SkeletonTable } from "../components/ui";
import styles from "../styles/pages/agendamentos.module.css";

const STATUS_MAP = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const PROXIMOS_STATUS = {
  pendente: ["confirmado", "cancelado"],
  confirmado: ["em_andamento", "cancelado"],
  em_andamento: ["finalizado"],
  finalizado: [],
  cancelado: [],
};

const formInitial = {
  cliente_id: "",
  veiculo_id: "",
  servico_id: "",
  data_agendamento: "",
  hora_agendamento: "",
  observacoes: "",
};

export function Agendamentos() {
  const { tenant } = useAuth();

  const [agendamentos, setAgendamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [form, setForm] = useState({ ...formInitial });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroData, setFiltroData] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState("lista");
  const [selectedDate, setSelectedDate] = useState(null);
  const [mesAgendamentos, setMesAgendamentos] = useState([]);
  const [calMonth, setCalMonth] = useState(() => {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth() };
  });

  const { feedback, showFeedback } = useFeedback();
  const { confirm, ConfirmModal } = useConfirm();
  const LIMIT = 20;

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    setPage(1);
    carregarAgendamentos();
  }, [filtroStatus, filtroData]);

  useEffect(() => {
    carregarAgendamentos();
  }, [page]);

  async function carregarDados() {
    setLoading(true);
    try {
      const [cl, ve, se] = await Promise.all([
        clientesService.listar({ limit: 9999 }),
        veiculosService.listar({ limit: 9999 }),
        servicosService.listar({ limit: 9999 }),
      ]);
      setClientes(cl.data);
      setVeiculos(ve.data);
      setServicos(se.data);
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function carregarAgendamentos() {
    try {
      setLoading(true);
      const params = { page, limit: LIMIT };
      if (filtroStatus) params.status = filtroStatus;
      if (filtroData) {
        params.data_inicio = filtroData;
        params.data_fim = filtroData;
      }
      const result = await agendamentosService.listar(params);
      setAgendamentos(result.data);
      setTotal(result.total);
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function carregarMesAgendamentos(year, month) {
    const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const last = new Date(year, month + 1, 0).getDate();
    const lastDay = `${year}-${String(month + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    try {
      const result = await agendamentosService.listar({
        data_inicio: firstDay,
        data_fim: lastDay,
        limit: 9999,
      });
      setMesAgendamentos(result.data);
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  useEffect(() => {
    if (viewMode === "calendario") {
      carregarMesAgendamentos(calMonth.year, calMonth.month);
    }
  }, [viewMode, calMonth]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function iniciarEdicao(ag) {
    setEditingId(ag.agendamento_id);
    setForm({
      cliente_id: String(ag.cliente_id),
      veiculo_id: String(ag.veiculo_id),
      servico_id: String(ag.servico_id),
      data_agendamento: ag.data_agendamento,
      hora_agendamento: ag.hora_agendamento.slice(0, 5),
      observacoes: ag.observacoes ?? "",
    });
  }

  function cancelarEdicao() {
    setEditingId(null);
    setForm({ ...formInitial });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      cliente_id: Number(form.cliente_id),
      veiculo_id: Number(form.veiculo_id),
      servico_id: Number(form.servico_id),
      data_agendamento: form.data_agendamento,
      hora_agendamento: form.hora_agendamento + ":00",
      observacoes: form.observacoes || null,
    };

    if (!payload.cliente_id || !payload.veiculo_id || !payload.servico_id || !payload.data_agendamento || !payload.hora_agendamento) {
      showFeedback("error", "Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        await agendamentosService.atualizar(editingId, payload);
        showFeedback("success", "Agendamento atualizado com sucesso!");
      } else {
        await agendamentosService.criar(payload);
        showFeedback("success", "Agendamento criado com sucesso!");
      }

      cancelarEdicao();
      await carregarAgendamentos();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(ag, novoStatus) {
    try {
      await agendamentosService.atualizar(ag.agendamento_id, { status: novoStatus });
      await carregarAgendamentos();
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  async function handleDelete(ag) {
    const ok = await confirm(`Remover agendamento de ${ag.cliente?.nome ?? "cliente"}?`);
    if (!ok) return;

    try {
      await agendamentosService.deletar(ag.agendamento_id);
      await carregarAgendamentos();
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }

  function formatTime(timeStr) {
    if (!timeStr) return "-";
    return timeStr.slice(0, 5);
  }

  const veiculosDoCliente = veiculos.filter(
    (v) => !form.cliente_id || v.cliente_id === Number(form.cliente_id)
  );

  return (
    <>
      <PageHeader
        title="Agendamentos"
        subtitle="Gerencie os agendamentos da sua empresa"
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
          <label className={styles.filtroLabel}>Filtrar por data</label>
          <input
            type="date"
            className={styles.filtroInput}
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
          />
        </div>

        <div className={styles.filtroGroup}>
          <label className={styles.filtroLabel}>Filtrar por status</label>
          <select
            className={styles.filtroInput}
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_MAP).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className={styles.filtroActions}>
          <Button
            variant="ghost"
            onClick={() => {
              setFiltroData("");
              setFiltroStatus("");
            }}
          >
            Limpar filtros
          </Button>
        </div>
      </div>

      <div className={styles.viewToggle}>
        <button
          type="button"
          className={`${styles.viewBtn} ${viewMode === "lista" ? styles.viewBtnActive : ""}`}
          onClick={() => setViewMode("lista")}
        >
          📋 Lista
        </button>
        <button
          type="button"
          className={`${styles.viewBtn} ${viewMode === "calendario" ? styles.viewBtnActive : ""}`}
          onClick={() => setViewMode("calendario")}
        >
          📅 Calendário
        </button>
      </div>

      <div className={styles.agGrid}>
        <div className={styles.formCard}>
          <div className={styles.cardHeader}>
            <h2>{editingId ? "Editar agendamento" : "Novo agendamento"}</h2>
            <p>Preencha os dados abaixo</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.agForm}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Cliente</label>
              <select
                name="cliente_id"
                className={styles.fieldSelect}
                value={form.cliente_id}
                onChange={handleChange}
                required
              >
                <option value="">Selecione um cliente</option>
                {clientes.map((c) => (
                  <option key={c.cliente_id} value={c.cliente_id}>
                    {c.nome} {c.telefone ? `(${c.telefone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Veículo</label>
              <select
                name="veiculo_id"
                className={styles.fieldSelect}
                value={form.veiculo_id}
                onChange={handleChange}
                required
              >
                <option value="">Selecione um veículo</option>
                {veiculosDoCliente.map((v) => (
                  <option key={v.veiculo_id} value={v.veiculo_id}>
                    {v.placa} - {v.marca} {v.modelo}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Serviço</label>
              <select
                name="servico_id"
                className={styles.fieldSelect}
                value={form.servico_id}
                onChange={handleChange}
                required
              >
                <option value="">Selecione um serviço</option>
                {servicos.filter((s) => s.ativo).map((s) => (
                  <option key={s.servico_id} value={s.servico_id}>
                    {s.nome_servico} - R$ {Number(s.preco_base).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.row}>
              <Input
                label="Data"
                name="data_agendamento"
                type="date"
                value={form.data_agendamento}
                onChange={handleChange}
                required
              />
              <Input
                label="Horário"
                name="hora_agendamento"
                type="time"
                value={form.hora_agendamento}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Observações</label>
              <textarea
                name="observacoes"
                className={styles.fieldTextarea}
                placeholder="Observações opcionais"
                rows={3}
                value={form.observacoes}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formActions}>
              <Button type="submit" fullWidth loading={saving}>
                {editingId ? "Salvar alterações" : "Criar agendamento"}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" fullWidth onClick={cancelarEdicao}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </div>

        <div className={styles.listCard}>
          {viewMode === "calendario" ? (
            <>
              <div className={styles.calSection}>
                <Calendar
                  agendamentos={mesAgendamentos}
                  selectedDate={selectedDate}
                  onDateSelect={(d) => {
                    setSelectedDate(d);
                    if (d) {
                      setFiltroData(d);
                    }
                  }}
                  onMonthChange={(year, month) => setCalMonth({ year, month })}
                />
              </div>

              {selectedDate ? (
                <div className={styles.dayList}>
                  <div className={styles.cardHeader}>
                    <h2>Agendamentos de {formatDate(selectedDate)}</h2>
                    <p>{agendamentos.length} agendamento(s)</p>
                  </div>
                  {agendamentos.length === 0 ? (
                    <div className={styles.emptyState}>Nenhum agendamento nesta data.</div>
                  ) : (
                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Hora</th>
                            <th>Cliente</th>
                            <th>Veículo</th>
                            <th>Serviço</th>
                            <th>Status</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agendamentos.map((ag) => (
                            <tr key={ag.agendamento_id}>
                              <td>{formatTime(ag.hora_agendamento)}</td>
                              <td>{ag.cliente?.nome ?? "-"}</td>
                              <td>
                                {ag.veiculo
                                  ? `${ag.veiculo.placa} - ${ag.veiculo.marca} ${ag.veiculo.modelo}`
                                  : "-"}
                              </td>
                              <td>{ag.servico?.nome_servico ?? "-"}</td>
                              <td>
                                <span className={`${styles.statusBadge} ${styles[`status_${ag.status}`]}`}>
                                  {STATUS_MAP[ag.status] ?? ag.status}
                                </span>
                              </td>
                              <td>
                                <div className={styles.actionBtns}>
                                  <button className={styles.actionBtn} title="Editar" onClick={() => iniciarEdicao(ag)}>✏️</button>
                                  {PROXIMOS_STATUS[ag.status]?.map((ns) => (
                                    <button
                                      key={ns}
                                      className={`${styles.actionBtn} ${styles[`act_${ns}`]}`}
                                      title={`Mover para ${STATUS_MAP[ns]}`}
                                      onClick={() => handleStatus(ag, ns)}
                                    >
                                      {ns === "confirmado" ? "✅" :
                                       ns === "em_andamento" ? "▶️" :
                                       ns === "finalizado" ? "✔️" :
                                       ns === "cancelado" ? "❌" : "➡️"}
                                    </button>
                                  ))}
                                  <button className={`${styles.actionBtn} ${styles.actionDelete}`} title="Remover" onClick={() => handleDelete(ag)}>🗑️</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
                </div>
              ) : (
                <div className={styles.emptyState}>Clique em um dia para ver os agendamentos.</div>
              )}
            </>
          ) : (
            <>
              <div className={styles.cardHeader}>
                <h2>Agendamentos</h2>
                <p>{total} agendamento(s) encontrado(s)</p>
              </div>

              {loading ? (
                <SkeletonTable columns={[2, 3, 3, 2.5, 1.5, 1, 2]} rows={5} />
              ) : agendamentos.length === 0 ? (
                <div className={styles.emptyState}>Nenhum agendamento encontrado.</div>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Data/Hora</th>
                        <th>Cliente</th>
                        <th>Veículo</th>
                        <th>Serviço</th>
                        <th>Status</th>
                        <th>Lembrete</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agendamentos.map((ag) => (
                        <tr key={ag.agendamento_id}>
                          <td className={styles.dataCell}>
                            <div>{formatDate(ag.data_agendamento)}</div>
                            <div className={styles.horaCell}>{formatTime(ag.hora_agendamento)}</div>
                          </td>
                          <td>{ag.cliente?.nome ?? "-"}</td>
                          <td>
                            {ag.veiculo
                              ? `${ag.veiculo.placa} - ${ag.veiculo.marca} ${ag.veiculo.modelo}`
                              : "-"}
                          </td>
                          <td>{ag.servico?.nome_servico ?? "-"}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${styles[`status_${ag.status}`]}`}>
                              {STATUS_MAP[ag.status] ?? ag.status}
                            </span>
                          </td>
                          <td>
                            {ag.lembrete_enviado ? (
                              <span className={styles.lembreteEnviado} title={`Enviado em ${new Date(ag.lembrete_enviado).toLocaleString("pt-BR")}`}>📲</span>
                            ) : ag.status === "confirmado" ? (
                              <span className={styles.lembretePendente}>⏳</span>
                            ) : (
                              <span className={styles.lembreteNao}>—</span>
                            )}
                          </td>
                          <td>
                            <div className={styles.actionBtns}>
                              <button className={styles.actionBtn} title="Editar" onClick={() => iniciarEdicao(ag)}>✏️</button>
                              {PROXIMOS_STATUS[ag.status]?.map((ns) => (
                                <button
                                  key={ns}
                                  className={`${styles.actionBtn} ${styles[`act_${ns}`]}`}
                                  title={`Mover para ${STATUS_MAP[ns]}`}
                                  onClick={() => handleStatus(ag, ns)}
                                >
                                  {ns === "confirmado" ? "✅" :
                                   ns === "em_andamento" ? "▶️" :
                                   ns === "finalizado" ? "✔️" :
                                   ns === "cancelado" ? "❌" : "➡️"}
                                </button>
                              ))}
                              <button className={`${styles.actionBtn} ${styles.actionDelete}`} title="Remover" onClick={() => handleDelete(ag)}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
      <ConfirmModal />
    </>
  );
}
