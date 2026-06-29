import { useState, useEffect } from "react";
import { useFeedback } from "../hooks/useFeedback";
import { useAuth } from "../context/useAuth";
import { financeiroService } from "../services/financeiro.service";
import { Input, Button, PageHeader, Pagination, SkeletonTable } from "../components/ui";
import { Card, CardHeader, DataTable, ActionBtn, ActionBtns, styles as crud } from "../components/crud";
import { BarChart3, DollarSign, FileText, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Pencil, Wallet } from "lucide-react";

const formInitial = { descricao: "", valor: "", data_vencimento: "", observacoes: "" };

export function Financeiro() {
  const { tenant } = useAuth();
  const { feedback, showFeedback } = useFeedback();

  const [resumo, setResumo] = useState(null);
  const [contas, setContas] = useState([]);
  const [faturamentos, setFaturamentos] = useState([]);
  const [form, setForm] = useState({ ...formInitial });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const contasColumns = [
    { key: "descricao", label: "Descrição", render: (c) => c.descricao },
    { key: "valor", label: "Valor", render: (c) => formatMoney(c.valor) },
    { key: "data_vencimento", label: "Vencimento", render: (c) => formatDate(c.data_vencimento) },
    {
      key: "status",
      label: "Status",
      render: (c) => (
        <span className={crud.statusBadge} style={c.pago
          ? { background: "rgba(34,197,94,0.1)", color: "#86efac", border: "1px solid rgba(34,197,94,0.2)" }
          : { background: "rgba(245,158,11,0.1)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.2)" }
        }>
          {c.pago ? "Pago" : "Pendente"}
        </span>
      ),
    },
    {
      key: "acoes",
      label: "Ações",
      width: "1px",
      render: (c) => (
        <ActionBtns>
          {!c.pago && (
            <ActionBtn title="Pagar" onClick={() => handlePagarConta(c.conta_id)}>
              <CheckCircle2 size={14} />
            </ActionBtn>
          )}
          <ActionBtn title="Editar" onClick={() => iniciarEdicao(c)}>
            <Pencil size={14} />
          </ActionBtn>
        </ActionBtns>
      ),
    },
  ];

  const fatColumns = [
    { key: "faturamento_id", label: "#" },
    { key: "os_id", label: "OS", render: (f) => `OS #${f.os_id}` },
    { key: "valor_total", label: "Valor", render: (f) => formatMoney(f.valor_total) },
    { key: "data", label: "Data", render: (f) => formatDate(f.criado_em?.split("T")[0]) },
    {
      key: "status",
      label: "Status",
      render: (f) => (
        <span className={crud.statusBadge} style={f.pago
          ? { background: "rgba(34,197,94,0.1)", color: "#86efac", border: "1px solid rgba(34,197,94,0.2)" }
          : { background: "rgba(245,158,11,0.1)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.2)" }
        }>
          {f.pago ? "Recebido" : "Pendente"}
        </span>
      ),
    },
    {
      key: "acoes",
      label: "Ações",
      width: "1px",
      render: (f) => (
        !f.pago ? (
          <ActionBtn title="Receber" onClick={() => handleReceberFaturamento(f.faturamento_id)}>
            <Wallet size={14} />
          </ActionBtn>
        ) : null
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Controle financeiro da empresa"
        action={
          <div className={crud.tenantChip}>
            <span className={crud.tenantDot} /><span>{tenant?.nome}</span>
          </div>
        }
      />

      {feedback && <div className={`alert alert-${feedback.type}`} role="alert">{feedback.message}</div>}

      <div className={crud.filtros}>
        <div className={crud.filtroGroup}>
          <label className={crud.filtroLabel}>Filtrar por data</label>
          <input type="date" className={crud.filtroInput} value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)} />
        </div>
        {filtroData && (
          <Button variant="ghost" onClick={() => setFiltroData("")}>Limpar</Button>
        )}
      </div>

      <div className={crud.filtros} style={{ gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 24 }}>
        {["resumo", "contas", "faturamentos"].map((a) => (
          <button key={a} className={crud.aba} style={{
            padding: "10px 16px",
            background: "none",
            border: "none",
            color: aba === a ? "var(--accent)" : "var(--text-secondary)",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            borderBottom: aba === a ? "2px solid var(--accent)" : "2px solid transparent",
            transition: "all var(--transition)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
            onClick={() => setAba(a)}>
            {a === "resumo" ? <><BarChart3 size={14} /> Resumo</> : a === "contas" ? <><DollarSign size={14} /> Contas a Pagar</> : <><FileText size={14} /> Faturamentos</>}
          </button>
        ))}
      </div>

      {aba === "resumo" && resumo && (
        <div className="responsiveGrid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <Card style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <TrendingUp size={22} color="var(--accent)" />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700 }}>{formatMoney(resumo.receitas.total)}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Total Receitas</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Recebido: {formatMoney(resumo.receitas.recebido)} · A receber: {formatMoney(resumo.receitas.a_receber)}
            </div>
          </Card>
          <Card style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <TrendingDown size={22} color="var(--error)" />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700 }}>{formatMoney(resumo.despesas.total)}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Total Despesas</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Pago: {formatMoney(resumo.despesas.pago)} · A pagar: {formatMoney(resumo.despesas.a_pagar)}
            </div>
          </Card>
          <Card style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8, alignItems: "center", borderColor: resumo.saldo >= 0 ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)" }}>
            {resumo.saldo >= 0 ? <CheckCircle2 size={22} color="var(--success)" /> : <AlertTriangle size={22} color="var(--error)" />}
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: resumo.saldo >= 0 ? "#86efac" : "#fca5a5" }}>{formatMoney(resumo.saldo)}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Saldo</div>
          </Card>
        </div>
      )}

      {aba === "contas" && (
        <div className={crud.pageGrid}>
          <Card>
            <CardHeader title={editingId ? "Editar conta" : "Nova conta a pagar"} />
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Input label="Descrição" name="descricao" placeholder="Ex: Aluguel"
                value={form.descricao} onChange={handleChange} required />
              <div className={crud.row}>
                <Input label="Valor (R$)" name="valor" type="number" step="0.01" min="0"
                  placeholder="0,00" value={form.valor} onChange={handleChange} required />
                <Input label="Vencimento" name="data_vencimento" type="date"
                  value={form.data_vencimento} onChange={handleChange} required />
              </div>
              <Input label="Observações" name="observacoes" placeholder="Opcional"
                value={form.observacoes} onChange={handleChange} />
              <div className={crud.formActions}>
                <Button type="submit" fullWidth loading={saving}>
                  {editingId ? "Salvar" : "Cadastrar"}
                </Button>
                {editingId && (
                  <Button variant="ghost" fullWidth onClick={cancelarEdicao}>Cancelar</Button>
                )}
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader title="Contas cadastradas" subtitle={`${totalContas} conta(s)`} />
            {loading ? (
              <SkeletonTable columns={[3, 2, 2, 1.5, 1.5]} rows={5} />
            ) : (
            <DataTable
              columns={contasColumns}
              rows={contas.map((c) => ({ ...c, id: c.conta_id }))}
              emptyMessage="Nenhuma conta cadastrada."
            />
            )}
            <Pagination page={pageContas} limit={LIMIT} total={totalContas} onPageChange={setPageContas} />
          </Card>
        </div>
      )}

      {aba === "faturamentos" && (
        <Card>
          <CardHeader title="Faturamentos" subtitle={`${totalFat} registro(s)`} />
          {loading ? (
            <SkeletonTable columns={[1.5, 2, 2, 2, 1.5, 1.5]} rows={5} />
          ) : (
          <DataTable
            columns={fatColumns}
            rows={faturamentos.map((f) => ({ ...f, id: f.faturamento_id }))}
            emptyMessage="Nenhum faturamento gerado ainda."
          />
          )}
          <Pagination page={pageFat} limit={LIMIT} total={totalFat} onPageChange={setPageFat} />
        </Card>
      )}
    </>
  );
}
