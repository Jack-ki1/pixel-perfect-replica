import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
const KEY = "br-theme";
const listeners = new Set<() => void>();

const read = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");

/** Theme lives on <html class="dark">; an inline head script restores the saved choice before paint. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    read,
    () => "dark" as Theme,
  );
  const set = useCallback((t: Theme) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    try { localStorage.setItem(KEY, t); } catch { /* storage unavailable */ }
    listeners.forEach((l) => l());
  }, []);
  return [theme, set];
}
