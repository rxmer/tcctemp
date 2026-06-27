import { useState, useCallback, useRef } from "react";

export function useConfirm() {
  const [state, setState] = useState({ show: false, message: "" });
  const resolveRef = useRef(null);

  const confirm = useCallback((message) => {
    setState({ show: true, message });
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = useCallback((value) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setState({ show: false, message: "" });
  }, []);

  function ConfirmModal() {
    if (!state.show) return null;

    return (
      <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={() => close(false)}
      >
        <div
          className="modal-content"
          role="document"
          onClick={(e) => e.stopPropagation()}
        >
          <p id="confirm-title" className="modal-message">{state.message}</p>
          <div className="modal-actions">
            <button
              className="modal-btn modal-btn-cancel"
              type="button"
              onClick={() => close(false)}
              autoFocus
            >
              Cancelar
            </button>
            <button
              className="modal-btn modal-btn-confirm"
              type="button"
              onClick={() => close(true)}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return { confirm, ConfirmModal };
}
