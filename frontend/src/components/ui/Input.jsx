export function Input({ label, error, className = "", id, ...props }) {
  const inputId = id || props.name;

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
        {...props}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
