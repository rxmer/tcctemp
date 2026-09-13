import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { useFeedback } from "../hooks/useFeedback";
import { Input, Button, PageHeader, Alert, TenantChip } from "../components/ui";
import { Card, CardHeader, styles as crud } from "../components/crud";
import { supabase } from "../lib/supabase";
import { ShieldCheck, KeyRound } from "lucide-react";
import styles from "../styles/pages/perfil.module.css";

const ROLE_LABEL = {
  admin: "Administrador",
  funcionario: "Funcionário",
};

export function Perfil() {
  const { usuario, tenant } = useAuth();
  const { feedback, showFeedback } = useFeedback();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [saving, setSaving] = useState(false);

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
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setSaving(false);
    }
  }

  const inicial = usuario?.nome?.[0]?.toUpperCase() ?? "?";
  const perfilLabel = ROLE_LABEL[usuario?.perfil] || "Funcionário";

  return (
    <>
      <PageHeader
        title="Meu Perfil"
        subtitle="Visualize seus dados e altere sua senha"
        action={<TenantChip nome={tenant?.nome} />}
      />

      {feedback && <Alert variant={feedback.type}>{feedback.message}</Alert>}

      <div className={crud.pageGrid + " responsiveGrid"} style={{ gridTemplateColumns: "1fr 1fr", maxWidth: 980 }}>
        <Card>
          <CardHeader title="Minha conta" subtitle="Seus dados de acesso" />
          <div className={styles.identity}>
            <div className={styles.avatar}>{inicial}</div>
            <div className={styles.identityInfo}>
              <p className={styles.name}>{usuario?.nome || "—"}</p>
              <p className={styles.email}>{usuario?.email || "—"}</p>
            </div>
          </div>
          <div className={styles.divider} />
          <div className={styles.accountMeta}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Perfil</span>
              <span className={styles.roleBadge}>
                <ShieldCheck size={13} />
                {perfilLabel}
              </span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Empresa</span>
              <span className={styles.metaValue}>{tenant?.nome || "—"}</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Alterar senha" subtitle="Renove sua senha para manter a conta segura" />
          <form onSubmit={handleChangePassword} className={styles.form}>
            <Input
              label="Senha atual"
              name="senhaAtual"
              type="password"
              placeholder="********"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              autoComplete="current-password"
              required
            />
            <div className={crud.row}>
              <Input
                label="Nova senha"
                name="novaSenha"
                type="password"
                placeholder="********"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                autoComplete="new-password"
                required
              />
              <Input
                label="Confirmar nova senha"
                name="confirmarSenha"
                type="password"
                placeholder="********"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <p className={styles.hint}>A nova senha deve ter no mínimo 8 caracteres.</p>
            <div className={crud.formActions}>
              <Button type="submit" fullWidth loading={saving}>
                {!saving && <KeyRound size={16} />}
                Alterar senha
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <div className={styles.securityNote}>
        <ShieldCheck size={16} />
        <span>Mantenha sua senha em segredo e não a compartilhe com outras pessoas.</span>
      </div>
    </>
  );
}