import { useEffect, useRef, useState } from "react";

/** Returns a value that updates only after `delay` ms of no changes. */
export function useDebounced<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Debounced callback; fires `fn` after `delay` ms of no calls. */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay = 500) {
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  return (...args: A) => {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(() => fnRef.current(...args), delay);
  };
}
