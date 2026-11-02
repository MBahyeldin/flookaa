import type { en } from "../en";
import type { ar } from ".";

// Fails tsc when Arabic misses an English key or has one English doesn't (plural and _female suffixes aside).
type Base<K extends string> = K extends `${infer B}_female`
  ? Base<B>
  : K extends `${infer B}_${"zero" | "one" | "two" | "few" | "many" | "other"}`
    ? B
    : K;

type Keys<T> = {
  [K in keyof T & string]: T[K] extends string ? Base<K> : `${K}.${Keys<T[K]>}`;
}[keyof T & string];

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type Check = { [N in keyof typeof en]: Same<Keys<(typeof en)[N]>, Keys<(typeof ar)[N]>> };

export const arMatchesEn: Check[keyof Check] extends true ? true : never = true;
