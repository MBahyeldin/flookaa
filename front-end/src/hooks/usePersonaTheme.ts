import { useEffect } from "react";
import { DEFAULT_PALETTE, isPaletteId } from "@/themes/palettes";

// On <html> rather than a wrapper so portalled dialogs, sheets and toasts are themed too.
export default function usePersonaTheme(theme: string | undefined) {
  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    root.dataset.theme = isPaletteId(theme) ? theme : DEFAULT_PALETTE;
    return () => {
      delete root.dataset.theme;
    };
  }, [theme]);
}
