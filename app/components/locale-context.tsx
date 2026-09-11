"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

export type Locale = "en" | "fr";

const KEY = "clarte-locale";
const EVENT = "clarte-locale";

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void };
const LocaleContext = createContext<LocaleContextValue | null>(null);

function readLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "en" || saved === "fr") return saved;
  } catch {}
  return navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(EVENT, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(EVENT, notify);
  };
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, readLocale, (): Locale => "en");

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale: (next: Locale) => {
        try {
          window.localStorage.setItem(KEY, next);
        } catch {}
        window.dispatchEvent(new Event(EVENT));
      },
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}
