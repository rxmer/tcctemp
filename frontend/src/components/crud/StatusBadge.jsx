import styles from "./styles.module.css";

const VARIANT_CLASSES = {
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  danger: styles.badgeDanger,
  info: styles.badgeInfo,
  neutral: styles.badgeNeutral,
};

export function StatusBadge({ variant = "neutral", children, ...rest }) {
  return (
    <span className={`${styles.statusBadge} ${VARIANT_CLASSES[variant]}`} {...rest}>
      {children}
    </span>
  );
}