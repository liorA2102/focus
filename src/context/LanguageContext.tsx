"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "en" | "he";

type LanguageContextType = {
  lang: Lang;
  dir: "ltr" | "rtl";
  toggle: () => void;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  dir: "ltr",
  toggle: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("focus-lang") as Lang | null;
    if (saved === "en" || saved === "he") setLang(saved);
  }, []);

  // Apply dir + lang to <html> whenever lang changes
  useEffect(() => {
    const dir = lang === "he" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem("focus-lang", lang);
  }, [lang]);

  const toggle = () => setLang((l) => (l === "en" ? "he" : "en"));

  return (
    <LanguageContext.Provider value={{ lang, dir: lang === "he" ? "rtl" : "ltr", toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
