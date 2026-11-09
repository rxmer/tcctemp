import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { useFeedback } from "../hooks/useFeedback";
import { Input, Button, PageHeader, Alert } from "../components/ui";
import { supabase } from "../lib/supabase";
import {
  ShieldCheck,
  UserRoundCheck,
  KeyRound,
  Building2,
  CalendarDays,
  Eye,
  EyeOff,
  LockKeyhole,
  Check,
  Circle,
  X,
} from "lucide-react";
import styles from "../styles/pages/perfil.module.css";

const ROLE_LABEL = {
  admin: "Administrador",
  funcionario: "Funcionário",
};

const STRENGTH_LABELS = ["Aguardando", "Fraca", "Razoável", "Boa", "Forte"];

function formatMemberSince(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getPasswordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export function Perfil() {
  const { usuario, tenant } = useAuth();
  const { feedback, showFeedback } = useFeedback();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState({
    atual: false,
    nova: false,
    confirmar: false,
  });

  async function handleChangePassword(e) {
    e.preventDefault();
    if (novaSenha.length < 8) {
      showFeedback("error", "Nova senha deve ter no mínimo 8 caracteres");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      showFeedback("error", "As senhas não coincidem");
      return;
    }
    setSaving(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: usuario?.email,
        password: senhaAtual,
      });
      if (verifyError) {
        showFeedback("error", "Senha atual incorreta");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      showFeedback("success", "Senha alterada com sucesso!");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      setVisible({ atual: false, nova: false, confirmar: false });
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleVisibility(field) {
    setVisible((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  const inicial = usuario?.nome?.[0]?.toUpperCase() ?? "?";
  const perfilLabel = ROLE_LABEL[usuario?.perfil] || "Funcionário";
  const RoleIcon = usuario?.perfil === "admin" ? ShieldCheck : UserRoundCheck;
  const memberSince = formatMemberSince(usuario?.criado_em);
  const strength = getPasswordStrength(novaSenha);
  const lengthOk = novaSenha.length >= 8;
  const confirmState = !confirmarSenha ? "pending" : novaSenha === confirmarSenha ? "met" : "miss";
  const confirmClass =
    confirmState === "met"
      ? styles.requirementMet
      : confirmState === "miss"
        ? styles.requirementMiss
        : styles.requirement;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Meu Perfil"
        subtitle="Seus dados de acesso e a segurança da conta"
      />

      <div className={styles.layout}>
        <section className={`${styles.panel} ${styles.identityPanel}`}>
          <span className={styles.watermark} aria-hidden="true">
            {inicial}
          </span>

          <div className={styles.identityHead}>
            <div className={styles.avatarWrap}>
              <span className={styles.avatarRing} aria-hidden="true" />
              <div className={styles.avatar}>{inicial}</div>
              <span className={styles.avatarBadge} aria-hidden="true">
                <RoleIcon size={13} />
              </span>
            </div>
            <span className={styles.sessionPill}>
              <span className={styles.sessionDot} aria-hidden="true" />
              Sessão ativa
            </span>
          </div>

          <div className={styles.identityBody}>
            <h2 className={styles.name}>{usuario?.nome || "—"}</h2>
            <p className={styles.email}>{usuario?.email || "—"}</p>
            <span className={styles.roleBadge}>
              <RoleIcon size={12} aria-hidden="true" />
              {perfilLabel}
            </span>
          </div>

          <dl className={styles.metaList}>
            <div className={styles.metaRow}>
              <span className={styles.metaIcon} aria-hidden="true">
                <Building2 size={16} />
              </span>
              <div className={styles.metaText}>
                <dt className={styles.metaLabel}>Empresa</dt>
                <dd className={styles.metaValue}>{tenant?.nome || "—"}</dd>
              </div>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaIcon} aria-hidden="true">
                <CalendarDays size={16} />
              </span>
              <div className={styles.metaText}>
                <dt className={styles.metaLabel}>Membro desde</dt>
                <dd className={styles.metaValue}>{memberSince}</dd>
              </div>
            </div>
          </dl>

          <div className={styles.securityNote}>
            <LockKeyhole size={15} aria-hidden="true" />
            <span>Mantenha sua senha em segredo e não a compartilhe com outras pessoas.</span>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.securityPanel}`}>
          <header className={styles.panelHeader}>
            <span className={styles.headerIcon} aria-hidden="true">
              <KeyRound size={20} />
            </span>
            <div>
              <h2>Alterar senha</h2>
              <p>Renove sua senha para manter a conta segura.</p>
            </div>
          </header>

          {feedback && <Alert variant={feedback.type}>{feedback.message}</Alert>}

          <form onSubmit={handleChangePassword} className={styles.passwordForm}>
            <Input
              label="Senha atual"
              name="senhaAtual"
              type={visible.atual ? "text" : "password"}
              placeholder="Digite sua senha atual"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              autoComplete="current-password"
              required
              suffix={
                <button
                  type="button"
                  className="input-affix-btn"
                  onClick={() => toggleVisibility("atual")}
                  aria-label={visible.atual ? "Ocultar senha atual" : "Mostrar senha atual"}
                >
                  {visible.atual ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <div className={styles.passwordGrid}>
              <Input
                label="Nova senha"
                name="novaSenha"
                type={visible.nova ? "text" : "password"}
                placeholder="Crie uma nova senha"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                autoComplete="new-password"
                required
                suffix={
                  <button
                    type="button"
                    className="input-affix-btn"
                    onClick={() => toggleVisibility("nova")}
                    aria-label={visible.nova ? "Ocultar nova senha" : "Mostrar nova senha"}
                  >
                    {visible.nova ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              <Input
                label="Confirmar nova senha"
                name="confirmarSenha"
                type={visible.confirmar ? "text" : "password"}
                placeholder="Repita a nova senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                autoComplete="new-password"
                required
                suffix={
                  <button
                    type="button"
                    className="input-affix-btn"
                    onClick={() => toggleVisibility("confirmar")}
                    aria-label={
                      visible.confirmar ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"
                    }
                  >
                    {visible.confirmar ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </div>

            <div className={styles.strength} data-score={strength}>
              <div className={styles.strengthTop}>
                <span>Força da senha</span>
                <strong>{STRENGTH_LABELS[strength]}</strong>
              </div>
              <div className={styles.strengthTrack} aria-hidden="true">
                {[1, 2, 3, 4].map((level) => (
                  <span
                    key={level}
                    className={`${styles.strengthSegment} ${
                      level <= strength ? styles.strengthSegmentActive : ""
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className={styles.requirements}>
              <span className={lengthOk ? styles.requirementMet : styles.requirement}>
                {lengthOk ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
                Mínimo de 8 caracteres
              </span>
              <span className={confirmClass}>
                {confirmState === "met" ? (
                  <Check size={14} aria-hidden="true" />
                ) : confirmState === "miss" ? (
                  <X size={14} aria-hidden="true" />
                ) : (
                  <Circle size={14} aria-hidden="true" />
                )}
                {confirmState === "miss" ? "As senhas não coincidem" : "As senhas coincidem"}
              </span>
            </div>

            <div className={styles.formActions}>
              <Button type="submit" loading={saving}>
                {!saving && <KeyRound size={16} />}
                {saving ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
