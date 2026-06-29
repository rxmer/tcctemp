import styles from "./styles.module.css";

export function Card({ children, className = "", ...rest }) {
  return (
    <div className={`${styles.card} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle }) {
  return (
    <div className={styles.cardHeader}>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
