export function Button({
  children,
  variant = "primary",
  loading = false,
  fullWidth = false,
  className = "",
  disabled,
  ...props
}) {
  const classes = [
    "btn",
    variant === "primary" ? "btn-primary" : "btn-ghost",
    fullWidth ? "btn-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading ? (
        <>
          <span className="btn-spinner" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
