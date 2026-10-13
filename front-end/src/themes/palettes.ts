export const PALETTES = [
  { id: "tide", label: "Deep Tide" },
  { id: "forest", label: "Forest" },
  { id: "ember", label: "Ember" },
  { id: "plum", label: "Plum" },
  { id: "rose", label: "Rose" },
  { id: "slate", label: "Slate" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: PaletteId = "tide";

export function isPaletteId(value: unknown): value is PaletteId {
  return PALETTES.some((palette) => palette.id === value);
}
