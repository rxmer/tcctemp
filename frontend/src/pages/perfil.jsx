import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { useFeedback } from "../hooks/useFeedback";
import { Input, Button, PageHeader } from "../components/ui";
import { Card } from "../components/crud";
import { supabase } from "../lib/supabase";

export function Perfil() {
  const { usuario } = useAuth();
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

  return (
    <>
      <PageHeader
        title="Meu Perfil"
        subtitle="Visualize seus dados e altere sua senha"
      />

      {feedback && <div className={`alert alert-${feedback.type}`} role="alert">{feedback.message}</div>}

      <div className="responsiveGrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, maxWidth: 800 }}>
        <Card>
          <h2 style={{ fontSize: 18, fontFamily: "var(--font-display)", marginBottom: 16 }}>Dados do usuário</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Nome</span>
              <p style={{ fontSize: 15, marginTop: 2 }}>{usuario?.nome || "—"}</p>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>E-mail</span>
              <p style={{ fontSize: 15, marginTop: 2 }}>{usuario?.email || "—"}</p>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Perfil</span>
              <p style={{ fontSize: 15, marginTop: 2, textTransform: "capitalize" }}>{usuario?.perfil || "—"}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 style={{ fontSize: 18, fontFamily: "var(--font-display)", marginBottom: 16 }}>Alterar senha</h2>
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="Senha atual" name="senhaAtual" type="password" placeholder="********" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required />
            <Input label="Nova senha" name="novaSenha" type="password" placeholder="********" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required />
            <Input label="Confirmar senha" name="confirmarSenha" type="password" placeholder="********" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} required />
            <Button type="submit" loading={saving} fullWidth>Alterar senha</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
