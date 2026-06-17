export function FullPageSpinner({ message }) {
  return (
    <div className="fullpage-spinner">
      <div className="spinner" />
      {message && <p>{message}</p>}
    </div>
  );
}

export function InlineSpinner() {
  return <span className="btn-spinner" />;
}
