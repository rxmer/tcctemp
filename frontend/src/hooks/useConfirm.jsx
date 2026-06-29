import { useState, useCallback, useRef, useEffect } from "react";

export function useConfirm() {
  const [state, setState] = useState({ show: false, message: "" });
  const resolveRef = useRef(null);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  const confirm = useCallback((message) => {
    previousFocusRef.current = document.activeElement;
    setState({ show: true, message });
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = useCallback((value) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setState({ show: false, message: "" });
    if (previousFocusRef.current) {
      setTimeout(() => previousFocusRef.current?.focus(), 0);
    }
  }, []);

  useEffect(() => {
    if (!state.show) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        close(false);
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state.show, close]);

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
          ref={dialogRef}
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
