import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { useReactMediaRecorder } from "react-media-recorder";
import { Mic, Square, Trash2, Send, Image, Loader2, X } from "lucide-react";
import AudioPlayer from "../audio-player";
import uploadAudio from "@/services/uploadAudio";
import uploadFile from "@/services/uploadFile";
import type { SimpleInput } from "@/generated/graphql";
import { toast } from "sonner";
import { audioRecordingFormat } from "@/lib/audioRecording";
import { graphqlErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

/** Voice notes are capped so a comment can't become an unbounded upload. */
const MAX_RECORDING_SECONDS = 60;
const MAX_TEXT = 2000;

/** 7 -> "0:07", 65 -> "1:05" */
function formatDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function SimpleInputComponent({ onSend, avatar, placeholder = t("posts:comments.writeComment"), autoFocus = false }: {
    onSend: (simpleInput: SimpleInput) => Promise<void>;
    placeholder?: string;
    autoFocus?: boolean;
    /** Rendered inside the card on the input row. Optional so the component
     *  stays usable where there's no author avatar to show. */
    avatar?: React.ReactNode;
}) {
    const [text, setText] = useState("");

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [imageUploading, setImageUploading] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [recording, setRecording] = useState<Blob | null>(null);
    const [voiceUrl, setVoiceUrl] = useState("");
    const [voiceUploading, setVoiceUploading] = useState(false);
    const [voiceFailed, setVoiceFailed] = useState(false);

    // Bumped per upload and on discard, so a slow upload for a draft the user
    // already threw away can't land on the current one.
    const uploadIdRef = useRef(0);

    const [isSending, setIsSending] = useState(false);
    // Ref as well as state: two clicks in the same tick would both pass a state-only check.
    const isSendingRef = useRef(false);

    const { mimeType, fileExtension, unsupportedReason } = useMemo(audioRecordingFormat, []);

    const uploadRecording = async (blob: Blob) => {
        const id = ++uploadIdRef.current;
        setVoiceUploading(true);
        setVoiceFailed(false);
        try {
            const url = await uploadAudio({
                blob,
                fileName: `comment-audio.${fileExtension}`,
                fileSize: blob.size,
                mimeType,
            });
            if (id === uploadIdRef.current) setVoiceUrl(url);
        } catch (error) {
            if (id !== uploadIdRef.current) return;
            console.error("Voice note upload failed:", error);
            setVoiceFailed(true);
        } finally {
            if (id === uploadIdRef.current) setVoiceUploading(false);
        }
    };

    const { status, error: recorderError, startRecording, stopRecording, clearBlobUrl } = useReactMediaRecorder({
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true,
        },
        video: false,
        // Only pass a mimeType we actually resolved; handing MediaRecorder
        // an empty string makes it reject the construction outright.
        mediaRecorderOptions: mimeType ? { mimeType } : undefined,
        onStop: (_, blob) => {
            if (!blob || blob.size === 0) {
                // Seen on some Android builds when the recording is very short.
                console.error("Recording produced an empty blob");
                toast.error(t("posts:composer.recordingEmpty"));
                return;
            }
            setRecording(blob);
            void uploadRecording(blob);
        },
    });

    const isRecording = status === "recording";
    const micDenied = recorderError === "permission_denied";
    const canRecord = !unsupportedReason && !micDenied;

    /*
     * Derived from a wall-clock start time rather than an incrementing counter:
     * browsers throttle timers in background tabs, so a `seconds + 1` tick
     * would under-report the real length.
     */
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [recordedSeconds, setRecordedSeconds] = useState(0);

    useEffect(() => {
        if (!isRecording) return;
        const startedAt = Date.now();
        setElapsedSeconds(0);
        const id = setInterval(() => setElapsedSeconds((Date.now() - startedAt) / 1000), 200);
        return () => {
            clearInterval(id);
            setRecordedSeconds((Date.now() - startedAt) / 1000);
        };
    }, [isRecording]);

    // Hard stop at the cap so a forgotten recording can't run on.
    useEffect(() => {
        if (isRecording && elapsedSeconds >= MAX_RECORDING_SECONDS) stopRecording();
    }, [isRecording, elapsedSeconds, stopRecording]);

    const isNearLimit = MAX_RECORDING_SECONDS - elapsedSeconds <= 10;

    useEffect(() => {
        if (!imageFile) {
            setImagePreview("");
            return;
        }
        const url = URL.createObjectURL(imageFile);
        setImagePreview(url);
        return () => URL.revokeObjectURL(url);
    }, [imageFile]);

    const uploadImage = async (file: File) => {
        const id = ++uploadIdRef.current;
        setImageUploading(true);
        setImageFailed(false);
        try {
            const url = await uploadFile(file);
            if (id === uploadIdRef.current) setImageUrl(url);
        } catch (error) {
            if (id !== uploadIdRef.current) return;
            console.error("Image upload failed:", error);
            setImageFailed(true);
        } finally {
            if (id === uploadIdRef.current) setImageUploading(false);
        }
    };

    const discardImage = () => {
        uploadIdRef.current++;
        setImageFile(null);
        setImageUrl("");
        setImageUploading(false);
        setImageFailed(false);
    };

    const discardRecording = () => {
        uploadIdRef.current++;
        clearBlobUrl();
        setRecording(null);
        setVoiceUrl("");
        setVoiceUploading(false);
        setVoiceFailed(false);
        setRecordedSeconds(0);
        setElapsedSeconds(0);
    };

    const onImagePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Let the same file be picked again; re-picking it fires no change event otherwise.
        e.target.value = "";
        if (!file) return;
        setImageFile(file);
        void uploadImage(file);
    };

    const content: SimpleInput | null = imageUrl
        ? { type: "MEDIA", content: imageUrl }
        : voiceUrl
            ? { type: "VOICE", content: voiceUrl }
            : text.trim()
                ? { type: "TEXT", content: text.trim() }
                : null;

    const handleSend = async () => {
        if (!content || isSendingRef.current) return;
        isSendingRef.current = true;
        setIsSending(true);
        try {
            await onSend(content);
            setText("");
            discardImage();
            discardRecording();
        } catch (error) {
            console.error("Failed to send comment:", error);
            const fallback = t("posts:composer.sendFailed");
            toast.error(graphqlErrorMessage(error, fallback, fallback));
        } finally {
            isSendingRef.current = false;
            setIsSending(false);
        }
    };

    const sendButton = content || isSending ? (
        <Button
            size="icon-sm"
            className="shrink-0"
            aria-label={t("posts:composer.send")}
            onClick={handleSend}
            loading={isSending}
        >
            <Send className="rtl:-scale-x-100" />
        </Button>
    ) : null;

    const retryButton = (onClick: () => void) => (
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onClick}>
            {t("posts:composer.retry")}
        </Button>
    );

    const failedNote = (
        <span role="alert" className="min-w-0 flex-1 px-1 text-sm text-destructive">
            {t("posts:composer.uploadFailed")}
        </span>
    );

    const row = () => {
        if (imageFile) {
            return (
                <>
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                        {imagePreview && (
                            <img
                                src={imagePreview}
                                alt={t("posts:composer.uploadedImage")}
                                className={cn("size-full object-cover", imageFailed && "opacity-50")}
                            />
                        )}
                        {imageUploading && (
                            <span className="absolute inset-0 flex items-center justify-center bg-card/60 text-foreground">
                                <Loader2 aria-hidden className="size-5 animate-spin" />
                            </span>
                        )}
                    </span>
                    {imageUploading ? (
                        <span role="status" className="min-w-0 flex-1 truncate px-1 text-sm text-muted-foreground">
                            {t("posts:composer.uploadingPhoto")}
                        </span>
                    ) : imageFailed ? failedNote : (
                        <span className="min-w-0 flex-1" />
                    )}
                    {imageFailed && retryButton(() => void uploadImage(imageFile))}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0"
                        aria-label={t("posts:composer.removeImage")}
                        disabled={isSending}
                        onClick={discardImage}
                    >
                        <X />
                    </Button>
                    {sendButton}
                </>
            );
        }
        if (isRecording) {
            return (
                <>
                    <span className="flex min-w-0 flex-1 items-center gap-2 px-1 text-sm">
                        <span aria-hidden="true" className="size-2 shrink-0 animate-pulse rounded-full bg-destructive" />
                        <span className="truncate">{t("posts:composer.recording")}</span>
                    </span>
                    <span role="timer" aria-live="off" className="shrink-0 text-sm tabular-nums">
                        <span className={cn("font-medium", isNearLimit && "text-destructive")}>{formatDuration(elapsedSeconds)}</span>
                        <span className="text-muted-foreground">{" / "}{formatDuration(MAX_RECORDING_SECONDS)}</span>
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="shrink-0"
                        aria-label={t("posts:composer.stopRecording", {
                            elapsed: formatDuration(elapsedSeconds),
                            max: formatDuration(MAX_RECORDING_SECONDS),
                        })}
                        onClick={stopRecording}
                    >
                        <Square />
                    </Button>
                </>
            );
        }
        if (recording) {
            return (
                <>
                    {voiceUploading ? (
                        <span role="status" className="flex min-w-0 flex-1 items-center gap-2 px-1 text-sm text-muted-foreground">
                            <Loader2 aria-hidden className="size-4 shrink-0 animate-spin" />
                            <span className="truncate">{t("posts:composer.preparingVoice")}</span>
                        </span>
                    ) : voiceFailed ? failedNote : (
                        <div className="flex min-w-0 flex-1">
                            <AudioPlayer key={voiceUrl} src={voiceUrl} variant="pill-sm" initialDuration={recordedSeconds} className="min-w-0 max-w-[285px] flex-1" />
                        </div>
                    )}
                    {voiceFailed && retryButton(() => void uploadRecording(recording))}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0"
                        aria-label={t("posts:composer.discardVoice")}
                        disabled={isSending}
                        onClick={discardRecording}
                    >
                        <Trash2 />
                    </Button>
                    {sendButton}
                </>
            );
        }
        const empty = !text;
        return (
            <>
                <input
                    type="text"
                    dir={text ? "auto" : undefined}
                    placeholder={placeholder}
                    aria-label={placeholder}
                    autoFocus={autoFocus}
                    maxLength={MAX_TEXT}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    disabled={isSending}
                    /* min-w-0: an <input> has an intrinsic default size (~20ch) that flex-1 alone won't shrink past. */
                    className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:text-muted-foreground"
                />
                {empty && (
                    <div className="flex shrink-0 items-center">
                        <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t("posts:composer.attachImage")}
                            onClick={() => imageInputRef.current?.click()}
                        >
                            <Image />
                        </Button>
                        {canRecord && (
                            <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label={t("posts:composer.recordVoice")}
                                onClick={startRecording}
                            >
                                <Mic />
                            </Button>
                        )}
                    </div>
                )}
                {sendButton}
            </>
        );
    };

    return (
        // min-w-0 all the way down: a flex item defaults to min-width:auto, so
        // without it the row widens the document and the page pans sideways on mobile.
        <div className="flex w-full min-w-0 flex-col gap-2 rounded-lg border bg-card p-2 text-card-foreground">
            <div className="flex min-w-0 items-center gap-2">
                {avatar}
                {row()}
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={onImagePicked}
                />
            </div>
            {micDenied && !text && !imageFile && !recording && (
                <p className="ps-9 text-xs text-muted-foreground">{t("posts:composer.micOff")}</p>
            )}
        </div>
    );
}
