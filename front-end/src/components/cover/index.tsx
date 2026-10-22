import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CoverPattern } from "@/types/cover";

const STRIPES = Array.from({ length: 10 }, (_, i) => -200 + i * 160);

const PATTERNS: Record<CoverPattern, ReactNode> = {
  horizon: (
    <>
      <rect width="1200" height="300" className="fill-accent" />
      <circle cx="930" cy="140" r="70" opacity="0.85" className="fill-primary" />
      <path opacity="0.3" d="M0 210C200 196.667 400 196.667 600 210C800 223.333 1000 223.333 1200 210V300H0V210Z" className="fill-primary" />
      <path opacity="0.6" d="M0 250C200 238 400 238 600 250C800 262 1000 262 1200 250V300H0V250Z" className="fill-primary" />
    </>
  ),
  waves: (
    <>
      <rect width="1200" height="300" className="fill-muted" />
      {[
        [120, 0.15],
        [170, 0.3],
        [220, 0.5],
        [262, 0.8],
      ].map(([y, opacity]) => (
        <path
          key={y}
          opacity={opacity}
          d={`M0 ${y}C200 ${y - 40} 400 ${y + 40} 600 ${y}C800 ${y - 40} 1000 ${y - 40} 1200 ${y}V300H0V${y}Z`}
          className="fill-primary"
        />
      ))}
    </>
  ),
  hills: (
    <>
      <rect width="1200" height="300" className="fill-secondary" />
      <circle cx="600" cy="92" r="36" className="fill-card" />
      <ellipse cx="250" cy="340" rx="420" ry="180" opacity="0.35" className="fill-primary" />
      <ellipse cx="1080" cy="330" rx="320" ry="160" opacity="0.25" className="fill-primary" />
      <ellipse cx="820" cy="380" rx="540" ry="200" opacity="0.6" className="fill-primary" />
    </>
  ),
  stripes: (
    <>
      <rect width="1200" height="300" className="fill-accent" />
      {STRIPES.map((x, i) => (
        <path
          key={x}
          opacity={i % 2 ? 0.1 : 0.2}
          d={`M${x} 300L${x + 200} 0H${x + 260}L${x + 60} 300H${x}Z`}
          className="fill-primary"
        />
      ))}
    </>
  ),
};

// Generated from the palette in scope, so it recolours with data-theme and dark mode.
export function Cover({ pattern, className }: { pattern: CoverPattern; className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={cn("block size-full", className)}
    >
      {PATTERNS[pattern] ?? PATTERNS.horizon}
    </svg>
  );
}
