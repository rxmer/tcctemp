import { maskPhone } from "../../utils/formatPhone";

export function Input({ label, error, className = "", id, mask, onChange, value, ...props }) {
  const inputId = id || props.name;

  function handleChange(e) {
    if (mask === "phone") {
      e.target.value = maskPhone(e.target.value);
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
