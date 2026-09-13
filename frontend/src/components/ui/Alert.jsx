export function Alert({ variant = "error", children }) {
  return (
    <div className={`alert alert-${variant}`} role="alert">
      {variant !== "success" && <span>⚠</span>}
      {children}
    </div>
  );
}
