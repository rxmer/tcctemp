import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useFeedback } from "../hooks/useFeedback";
import { servicosService } from "../services/servicos.service";
import { expedienteService } from "../services/expediente.service";
import { configuracaoEmpresaService } from "../services/configuracao-empresa.service";
import { whatsappService } from "../services/whatsapp.service";
import { Input, Button, Alert, InlineSpinner } from "../components/ui";
import { QRCodeCanvas } from "qrcode.react";
import {
  Wrench,
  Clock,
  Building2,
  MessageCircle,
  CheckCircle2,
  Check,
  Plus,
  Trash2,
  Loader2,
  RotateCw,
  Smartphone,
  ArrowRight,
} from "lucide-react";
import styles from "../styles/pages/onboarding.module.css";

const STEPS = ["Serviços", "Horários", "Empresa", "WhatsApp", "Concluir"];

const DIAS_SEMANA = [
  { id: 0, nome: "Domingo" },
  { id: 1, nome: "Segunda" },
  { id: 2, nome: "Terça" },
  { id: 3, nome: "Quarta" },
  { id: 4, nome: "Quinta" },
  { id: 5, nome: "Sexta" },
  { id: 6, nome: "Sábado" },
];

const RESULTADO = [
  { key: "servicos", label: "Serviços", desc: "Catálogo pronto para agendar" },
  { key: "expediente", label: "Horários", desc: "Dias e horários de atendimento" },
  { key: "empresa", label: "Empresa", desc: "Dados que aparecem para o cliente" },
  { key: "whatsapp", label: "WhatsApp", desc: "Chatbot ativo para atender" },
];

export function Onboarding() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { feedback, showFeedback } = useFeedback();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [concluidos, setConcluidos] = useState({});

  const marcarDone = useCallback((key) => {
    setConcluidos((c) => (c[key] ? c : { ...c, [key]: true }));
  }, []);
  const doneServicos = useCallback(() => marcarDone("servicos"), [marcarDone]);
  const doneExpediente = useCallback(() => marcarDone("expediente"), [marcarDone]);
  const doneEmpresa = useCallback(() => marcarDone("empresa"), [marcarDone]);
  const doneWhatsapp = useCallback(() => marcarDone("whatsapp"), [marcarDone]);

  function concluir() {
    navigate("/dashboard", { replace: true });
  }

  const primeiroNome = usuario?.nome ? usuario.nome.split(" ")[0] : null;

  return (
    <div className={styles.layout}>
      <div className={styles.shell}>
        <aside className={styles.rail}>
          <div className={styles.railTop}>
            <div className={styles.brand}>
              <img src="/esteticar.png" alt="" className={styles.brandLogo} />
              <span className={styles.brandName}>EstetiCar</span>
            </div>
            <p className={styles.railLead}>
              Vamos deixar sua estética pronta para atender.
            </p>
          </div>

          <nav className={styles.stations} aria-label="Etapas da configuração">
            <span className={styles.spine} aria-hidden="true" />
            <span
              className={styles.spineFill}
              aria-hidden="true"
              style={{
                transform: `scaleY(${step / (STEPS.length - 1)})`,
              }}
            />
            {STEPS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <div
                  key={label}
                  className={`${styles.station} ${active ? styles.stationActive : ""} ${done ? styles.stationDone : ""}`}
                  aria-current={active ? "step" : undefined}
                >
                  <span className={styles.node}>
                    {done ? <Check size={14} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={styles.stationLabel}>{label}</span>
                </div>
              );
            })}
          </nav>

          <div className={styles.railFoot}>
            {primeiroNome ? (
              <p className={styles.greet}>
                Bem-vindo, <strong>{primeiroNome}</strong>
              </p>
            ) : (
              <p className={styles.greet}>Bem-vindo!</p>
            )}
            <p className={styles.railNote}>
              Tudo que você configurar aqui pode ser editado depois.
            </p>
          </div>
        </aside>

        <main className={styles.content}>
          <div className={styles.mobileBar}>
            <div className={styles.brand}>
              <img src="/esteticar.png" alt="" className={styles.brandLogo} />
              <span className={styles.brandName}>EstetiCar</span>
            </div>
            <span className={styles.mobileCount}>
              {step + 1} / {STEPS.length} · {STEPS[step]}
            </span>
          </div>
          <div className={styles.mobileRail} aria-hidden="true">
            <span
              style={{ transform: `scaleX(${step / (STEPS.length - 1)})` }}
            />
          </div>

          <header className={styles.contentHead}>
            <h1>{step === 4 ? "Tudo pronto!" : "Vamos configurar sua estética"}</h1>
            <p>
              {step === 4
                ? "Sua conta está pronta para uso."
                : `Passo ${step + 1} de ${STEPS.length}${primeiroNome ? ` — bem-vindo, ${primeiroNome}!` : " — bem-vindo!"}`}
            </p>
          </header>

          {feedback && <Alert variant={feedback.type}>{feedback.message}</Alert>}

          <div key={step} className={styles.body}>
            {step === 0 && (
              <StepServicos showFeedback={showFeedback} onDone={doneServicos} />
            )}
            {step === 1 && (
              <StepExpediente showFeedback={showFeedback} onDone={doneExpediente} />
            )}
            {step === 2 && (
              <StepEmpresa showFeedback={showFeedback} onDone={doneEmpresa} />
            )}
            {step === 3 && (
              <StepWhatsapp showFeedback={showFeedback} onDone={doneWhatsapp} />
            )}
            {step === 4 && (
              <div className={styles.doneBox}>
                <div className={styles.doneBadge}>
                  <CheckCircle2 size={46} className={styles.doneIcon} />
                </div>
                <h2>Sua estética está configurada</h2>
                <p>
                  Você já pode cadastrar clientes, criar agendamentos e acompanhar o
                  chatbot.
                </p>

                <ul className={styles.recap}>
                  {RESULTADO.map(({ key, label, desc }) => {
                    const ok = Boolean(concluidos[key]);
                    return (
                      <li
                        key={key}
                        className={`${styles.recapItem} ${ok ? styles.recapDone : ""}`}
                      >
                        <span className={styles.recapMark}>
                          {ok ? (
                            <Check size={13} strokeWidth={3} />
                          ) : (
                            <span className={styles.recapDash} />
                          )}
                        </span>
                        <span className={styles.recapText}>
                          <strong>{label}</strong>
                          <small>{desc}</small>
                        </span>
                        <span className={styles.recapState}>
                          {ok ? "Configurado" : "Pendente"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <div className={styles.actionsLeft}>
              {step > 0 && step < 4 && (
                <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={saving}>
                  ← Voltar
                </Button>
              )}
            </div>
            {step < 4 && (
              <div className={styles.actionsRight}>
                <button type="button" className={styles.skip} onClick={concluir}>
                  Pular configuração
                </button>
                <Button
                  onClick={() => {
                    if (step === 3) setSaving(true);
                    setStep((s) => s + 1);
                  }}
                >
                  {step === 3 ? "Finalizar" : "Continuar"} <ArrowRight size={16} />
                </Button>
              </div>
            )}
            {step === 4 && (
              <Button onClick={concluir} fullWidth>
                Ir para o dashboard
              </Button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function StepServicos({ showFeedback, onDone }) {
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState({ nome_servico: "", preco_base: "", duracao_min: "60" });
  const [adding, setAdding] = useState(false);

  async function carregar() {
    try {
      const result = await servicosService.listar({ page: 1, limit: 50 });
      setServicos(result.data ?? []);
      if ((result.data ?? []).length) onDone?.();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    servicosService.listar({ page: 1, limit: 50 })
      .then((result) => {
        if (!mounted) return;
        setServicos(result.data ?? []);
        if ((result.data ?? []).length) onDone?.();
      })
      .catch((err) => showFeedback("error", err.message))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [showFeedback, onDone]);

  async function handleAdd() {
    if (!novo.nome_servico.trim() || novo.preco_base === "" || !novo.duracao_min) {
      showFeedback("error", "Preencha nome, preço e duração");
      return;
    }
    try {
      setAdding(true);
      await servicosService.criar({
        nome_servico: novo.nome_servico.trim(),
        descricao: "",
        preco_base: Number(novo.preco_base),
        duracao_min: Number(novo.duracao_min),
      });
      setNovo({ nome_servico: "", preco_base: "", duracao_min: "60" });
      await carregar();
      onDone?.();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemover(servico) {
    try {
      await servicosService.deletar(servico.servico_id);
      await carregar();
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  if (loading)
    return (
      <div className={styles.loading}>
        <InlineSpinner /> Carregando serviços...
      </div>
    );

  return (
    <div className={styles.stepBody}>
      <div className={styles.stepHero}>
        <Wrench size={22} />
        <div>
          <h3>Serviços oferecidos</h3>
          <p>
            Já deixamos alguns serviços comuns prontos. Edite ou remova depois na tela
            de Serviços.
          </p>
        </div>
      </div>

      <ul className={styles.list}>
        {servicos.map((s) => (
          <li key={s.servico_id} className={styles.listItem}>
            <div>
              <strong>{s.nome_servico}</strong>
              <span>
                {Number(s.preco_base).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}{" "}
                · {s.duracao_min} min
              </span>
            </div>
            <button
              type="button"
              className={styles.remove}
              title="Remover"
              aria-label={`Remover ${s.nome_servico}`}
              onClick={() => handleRemover(s)}
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
        {servicos.length === 0 && (
          <li className={styles.empty}>
            Nenhum serviço ainda. Adicione o primeiro abaixo.
          </li>
        )}
      </ul>

      <div className={styles.addRow}>
        <Input
          aria-label="Nome do serviço"
          placeholder="Nome do serviço"
          value={novo.nome_servico}
          onChange={(e) => setNovo((n) => ({ ...n, nome_servico: e.target.value }))}
        />
        <Input
          aria-label="Preço em reais"
          type="number"
          min="0"
          step="0.01"
          placeholder="Preço (R$)"
          value={novo.preco_base}
          onChange={(e) => setNovo((n) => ({ ...n, preco_base: e.target.value }))}
        />
        <Input
          aria-label="Duração em minutos"
          type="number"
          min="1"
          placeholder="Duração (min)"
          value={novo.duracao_min}
          onChange={(e) => setNovo((n) => ({ ...n, duracao_min: e.target.value }))}
        />
        <Button type="button" variant="ghost" onClick={handleAdd} loading={adding}>
          <Plus size={15} /> Adicionar
        </Button>
      </div>
    </div>
  );
}

function StepExpediente({ showFeedback, onDone }) {
  const [dias, setDias] = useState(
    DIAS_SEMANA.map((d) => ({
      dia_semana: d.id,
      abertura: "08:00",
      fechamento: "18:00",
      ativo: d.id >= 1 && d.id <= 5,
    }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    expedienteService
      .listar()
      .then((dados) => {
        if (!mounted || !dados?.length) return;
        const mapa = {};
        dados.forEach((d) => {
          mapa[d.dia_semana] = d;
        });
        setDias(
          DIAS_SEMANA.map((d) => {
            const salvo = mapa[d.id];
            return salvo
              ? {
                  dia_semana: d.id,
                  abertura: salvo.abertura || "08:00",
                  fechamento: salvo.fechamento || "18:00",
                  ativo: salvo.ativo,
                }
              : { dia_semana: d.id, abertura: "08:00", fechamento: "18:00", ativo: false };
          })
        );
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function handleChange(diaSemana, field, value) {
    setDias((prev) =>
      prev.map((d) => (d.dia_semana === diaSemana ? { ...d, [field]: value } : d))
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await expedienteService.upsertAll(
        dias.map((d) => ({
          ...d,
          abertura: d.ativo ? d.abertura : null,
          fechamento: d.ativo ? d.fechamento : null,
        }))
      );
      showFeedback("success", "Horários salvos!");
      onDone?.();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className={styles.loading}>
        <InlineSpinner /> Carregando horários...
      </div>
    );

  return (
    <div className={styles.stepBody}>
      <div className={styles.stepHero}>
        <Clock size={22} />
        <div>
          <h3>Horários de funcionamento</h3>
          <p>Ajuste os dias e horários em que sua estética atende.</p>
        </div>
      </div>

      <div className={styles.dias}>
        {dias.map((dia) => {
          const info = DIAS_SEMANA.find((d) => d.id === dia.dia_semana);
          return (
            <div
              key={dia.dia_semana}
              className={`${styles.dia} ${dia.ativo ? "" : styles.diaOff}`}
            >
              <label className={styles.diaToggle}>
                <input
                  type="checkbox"
                  checked={dia.ativo}
                  onChange={(e) =>
                    handleChange(dia.dia_semana, "ativo", e.target.checked)
                  }
                />
                <span>{info?.nome}</span>
              </label>
              <input
                type="time"
                className="input-field"
                aria-label={`Abertura de ${info?.nome}`}
                value={dia.abertura || ""}
                disabled={!dia.ativo}
                onChange={(e) =>
                  handleChange(dia.dia_semana, "abertura", e.target.value)
                }
              />
              <span className={styles.dash}>até</span>
              <input
                type="time"
                className="input-field"
                aria-label={`Fechamento de ${info?.nome}`}
                value={dia.fechamento || ""}
                disabled={!dia.ativo}
                onChange={(e) =>
                  handleChange(dia.dia_semana, "fechamento", e.target.value)
                }
              />
            </div>
          );
        })}
      </div>

      <Button variant="ghost" onClick={handleSave} loading={saving}>
        Salvar horários
      </Button>
    </div>
  );
}

function StepEmpresa({ showFeedback, onDone }) {
  const [form, setForm] = useState({ nome_fantasia: "", telefone: "", endereco: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    configuracaoEmpresaService
      .buscar()
      .then((data) => {
        if (!mounted || !data) return;
        setForm({
          nome_fantasia: data.nome_fantasia || "",
          telefone: data.telefone || "",
          endereco: data.endereco || "",
        });
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await configuracaoEmpresaService.salvar(form);
      window.dispatchEvent(new CustomEvent("empresa-salva"));
      showFeedback("success", "Dados da empresa salvos!");
      onDone?.();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className={styles.loading}>
        <InlineSpinner /> Carregando dados...
      </div>
    );

  return (
    <div className={styles.stepBody}>
      <div className={styles.stepHero}>
        <Building2 size={22} />
        <div>
          <h3>Dados da empresa</h3>
          <p>Essas informações aparecem para seus clientes e nos relatórios.</p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <Input
          label="Nome fantasia"
          name="nome_fantasia"
          value={form.nome_fantasia}
          onChange={handleChange}
          placeholder="Ex: Auto Brilho Premium"
          autoComplete="organization"
        />
        <Input
          label="Telefone"
          name="telefone"
          mask="phone"
          value={form.telefone}
          onChange={handleChange}
          placeholder="(11) 99999-9999"
          autoComplete="tel"
        />
        <Input
          label="Endereço"
          name="endereco"
          value={form.endereco}
          onChange={handleChange}
          placeholder="Rua, número, bairro, cidade - UF"
          autoComplete="street-address"
        />
      </div>

      <Button variant="ghost" onClick={handleSave} loading={saving}>
        Salvar dados
      </Button>
    </div>
  );
}

function StepWhatsapp({ showFeedback, onDone }) {
  const [state, setState] = useState({ status: "disconnected" });
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);
  const notified = useRef(false);

  const carregarStatus = useCallback(async () => {
    try {
      const data = await whatsappService.getStatus();
      if (mounted.current) setState(data);
    } catch {
      /* ignora erro de polling */
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    whatsappService
      .getStatus()
      .then((data) => {
        if (mounted.current) setState(data);
      })
      .catch(() => {
        /* ignora */
      });
    const id = setInterval(carregarStatus, 5000);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [carregarStatus]);

  async function handleConnect() {
    try {
      setLoading(true);
      await whatsappService.connect();
      setState((prev) => ({ ...prev, status: "connecting" }));
      setTimeout(carregarStatus, 800);
      setTimeout(carregarStatus, 1800);
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  const conectado = state.status === "connected";

  useEffect(() => {
    if (conectado && !notified.current) {
      notified.current = true;
      onDone?.();
    }
  }, [conectado, onDone]);

  return (
    <div className={styles.stepBody}>
      <div className={styles.stepHero}>
        <MessageCircle size={22} />
        <div>
          <h3>Conecte o WhatsApp</h3>
          <p>
            Escaneie o QR Code para o chatbot começar a atender seus clientes
            automaticamente.
          </p>
        </div>
      </div>

      <div className={styles.qrArea}>
        {conectado ? (
          <div className={styles.connected}>
            <CheckCircle2 size={48} color="var(--success)" />
            <p>WhatsApp conectado!</p>
          </div>
        ) : state.status === "awaiting_qr" && state.qrCode ? (
          <QRCodeCanvas value={state.qrCode} size={220} level="M" />
        ) : state.status === "qr_expired" ? (
          <button type="button" className={styles.qrReload} onClick={handleConnect}>
            <RotateCw size={40} />
            <span>Recarregar QR Code</span>
          </button>
        ) : state.status === "connecting" || state.status === "awaiting_qr" ? (
          <div className={styles.connected}>
            <Loader2 size={40} className="spin" />
            <p>Gerando QR Code...</p>
          </div>
        ) : (
          <div className={styles.connected}>
            <Smartphone size={40} />
            <Button onClick={handleConnect} loading={loading}>
              Conectar WhatsApp
            </Button>
          </div>
        )}
      </div>
      <p className={styles.hint}>Você pode conectar depois na tela de WhatsApp.</p>
    </div>
  );
}
