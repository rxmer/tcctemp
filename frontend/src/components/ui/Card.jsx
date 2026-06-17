export function Card({ children, className = "", ...props }) {
  return (
    <div className={`auth-card ${className}`} {...props}>
      {children}
    </div>
  );
}
