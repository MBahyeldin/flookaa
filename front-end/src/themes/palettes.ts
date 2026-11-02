import { t } from "@/i18n";

export const PALETTES = [{ id: "tide" }, { id: "forest" }, { id: "ember" }, { id: "plum" }, { id: "rose" }, { id: "slate" }] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: PaletteId = "tide";

export const paletteLabel = (id: PaletteId) => t(`common:themes.${id}`);

export function isPaletteId(value: unknown): value is PaletteId {
  return PALETTES.some((palette) => palette.id === value);
}
