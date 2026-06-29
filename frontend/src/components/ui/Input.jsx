import { maskPhone } from "../../utils/formatPhone";

export function Input({ label, error, className = "", id, mask, onChange, value, ...props }) {
  const inputId = id || props.name;

  function handleChange(e) {
    if (mask === "phone") {
      const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
      e.target.value = maskPhone(raw);
    }
    onChange?.(e);
  }

  return (
    <div className="input-group">
      {label && (
        <label className="input-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`input-field${error ? " error" : ""} ${className}`}
        value={mask === "phone" && value ? maskPhone(value) : value}
        onChange={handleChange}
        {...props}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
