import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";

export type Language = "en" | "ar";
export type Gender = "male" | "female";

export const LANGUAGE_NAMES: Record<Language, string> = { en: "English", ar: "العربية" };

const DIR: Record<Language, "ltr" | "rtl"> = { en: "ltr", ar: "rtl" };

// Languages with message files; the English bundle is built in, the rest load on demand.
const LOADERS: Record<Language, () => Promise<{ default: Bundle }>> = {
  en: async () => ({ default: en }),
  ar: () => import("./locales/ar").then((m) => ({ default: m.ar })),
};

type Bundle = Record<string, object>;
type Messages = { [key: string]: string | Messages };

const FEMALE = "_female";
const loaded = new Map<Language, Bundle>();
let gender: Gender | null = null;

// The reader's gender picks the `_female` variant of a key where one exists.
function gendered(messages: Messages): Messages {
  const out: Messages = {};
  for (const [key, value] of Object.entries(messages)) {
    if (key.endsWith(FEMALE)) continue;
    out[key] = typeof value === "string" ? value : gendered(value);
  }
  if (gender === "female") {
    for (const [key, value] of Object.entries(messages)) {
      if (key.endsWith(FEMALE)) out[key.slice(0, -FEMALE.length)] = value;
    }
  }
  return out;
}

function addBundle(lang: Language, bundle: Bundle) {
  for (const [ns, messages] of Object.entries(bundle)) {
    i18n.removeResourceBundle(lang, ns);
    i18n.addResourceBundle(lang, ns, gendered(messages as Messages));
  }
}

export const LOCALES = Object.keys(LOADERS) as Language[];

const INTL_LOCALE: Record<Language, string> = { en: "en", ar: "ar-u-nu-latn" };

export function intlLocale(): string {
  return INTL_LOCALE[currentLanguage()];
}

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
  if (!loaded.has(lang)) {
    const { default: bundle } = await load();
    loaded.set(lang, bundle);
    addBundle(lang, bundle);
  }
  if (lang !== i18n.language) await i18n.changeLanguage(lang);
}

export async function setGender(value: Gender | null | undefined): Promise<void> {
  const next = value ?? null;
  if (next === gender) return;
  gender = next;
  for (const [lang, bundle] of loaded) addBundle(lang, bundle);
  // Same language again: emits languageChanged, so translated components re-render.
  if (i18n.language !== "en") await i18n.changeLanguage(i18n.language);
}

function textKey(): string {
  return `${i18n.language}:${gender ?? ""}`;
}

i18n.on("languageChanged", (lng) => applyDocument(isLanguage(lng) ? lng : "en"));

const initial = storedLanguage() ?? browserLanguage() ?? "en";

loaded.set("en", en);

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

// Objects that hold UI text outside React are built once per language and reader gender.
export function perLanguage<T>(make: () => T): () => T {
  let key: string | undefined;
  let value: T;
  return () => {
    if (key !== textKey()) {
      key = textKey();
      value = make();
    }
    return value;
  };
}

export default i18n;
export const t = i18n.t.bind(i18n);
