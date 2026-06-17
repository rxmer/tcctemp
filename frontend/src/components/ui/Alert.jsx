export function Alert({ variant = "error", children }) {
  return (
    <div className={`alert alert-${variant}`} role="alert">
      <span>⚠</span> {children}
    </div>
  );
}
