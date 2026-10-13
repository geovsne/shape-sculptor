import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
const KEY = "myolab:theme";
const EVENT = "myolab:theme";

/** runs in <head> before the first paint so the page never flashes the wrong theme */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light"}catch(e){}})()`;

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    if (t === "light" || t === "dark" || t === "system") return t;
  } catch {
    /* storage blocked */
  }
  return "system";
}

function apply(t: Theme) {
  const dark =
    t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* storage blocked: still applies for this visit */
  }
  apply(t);
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** the chosen theme; "Automático" follows the phone setting while the app is open */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, set] = useState<Theme>("system");
  useEffect(() => {
    set(getTheme());
    const sync = () => set(getTheme());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return [theme, setTheme];
}

/** keeps "Automático" in step with the system setting */
export function useSystemThemeSync() {
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => {
      if (getTheme() === "system") apply("system");
    };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
}
