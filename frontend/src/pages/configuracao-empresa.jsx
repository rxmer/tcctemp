import { useState, useEffect, useRef } from "react";
import { useFeedback } from "../hooks/useFeedback";
import { configuracaoEmpresaService } from "../services/configuracao-empresa.service";
import { Input, Button, PageHeader, SkeletonCard } from "../components/ui";
import { Card } from "../components/crud";
import { Building2, Upload, X } from "lucide-react";

export function ConfiguracaoEmpresa() {
  const { feedback, showFeedback } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    nome_fantasia: "",
    cnpj: "",
    telefone: "",
    email: "",
    endereco: "",
    logo_url: "",
  });
  const [logoPreview, setLogoPreview] = useState("");

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
      setLoading(true);
      const data = await configuracaoEmpresaService.buscar();
      if (data) {
        setForm({
          nome_fantasia: data.nome_fantasia || "",
          cnpj: data.cnpj || "",
          telefone: data.telefone || "",
          email: data.email || "",
          endereco: data.endereco || "",
          logo_url: data.logo_url || "",
        });
        if (data.logo_url) setLogoPreview(data.logo_url);
      }
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    const newValue = name === "telefone" ? value.replace(/\D/g, "").slice(0, 11) : value;
    setForm((prev) => ({ ...prev, [name]: newValue }));
  }

  function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      showFeedback("error", "A logo deve ter no máximo 500KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setLogoPreview(dataUrl);
      setForm((prev) => ({ ...prev, logo_url: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  function removerLogo() {
    setLogoPreview("");
    setForm((prev) => ({ ...prev, logo_url: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function mascaraCNPJ(value) {
    const d = value.replace(/\D/g, "").slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await configuracaoEmpresaService.salvar({
        ...form,
        cnpj: form.cnpj.replace(/\D/g, ""),
      });
      window.dispatchEvent(new CustomEvent("empresa-salva"));
      showFeedback("success", "Configuração salva com sucesso!");
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Configuração da Empresa"
        subtitle="Personalize as informações da sua empresa"
      />

      {feedback && <div className={`alert alert-${feedback.type}`} role="alert">{feedback.message}</div>}

      {loading ? (
        <SkeletonCard lines={8} />
      ) : (
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Building2 size={20} style={{ color: "var(--accent)" }} />
              <h2 style={{ fontSize: 18, fontFamily: "var(--font-display)" }}>Dados da empresa</h2>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              <Input label="Nome fantasia" name="nome_fantasia" placeholder="Ex: Esteticar" value={form.nome_fantasia} onChange={handleChange} required />
              <Input label="CNPJ" name="cnpj" placeholder="00.000.000/0000-00" value={mascaraCNPJ(form.cnpj)} onChange={(e) => setForm((p) => ({ ...p, cnpj: e.target.value.replace(/\D/g, "") }))} />
              <Input label="Telefone" name="telefone" mask="phone" placeholder="(11) 99999-9999" value={form.telefone} onChange={handleChange} />
              <Input label="E-mail" name="email" type="email" placeholder="contato@esteticar.com.br" value={form.email} onChange={handleChange} />
              <Input label="Endereço" name="endereco" placeholder="Rua, número, bairro, cidade - UF" value={form.endereco} onChange={handleChange} style={{ gridColumn: "1 / -1" }} />

              <div className="input-group" style={{ gridColumn: "1 / -1" }}>
                <label className="input-label">Logo da empresa</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {logoPreview ? (
                    <div style={{ position: "relative", width: 80, height: 80, borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
                      <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                      <button type="button" onClick={removerLogo} style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><X size={12} /></button>
                    </div>
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: "var(--radius-sm)", border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>Sem logo</div>
                  )}
                  <button type="button" className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={14} /> Escolher arquivo
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleLogoUpload} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>PNG, JPG ou WEBP • máx 500KB</span>
                </div>
              </div>

              <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
                <Button type="submit" loading={saving} fullWidth>Salvar configurações</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
