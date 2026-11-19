"use client";

import { useCallback, useEffect, useState } from "react";

/** localStorage-backed state that is safe for SSR (hydrates after mount). */
export function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore corrupt or unavailable storage */
    }
    setReady(true);
  }, [key]);

  const set = useCallback(
    (next: T): boolean => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
        return true;
      } catch {
        return false; // quota exceeded or storage disabled
      }
    },
    [key],
  );

  return [value, set, ready] as const;
}
