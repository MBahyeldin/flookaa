import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic, Square, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import AudioPlayer from "@/components/audio-player";
import uploadAudio from "@/services/uploadAudio";
import { audioRecordingFormat } from "@/lib/audioRecording";
import { cn } from "@/lib/utils";
import type { FormFieldProps } from "@/types/FormFields";

export const MAX_VOICE_SECONDS = 300;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

// Browser file types mapped to the labels the s3 audio upload accepts; ffmpeg probes the content.
const fileTypes: Record<string, string> = {
  "audio/mpeg": "audio/mpeg",
  "audio/mp3": "audio/mpeg",
  "audio/wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/x-wav": "audio/wav",
  "audio/vnd.wave": "audio/wav",
  "audio/flac": "audio/flac",
  "audio/x-flac": "audio/flac",
  "audio/mp4": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/x-m4a": "audio/mp4",
  "audio/ogg": "audio/ogg;codecs=opus",
  "audio/opus": "audio/ogg;codecs=opus",
  "audio/webm": "audio/webm;codecs=opus",
};

const accept = [".mp3", ".wav", ".flac", ".m4a", ".ogg", ".opus", ".webm", ...Object.keys(fileTypes)].join(",");

type Phase = "idle" | "starting" | "recording" | "uploading";

type Clip = { blob: Blob; fileName: string; mimeType: string; seconds?: number };

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Resolves undefined when the browser can't read the file's length.
function measure(blob: Blob): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    const done = (seconds?: number) => {
      URL.revokeObjectURL(url);
      resolve(seconds !== undefined && Number.isFinite(seconds) && seconds > 0 ? seconds : undefined);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done();
    audio.src = url;
  });
}

export default function VoiceInput({ field, error, touched, className, initValue, setFieldValue, values }: FormFieldProps) {
  const { mimeType, fileExtension, unsupportedReason } = useMemo(audioRecordingFormat, []);
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [problem, setProblem] = useState("");
  const [failed, setFailed] = useState<Clip | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const startedAt = useRef(0);
  // Bumped for every new clip and on unmount, so a late result for a dropped clip is ignored.
  const clipId = useRef(0);

  const name = field.name ?? field.id;
  const src = initValue ?? "";
  const storedSeconds = field.duration ? values?.[field.duration] : undefined;

  const releaseMicrophone = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  };

  useEffect(
    () => () => {
      clipId.current++;
      if (recorder.current && recorder.current.state !== "inactive") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      releaseMicrophone();
    },
    []
  );

  const upload = async (clip: Clip) => {
    const id = ++clipId.current;
    setPhase("uploading");
    setProblem("");
    setFailed(null);
    try {
      const url = await uploadAudio({
        blob: clip.blob,
        fileName: clip.fileName,
        fileSize: clip.blob.size,
        mimeType: clip.mimeType,
      });
      if (id !== clipId.current) return;
      await setFieldValue(name, url);
      if (field.duration) {
        await setFieldValue(field.duration, clip.seconds ? Math.max(1, Math.round(clip.seconds)) : undefined);
      }
    } catch (err) {
      if (id !== clipId.current) return;
      setProblem(err instanceof Error ? err.message : "Upload failed.");
      setFailed(clip);
    } finally {
      if (id === clipId.current) setPhase("idle");
    }
  };

  const startRecording = async () => {
    setProblem("");
    setFailed(null);
    setPhase("starting");
    const id = clipId.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
      });
      if (id !== clipId.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
    } catch (err) {
      setPhase("idle");
      setProblem(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access was denied."
          : "Couldn’t start the microphone."
      );
      return;
    }
    const chunks: Blob[] = [];
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream.current, { mimeType });
    } catch {
      releaseMicrophone();
      setPhase("idle");
      setProblem("This browser can’t record audio.");
      return;
    }
    rec.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    rec.onstop = () => {
      releaseMicrophone();
      const seconds = (Date.now() - startedAt.current) / 1000;
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size === 0) {
        setPhase("idle");
        setProblem("Nothing was recorded. Try again.");
        return;
      }
      void upload({ blob, fileName: `voice-note.${fileExtension}`, mimeType, seconds });
    };
    recorder.current = rec;
    startedAt.current = Date.now();
    setElapsed(0);
    rec.start();
    setPhase("recording");
  };

  const stopRecording = () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  };

  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(() => {
      const seconds = (Date.now() - startedAt.current) / 1000;
      setElapsed(seconds);
      if (seconds >= MAX_VOICE_SECONDS && recorder.current?.state === "recording") recorder.current.stop();
    }, 200);
    return () => clearInterval(timer);
  }, [phase]);

  const pickFile = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    setFailed(null);
    const type = fileTypes[file.type];
    if (!type) {
      setProblem("That audio format isn’t supported. Use mp3, wav, m4a, flac, ogg or webm.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setProblem("Audio files can be up to 5 MB.");
      return;
    }
    const seconds = await measure(file);
    if (seconds !== undefined && seconds > MAX_VOICE_SECONDS + 0.5) {
      setProblem(`Audio files can be up to ${formatTime(MAX_VOICE_SECONDS)} long.`);
      return;
    }
    void upload({ blob: file, fileName: file.name, mimeType: type, seconds });
  };

  const remove = async () => {
    clipId.current++;
    setProblem("");
    setFailed(null);
    await setFieldValue(name, "");
    if (field.duration) await setFieldValue(field.duration, undefined);
  };

  const busy = phase !== "idle";
  const left = MAX_VOICE_SECONDS - elapsed;

  return (
    <div className={cn(className, field.width)}>
      <Label>
        {field.label} {field.isRequired && <span className="text-destructive">*</span>}
      </Label>

      <div className="mt-2 flex flex-col gap-3 rounded-lg border-2 border-dashed border-muted p-4">
        {src && phase !== "recording" ? (
          <AudioPlayer
            key={src}
            src={src}
            initialDuration={typeof storedSeconds === "number" ? storedSeconds : undefined}
          />
        ) : null}

        {phase === "recording" ? (
          <div role="status" className="flex items-center gap-3">
            <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-destructive" />
            <span className="tabular-nums text-sm text-foreground">{formatTime(elapsed)}</span>
            {left <= 30 ? (
              <span className="text-xs text-muted-foreground">{Math.ceil(left)} s left</span>
            ) : null}
            <Button type="button" size="sm" variant="secondary" className="ml-auto" onClick={stopRecording}>
              <Square className="size-4" /> Stop
            </Button>
          </div>
        ) : null}

        {phase === "uploading" ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Processing…
          </p>
        ) : null}

        {phase === "idle" || phase === "starting" ? (
          <div className="flex flex-wrap gap-2">
            {!unsupportedReason ? (
              <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={startRecording}>
                <Mic className="size-4" /> {src ? "Record again" : "Record"}
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>
              <Upload className="size-4" /> {src ? "Upload another" : "Upload file"}
            </Button>
            {failed ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => upload(failed)}>
                Try again
              </Button>
            ) : null}
            {src || failed ? (
              <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={remove}>
                <Trash2 className="size-4" /> Remove
              </Button>
            ) : null}
          </div>
        ) : null}

        {unsupportedReason && phase === "idle" ? (
          <p className="text-xs text-muted-foreground">{unsupportedReason} You can still upload a file.</p>
        ) : null}
        {problem ? <p className="text-sm text-destructive">{problem}</p> : null}

        <input
          ref={fileInput}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => pickFile(event.target.files?.[0])}
        />
      </div>

      {error && touched && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}
