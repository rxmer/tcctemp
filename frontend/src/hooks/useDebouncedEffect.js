import { useEffect, useRef } from "react";

export function useDebouncedEffect(effect, deps, delay = 400) {
  const dataRef = useRef({ effect, delay });

  useEffect(() => {
    dataRef.current.effect = effect;
    dataRef.current.delay = delay;
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      dataRef.current.effect();
    }, dataRef.current.delay);

    return () => {
      clearTimeout(timeout);
    };
  }, deps);
}