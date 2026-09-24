import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import useAudioPeaks from "./useAudioPeaks";

/**
 * Voice-note player.
 *
 * Playback runs on a real <audio> element rather than Web Audio, because that
 * is the most broadly supported path — Web Audio is used only to derive the
 * waveform, and the player still works when that fails (see useAudioPeaks).
 */

const SPEEDS = [1, 1.5, 2, 3] as const;
const BAR_COUNT = 48;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function AudioPlayer({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const { peaks } = useAudioPeaks(src, BAR_COUNT);

  const speed = SPEEDS[speedIndex];

  /*
   * Chrome reports `duration === Infinity` for blob/WebM streams until the file
   * has been seeked to the end — the recorded-preview case. Seeking to a huge
   * offset forces it to resolve, then we return to the start.
   */
  const readDuration = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (Number.isFinite(audio.duration)) {
      setDuration(audio.duration);
      return;
    }

    const onTimeUpdate = () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
      audio.currentTime = 0;
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.currentTime = 1e101;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", readDuration);
    audio.addEventListener("durationchange", readDuration);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("loadedmetadata", readDuration);
      audio.removeEventListener("durationchange", readDuration);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [readDuration]);

  // Re-apply on change and after a new source loads, since some browsers reset
  // playbackRate when the media element loads.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = speed;
  }, [speed, src]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.playbackRate = speed;
      void audio.play().catch((error) => {
        // Autoplay policies reject play() without a gesture; don't leave the
        // button showing "playing" when nothing is.
        console.error("Audio playback failed:", error);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [speed]);

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  const progress = duration > 0 ? currentTime / duration : 0;
  const remaining = duration > 0 ? duration - currentTime : 0;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2",
        className
      )}
    >
      {/* The element does the decoding and playback; the UI below drives it. */}
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="h-9 w-9 shrink-0 rounded-full"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 translate-x-px" />
        )}
      </Button>

      {/* Waveform + scrubber */}
      <div className="relative min-w-0 flex-1">
        <div
          aria-hidden="true"
          className="flex h-8 items-center gap-[2px] overflow-hidden"
        >
          {peaks.map((peak, index) => {
            const played = index / peaks.length <= progress;
            return (
              <span
                key={index}
                className={cn(
                  "min-w-[2px] flex-1 rounded-full transition-colors",
                  played ? "bg-primary" : "bg-muted-foreground/30"
                )}
                style={{ height: `${Math.max(10, peak * 100)}%` }}
              />
            );
          })}
        </div>

        {/*
          A real range input sits transparently over the bars: it brings
          keyboard support, ARIA value semantics and touch dragging for free,
          which a div with click handlers would not.
        */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => seekTo(Number(event.target.value))}
          disabled={!duration}
          aria-label="Seek voice note"
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
        />
      </div>

      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {/* Counts down while playing, like most voice-note UIs; shows total at rest. */}
        {isPlaying || currentTime > 0
          ? formatTime(remaining)
          : formatTime(duration)}
      </span>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 shrink-0 px-2 text-xs font-medium tabular-nums"
        onClick={() => setSpeedIndex((index) => (index + 1) % SPEEDS.length)}
        aria-label={`Playback speed ${speed}x — tap to change`}
      >
        {speed}x
      </Button>
    </div>
  );
}
