import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";

export type Language = "en" | "ar";

export const LANGUAGE_NAMES: Record<Language, string> = { en: "English", ar: "العربية" };

const DIR: Record<Language, "ltr" | "rtl"> = { en: "ltr", ar: "rtl" };

// Languages with message files; the English bundle is built in, the rest load on demand.
const LOADERS: Partial<Record<Language, () => Promise<{ default: typeof en }>>> = {
  en: async () => ({ default: en }),
};

export const LOCALES = Object.keys(LOADERS) as Language[];

const STORAGE_KEY = "language";

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && LOCALES.includes(value as Language);
}

function storedLanguage(): Language | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

function browserLanguage(): Language | null {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.split("-")[0];
    if (isLanguage(base)) return base;
  }
  return null;
}

export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : "en";
}

function applyDocument(lang: Language) {
  document.documentElement.lang = lang;
  document.documentElement.dir = DIR[lang];
}

export async function setLanguage(lang: Language): Promise<void> {
  const load = LOADERS[lang];
  if (!load) return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage blocked */
  }
  if (!i18n.hasResourceBundle(lang, "common")) {
    const { default: bundle } = await load();
    for (const [ns, messages] of Object.entries(bundle)) i18n.addResourceBundle(lang, ns, messages);
  }
  if (lang !== i18n.language) await i18n.changeLanguage(lang);
}

i18n.on("languageChanged", (lng) => applyDocument(isLanguage(lng) ? lng : "en"));

const initial = storedLanguage() ?? browserLanguage() ?? "en";

i18n.use(initReactI18next).init({
  resources: { en },
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  ns: Object.keys(en),
  interpolation: { escapeValue: false },
});
applyDocument("en");
if (initial !== "en") void setLanguage(initial);

// Objects that hold UI text outside React are built once per language.
export function perLanguage<T>(make: () => T): () => T {
  let lang: string | undefined;
  let value: T;
  return () => {
    if (lang !== i18n.language) {
      lang = i18n.language;
      value = make();
    }
    return value;
  };
}

export default i18n;
export const t = i18n.t.bind(i18n);
