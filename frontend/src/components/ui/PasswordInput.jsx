import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./Input";

export function PasswordInput({ label, ...props }) {
  const [visible, setVisible] = useState(false);
  const alvo = (label || "senha").toLowerCase();

  return (
    <Input
      {...props}
      label={label}
      type={visible ? "text" : "password"}
      suffix={
        <button
          type="button"
          className="input-affix-btn"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Ocultar ${alvo}` : `Mostrar ${alvo}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
    />
  );
}
