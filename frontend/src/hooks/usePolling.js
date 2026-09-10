import { useEffect, useRef } from "react";

export function usePolling(callback, delay) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay == null) return undefined;

    function run() {
      savedCallback.current();
    }

    function start() {
      return setInterval(run, delay);
    }

    let timer = start();

    function handleVisibility() {
      if (document.hidden) {
        clearInterval(timer);
        timer = null;
      } else {
        clearInterval(timer);
        run();
        timer = start();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [delay]);
}