import styles from "../crud/styles.module.css";

export function TenantChip({ nome }) {
  return (
    <div className={styles.tenantChip}>
      <span className={styles.tenantDot} />
      <span>{nome}</span>
    </div>
  );
}