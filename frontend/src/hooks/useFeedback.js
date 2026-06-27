import { useState, useCallback, useEffect, useRef } from "react";

export function useFeedback() {
  const [feedback, setFeedback] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showFeedback = useCallback((type, message) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setFeedback({ type, message });
    timerRef.current = setTimeout(() => setFeedback(null), 4000);
  }, []);

  const clearFeedback = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setFeedback(null);
  }, []);

  return { feedback, showFeedback, clearFeedback };
}
