import { useState, useEffect } from "react";
import { useFeedback } from "../hooks/useFeedback";
import { useAuth } from "../context/useAuth";
import { financeiroService } from "../services/financeiro.service";
import { Input, Button, PageHeader, Pagination } from "../components/ui";
import styles from "../styles/pages/financeiro.module.css";

const formInitial = { descricao: "", valor: "", data_vencimento: "", observacoes: "" };

export function Financeiro() {
  const { tenant } = useAuth();
  const { feedback, showFeedback } = useFeedback();

  const [resumo, setResumo] = useState(null);
  const [contas, setContas] = useState([]);
  const [faturamentos, setFaturamentos] = useState([]);
  const [form, setForm] = useState({ ...formInitial });
  const [editingId, setEditingId] = useState(null);
  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aba, setAba] = useState("resumo");
  const [filtroData, setFiltroData] = useState("");
  const [pageContas, setPageContas] = useState(1);
  const [totalContas, setTotalContas] = useState(0);
  const [pageFat, setPageFat] = useState(1);
  const [totalFat, setTotalFat] = useState(0);

  const LIMIT = 20;

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (aba === "resumo") carregarResumo();
    if (aba === "contas") carregarContas();
    if (aba === "faturamentos") carregarFaturamentos();
  }, [aba, filtroData]);

  useEffect(() => {
    if (aba === "contas") carregarContas();
  }, [pageContas]);

  useEffect(() => {
    if (aba === "faturamentos") carregarFaturamentos();
  }, [pageFat]);

  async function carregarDados() {
    setLoading(true);
    try {
      await Promise.all([carregarResumo(), carregarContas(), carregarFaturamentos()]);
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function carregarResumo() {
    try {
      const params = {};
      if (filtroData) { params.data_inicio = filtroData; params.data_fim = filtroData; }
      const data = await financeiroService.resumo(params);
      setResumo(data);
    } catch (err) {
      console.error("Erro resumo:", err);
      showFeedback("error", "Erro ao carregar resumo financeiro.");
    }
  }

  async function carregarContas() {
    try {
      const params = { page: pageContas, limit: LIMIT };
      if (filtroData) { params.data_inicio = filtroData; params.data_fim = filtroData; }
      const result = await financeiroService.listarContas(params);
      setContas(result.data);
      setTotalContas(result.total);
    } catch (err) {
      console.error("Erro contas:", err);
      showFeedback("error", "Erro ao carregar contas a pagar.");
    }
  }

  async function carregarFaturamentos() {
    try {
      const params = { page: pageFat, limit: LIMIT };
      if (filtroData) { params.data_inicio = filtroData; params.data_fim = filtroData; }
      const result = await financeiroService.listarFaturamentos(params);
      setFaturamentos(result.data);
      setTotalFat(result.total);
    } catch (err) {
      console.error("Erro faturamentos:", err);
      showFeedback("error", "Erro ao carregar faturamentos.");
    }
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function iniciarEdicao(conta) {
    setEditingId(conta.conta_id);
    setForm({
      descricao: conta.descricao,
      valor: String(conta.valor),
      data_vencimento: conta.data_vencimento,
      observacoes: conta.observacoes ?? "",
    });
  }

  function cancelarEdicao() {
    setEditingId(null);
    setForm({ ...formInitial });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      descricao: form.descricao,
      valor: Number(form.valor),
      data_vencimento: form.data_vencimento,
      observacoes: form.observacoes || null,
    };

    if (!payload.descricao || !payload.valor || !payload.data_vencimento) {
      showFeedback("error", "Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await financeiroService.atualizarConta(editingId, payload);
        showFeedback("success", "Conta atualizada!");
      } else {
        await financeiroService.criarConta(payload);
        showFeedback("success", "Conta cadastrada!");
      }
      cancelarEdicao();
      await Promise.all([carregarContas(), carregarResumo()]);
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePagarConta(id) {
    try {
      await financeiroService.pagarConta(id);
      await Promise.all([carregarContas(), carregarResumo()]);
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  async function handleReceberFaturamento(id) {
    try {
      const hoje = new Date().toISOString().split("T")[0];
      await financeiroService.receberFaturamento(id, hoje);
      await Promise.all([carregarFaturamentos(), carregarResumo()]);
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  function formatMoney(value) {
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Controle financeiro da empresa"
        action={
          <div className={styles.tenantChip}>
            <span className={styles.tenantDot} /><span>{tenant?.nome}</span>
          </div>
        }
      />

      {feedback && <div className={`alert alert-${feedback.type}`} role="alert">{feedback.message}</div>}

      <div className={styles.filtros}>
        <div className={styles.filtroGroup}>
          <label className={styles.filtroLabel}>Filtrar por data</label>
          <input type="date" className={styles.filtroInput} value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)} />
        </div>
        {filtroData && (
          <Button variant="ghost" onClick={() => setFiltroData("")}>Limpar</Button>
        )}
      </div>

      <div className={styles.abas}>
        {["resumo", "contas", "faturamentos"].map((a) => (
          <button key={a} className={`${styles.aba} ${aba === a ? styles.abaAtiva : ""}`}
            onClick={() => setAba(a)}>
            {a === "resumo" ? "📊 Resumo" : a === "contas" ? "💰 Contas a Pagar" : "📄 Faturamentos"}
          </button>
        ))}
      </div>

      {aba === "resumo" && resumo && (
        <div className={styles.resumoGrid}>
          <div className={styles.resumoCard}>
            <div className={styles.resumoIcon}>📈</div>
            <div className={styles.resumoValue}>{formatMoney(resumo.receitas.total)}</div>
            <div className={styles.resumoLabel}>Total Receitas</div>
            <div className={styles.resumoDet}>
              Recebido: {formatMoney(resumo.receitas.recebido)} · A receber: {formatMoney(resumo.receitas.a_receber)}
            </div>
          </div>
          <div className={styles.resumoCard}>
            <div className={styles.resumoIcon}>📉</div>
            <div className={styles.resumoValue}>{formatMoney(resumo.despesas.total)}</div>
            <div className={styles.resumoLabel}>Total Despesas</div>
            <div className={styles.resumoDet}>
              Pago: {formatMoney(resumo.despesas.pago)} · A pagar: {formatMoney(resumo.despesas.a_pagar)}
            </div>
          </div>
          <div className={`${styles.resumoCard} ${resumo.saldo >= 0 ? styles.resumoPos : styles.resumoNeg}`}>
            <div className={styles.resumoIcon}>{resumo.saldo >= 0 ? "✅" : "⚠️"}</div>
            <div className={styles.resumoValue}>{formatMoney(resumo.saldo)}</div>
            <div className={styles.resumoLabel}>Saldo</div>
          </div>
        </div>
      )}

      {aba === "contas" && (
        <div className={styles.contasLayout}>
          <div className={styles.formCard}>
            <div className={styles.cardHeader}>
              <h2>{editingId ? "Editar conta" : "Nova conta a pagar"}</h2>
            </div>
            <form onSubmit={handleSubmit} className={styles.contaForm}>
              <Input label="Descrição" name="descricao" placeholder="Ex: Aluguel"
                value={form.descricao} onChange={handleChange} required />
              <div className={styles.row}>
                <Input label="Valor (R$)" name="valor" type="number" step="0.01" min="0"
                  placeholder="0,00" value={form.valor} onChange={handleChange} required />
                <Input label="Vencimento" name="data_vencimento" type="date"
                  value={form.data_vencimento} onChange={handleChange} required />
              </div>
              <Input label="Observações" name="observacoes" placeholder="Opcional"
                value={form.observacoes} onChange={handleChange} />
              <div className={styles.formActions}>
                <Button type="submit" fullWidth loading={saving}>
                  {editingId ? "Salvar" : "Cadastrar"}
                </Button>
                {editingId && (
                  <Button variant="ghost" fullWidth onClick={cancelarEdicao}>Cancelar</Button>
                )}
              </div>
            </form>
          </div>

          <div className={styles.listCard}>
            <div className={styles.cardHeader}>
              <h2>Contas cadastradas</h2>
              <p>{totalContas} conta(s)</p>
            </div>
            {contas.length === 0 ? (
              <div className={styles.emptyState}>Nenhuma conta cadastrada.</div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Valor</th>
                      <th>Vencimento</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contas.map((c) => (
                      <tr key={c.conta_id}>
                        <td>{c.descricao}</td>
                        <td className={styles.valorCell}>{formatMoney(c.valor)}</td>
                        <td>{formatDate(c.data_vencimento)}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${c.pago ? styles.statusPago : styles.statusPendente}`}>
                            {c.pago ? "Pago" : "Pendente"}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionBtns}>
                            {!c.pago && (
                              <button className={styles.actionBtn} title="Pagar"
                                onClick={() => handlePagarConta(c.conta_id)}>✅</button>
                            )}
                            <button className={styles.actionBtn} title="Editar"
                              onClick={() => iniciarEdicao(c)}>✏️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination page={pageContas} limit={LIMIT} total={totalContas} onPageChange={setPageContas} />
          </div>
        </div>
      )}

      {aba === "faturamentos" && (
        <div className={styles.listCard}>
          <div className={styles.cardHeader}>
            <h2>Faturamentos</h2>
            <p>{totalFat} registro(s)</p>
          </div>
          {faturamentos.length === 0 ? (
            <div className={styles.emptyState}>Nenhum faturamento gerado ainda.</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>OS</th>
                    <th>Valor</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {faturamentos.map((f) => (
                    <tr key={f.faturamento_id}>
                      <td className={styles.osId}>{f.faturamento_id}</td>
                      <td>OS #{f.os_id}</td>
                      <td className={styles.valorCell}>{formatMoney(f.valor_total)}</td>
                      <td>{formatDate(f.criado_em?.split("T")[0])}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${f.pago ? styles.statusPago : styles.statusPendente}`}>
                          {f.pago ? "Recebido" : "Pendente"}
                        </span>
                      </td>
                      <td>
                        {!f.pago && (
                          <button className={styles.actionBtn} title="Receber"
                            onClick={() => handleReceberFaturamento(f.faturamento_id)}>💰</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={pageFat} limit={LIMIT} total={totalFat} onPageChange={setPageFat} />
        </div>
      )}
    </>
  );
}
