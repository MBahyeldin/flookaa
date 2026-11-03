import { currentLanguage } from "@/i18n";
import type { InterestNames } from "@/types/interest";

export function interestName(x: InterestNames): string {
  return (currentLanguage() === "ar" && x.name_ar) || x.name_en;
}
