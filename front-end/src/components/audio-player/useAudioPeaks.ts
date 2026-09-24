import { useEffect, useState } from "react";

/**
 * Amplitude peaks (0..1) used to draw a voice-note waveform.
 *
 * Real peaks need the whole file decoded via Web Audio, which can fail for
 * reasons that have nothing to do with the code: the asset host may not send
 * CORS headers, Safari historically rejects some WebM/Opus payloads, and
 * decoding is pointless work on a slow connection. So this always returns a
 * usable set of bars: real peaks when decoding succeeds, and otherwise a
 * deterministic shape derived from the URL.
 *
 * The fallback is seeded from the src rather than random, so a given note keeps
 * the same silhouette between renders and reloads instead of flickering.
 */

/** Stable 32-bit hash so the same URL always yields the same bars. */
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function syntheticPeaks(src: string, barCount: number): number[] {
  let seed = hashString(src) || 1;
  const next = () => {
    // xorshift32 — cheap, deterministic, no dependency
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 1000) / 1000;
  };
  return Array.from({ length: barCount }, (_, i) => {
    // Taper the ends so it reads as speech rather than a solid block.
    const envelope = Math.sin((Math.PI * (i + 0.5)) / barCount);
    return 0.18 + next() * 0.62 * (0.45 + envelope * 0.55);
  });
}

async function decodePeaks(src: string, barCount: number): Promise<number[]> {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`peak fetch failed: ${response.status}`);
  const buffer = await response.arrayBuffer();

  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) throw new Error("Web Audio unavailable");

  const ctx = new Ctor();
  try {
    // Callback form kept for older Safari, which lacks the promise overload.
    const audio = await new Promise<AudioBuffer>((resolve, reject) => {
      const maybePromise = ctx.decodeAudioData(buffer, resolve, reject);
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(resolve, reject);
      }
    });

    const channel = audio.getChannelData(0);
    const blockSize = Math.floor(channel.length / barCount) || 1;
    const peaks: number[] = [];
    let max = 0;

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      const start = i * blockSize;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channel[start + j] ?? 0);
      }
      const value = sum / blockSize;
      peaks.push(value);
      if (value > max) max = value;
    }

    // Normalise so quiet recordings still fill the bar area.
    return max > 0 ? peaks.map((p) => Math.max(0.08, p / max)) : peaks;
  } finally {
    void ctx.close();
  }
}

export default function useAudioPeaks(src: string | undefined, barCount = 48) {
  const [peaks, setPeaks] = useState<number[]>(() =>
    src ? syntheticPeaks(src, barCount) : []
  );
  const [isReal, setIsReal] = useState(false);

  useEffect(() => {
    if (!src) {
      setPeaks([]);
      setIsReal(false);
      return;
    }

    // Local flag rather than a ref: decoding is slow enough that the src can
    // change (or the player unmount) before it resolves, and a stale result
    // must not overwrite the current waveform.
    let cancelled = false;

    // Show the deterministic shape immediately; upgrade it if decoding works.
    setPeaks(syntheticPeaks(src, barCount));
    setIsReal(false);

    decodePeaks(src, barCount)
      .then((real) => {
        if (cancelled) return;
        setPeaks(real);
        setIsReal(true);
      })
      .catch(() => {
        /* Keep the synthetic bars — see the note at the top of this file. */
      });

    return () => {
      cancelled = true;
    };
  }, [src, barCount]);

  return { peaks, isReal };
}
