import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { useReactMediaRecorder } from "react-media-recorder";
import { Mic, Square, Trash2, Send, Image, Loader2 } from "lucide-react";
import VoiceIndicator from "./voiceIndocator";
import AudioPlayer from "../audio-player";
import uploadAudio from "@/services/uploadAudio";
import uploadFile from "@/services/uploadFile";
import type { SimpleInput } from "@/generated/graphql";
import { toast } from "sonner";

/** Voice notes are capped so a comment can't become an unbounded upload. */
const MAX_RECORDING_SECONDS = 60;

/** 7 -> "0:07", 65 -> "1:05" */
function formatDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function SimpleInputComponent({ onSend, avatar }: {
    onSend: (simpleInput: SimpleInput) => Promise<void>;
    /** Rendered inside the card on the input row. Optional so the component
     *  stays usable where there's no author avatar to show. */
    avatar?: React.ReactNode;
}) {
    const [newComment, setNewComment] = useState("");
    const [blob, setBlob] = useState<Blob | null>(null);
    const [mediaUrl, setMediaUrl] = useState<string>("");
    const uploadImageInputRef = useRef<HTMLInputElement>(null);
    const [commentType, setCommentType] = useState<"TEXT" | "VOICE" | "MEDIA" | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    // Ref as well as state: state updates are async, so two clicks in the same
    // tick would both pass a state-only check.
    const isSendingRef = useRef(false);

    /*
     * Codec + capability detection.
     *
     * Every candidate here is one the upload endpoint accepts — sending a type
     * outside its allowlist gets a 400 back. Android Chrome reports support for
     * webm/opus, but not every build agrees on the exact string, so the list is
     * ordered by preference and falls through.
     *
     * This used to `throw` inside useMemo, which crashes the render and takes
     * the whole comment box down rather than just disabling the mic.
     */
    const { mimeType, fileExtension, unsupportedReason } = useMemo(() => {
        // getUserMedia and MediaRecorder are gated on a secure context. Over
        // plain http on a LAN address — a phone pointed at a dev machine —
        // navigator.mediaDevices is undefined entirely. localhost is exempt.
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
            return {
                mimeType: "",
                fileExtension: "webm",
                unsupportedReason: window.isSecureContext
                    ? "This browser can’t access the microphone."
                    : "Voice notes need a secure (HTTPS) connection.",
            };
        }

        if (typeof MediaRecorder === "undefined") {
            return {
                mimeType: "",
                fileExtension: "webm",
                unsupportedReason: "This browser can’t record audio.",
            };
        }

        const candidates: { type: string; ext: string }[] = [
            { type: "audio/webm;codecs=opus", ext: "webm" },
            { type: "audio/ogg;codecs=opus", ext: "ogg" },
            { type: "audio/mp4", ext: "m4a" },
        ];

        const supported = candidates.find((candidate) =>
            MediaRecorder.isTypeSupported?.(candidate.type)
        );

        if (!supported) {
            return {
                mimeType: "",
                fileExtension: "webm",
                unsupportedReason: "This browser doesn’t support any audio format we can upload.",
            };
        }

        return {
            mimeType: supported.type,
            fileExtension: supported.ext,
            unsupportedReason: "",
        };
    }, []);

    const canRecord = !unsupportedReason;

    const { status, startRecording, stopRecording, mediaBlobUrl, clearBlobUrl, previewAudioStream } =
        useReactMediaRecorder({
            audio: true,
            video: false,
            // Only pass a mimeType we actually resolved; handing MediaRecorder
            // an empty string makes it reject the construction outright.
            mediaRecorderOptions: mimeType ? { mimeType } : undefined,
            onStart: () => {
                setCommentType("VOICE");
            },
            onStop: (_, blob) => {
                if (!blob || blob.size === 0) {
                    // Seen on some Android builds when the recording is very
                    // short: stop resolves with nothing usable.
                    console.error("Recording produced an empty blob");
                    toast.error("Recording failed — nothing was captured. Try holding it a little longer.");
                    setCommentType(null);
                    return;
                }
                setBlob(blob);
            },

        });

    /*
     * Recording clock.
     *
     * Derived from a wall-clock start time rather than an incrementing counter:
     * browsers throttle timers in background tabs, so a `seconds + 1` tick
     * would drift and under-report the real recording length.
     */
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [recordedSeconds, setRecordedSeconds] = useState(0);

    useEffect(() => {
        if (status !== "recording") return;

        const startedAt = Date.now();
        setElapsedSeconds(0);
        const id = setInterval(() => {
            setElapsedSeconds((Date.now() - startedAt) / 1000);
        }, 200);

        return () => {
            clearInterval(id);
            // Freeze the final length so it can be shown on the preview.
            setRecordedSeconds((Date.now() - startedAt) / 1000);
        };
    }, [status]);

    // Hard stop at the cap so a forgotten recording can't run on.
    useEffect(() => {
        if (status === "recording" && elapsedSeconds >= MAX_RECORDING_SECONDS) {
            stopRecording();
        }
    }, [status, elapsedSeconds, stopRecording]);

    const remainingSeconds = Math.max(0, MAX_RECORDING_SECONDS - elapsedSeconds);
    const isNearLimit = remainingSeconds <= 10;

    const handleSend = async () => {
        /*
         * Re-entrancy guard. Sending is async — a voice note uploads before the
         * mutation runs — and the button stayed enabled throughout, so repeated
         * clicks (or held Enter) posted the same comment several times. The ref
         * blocks synchronous repeat calls that would otherwise slip through
         * before the state update lands.
         */
        if (isSendingRef.current) return;
        isSendingRef.current = true;
        setIsSending(true);

        try {
            let audioUrl = "";
            if (blob) {
                // Extension follows the codec actually chosen — it was
                // hardcoded to .webm even when recording m4a on iOS.
                audioUrl = await uploadAudio({
                    blob,
                    fileName: `comment-audio.${fileExtension}`,
                    fileSize: blob.size,
                    mimeType,
                });
            }

            let content = "";
            switch (commentType) {
                case "TEXT":
                    content = newComment.trim();
                    break;
                case "VOICE":
                    content = audioUrl;
                    break;
                case "MEDIA":
                    content = mediaUrl;
                    break;
            }

            if (!content || !commentType) {
                console.error("No content or comment type to send.");
                return;
            }

            await onSend({
                content,
                type: commentType,
            });

            setNewComment("");
            clearBlobUrl();
            setBlob(null);
            setMediaUrl("");
            setCommentType(null);
            setRecordedSeconds(0);
            setElapsedSeconds(0);
        } catch (error) {
            // Previously an upload failure left no trace and the draft was
            // silently cleared by the code below it.
            console.error("Failed to send comment:", error);
            toast.error(
                error instanceof Error ? error.message : "Couldn’t send your comment"
            );
        } finally {
            isSendingRef.current = false;
            setIsSending(false);
        }
    };

    const handleDeleteRecording = () => {
        clearBlobUrl();
        setBlob(null);
        setCommentType(null);
        setRecordedSeconds(0);
        setElapsedSeconds(0);
    };

    const handleUploadMedia = () => {
        if (uploadImageInputRef.current) {
            uploadImageInputRef.current.click();
        }
    };

    const onImageInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        /*
         * This had no error handling at all: uploadFile's rejection became an
         * unhandled promise rejection, so a failed upload — an oversized image
         * being the common case — did nothing visible whatsoever.
         */
        setIsUploadingImage(true);
        try {
            const url = await uploadFile(file);
            setMediaUrl(url);
            setCommentType("MEDIA");
        } catch (error) {
            console.error("Image upload failed:", error);
            toast.error(
                error instanceof Error ? error.message : "Failed to upload image."
            );
            setCommentType(null);
        } finally {
            setIsUploadingImage(false);
            // Let the same file be retried; without this, re-picking it fires
            // no change event.
            if (uploadImageInputRef.current) {
                uploadImageInputRef.current.value = "";
            }
        }
    };

    const handleDeleteMedia = () => {
        setMediaUrl("");
        setCommentType(null);
        if (uploadImageInputRef.current) {
            uploadImageInputRef.current.value = "";
        }
    };



    return (
        // min-w-0 all the way down: each of these is a flex item, and a flex
        // item defaults to min-width:auto, so it refuses to shrink below its
        // content. Without it the composer row widened the whole document and
        // the page could pan sideways on mobile.
        <div className="w-full min-w-0">
            <Card className="min-w-0 border border-muted bg-muted/50 p-2">
                <CardContent className="flex min-w-0 flex-col gap-2 p-0">
                    {/*
                      The text field gets its own row and the controls sit on a
                      second row. Previously all four sat in one wrapping row,
                      which split the image and mic icons across lines on a
                      phone. Two explicit rows keep the icons together at every
                      width instead of depending on how the wrap happens to fall.
                    */}
                    {/*
                      Always rendered so the avatar stays put. The text field is
                      swapped for a short status label once a voice note or image
                      is staged (their previews render further down), instead of
                      hiding the whole row and taking the avatar with it.
                    */}
                    <div className="flex min-w-0 items-center gap-2">
                        {avatar}
                        {isUploadingImage ? (
                            <span
                                role="status"
                                className="flex min-w-0 flex-1 items-center gap-2 px-1 text-sm text-muted-foreground"
                            >
                                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                                <span className="truncate">Uploading image…</span>
                            </span>
                        ) : !commentType || commentType === "TEXT" ? (
                            <input
                                type="text"
                                placeholder="Add a comment..."
                                value={newComment}
                                onChange={(e) => {
                                    setNewComment(e.target.value);
                                    if (!e.target.value.length) {
                                        setCommentType(null);
                                        return;
                                    }
                                    setCommentType("TEXT");
                                }}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                /* min-w-0: an <input> has an intrinsic default size
                                   (~20ch) that flex-1 alone won't shrink past. */
                                className="flex-1 min-w-0 bg-transparent rounded-full px-4 py-2 text-sm border border-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        ) : (
                            <span className="flex min-w-0 flex-1 items-center gap-2 px-1 text-sm text-muted-foreground">
                                {commentType === "VOICE" ? (
                                    status === "recording" ? (
                                        <>
                                            <span
                                                aria-hidden="true"
                                                className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-destructive"
                                            />
                                            <span className="truncate">Recording…</span>
                                            <span
                                                /* Announced periodically rather than on every
                                                   tick, so it doesn't flood a screen reader. */
                                                role="timer"
                                                aria-live="off"
                                                className={`ml-auto shrink-0 font-medium tabular-nums ${
                                                    isNearLimit ? "text-destructive" : "text-foreground"
                                                }`}
                                            >
                                                {formatDuration(elapsedSeconds)}
                                                <span className="text-muted-foreground">
                                                    {" / "}
                                                    {formatDuration(MAX_RECORDING_SECONDS)}
                                                </span>
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="truncate">Voice note ready</span>
                                            {recordedSeconds > 0 ? (
                                                <span className="ml-auto shrink-0 font-medium tabular-nums text-foreground">
                                                    {formatDuration(recordedSeconds)}
                                                </span>
                                            ) : null}
                                        </>
                                    )
                                ) : (
                                    <span className="truncate">Image attached</span>
                                )}
                            </span>
                        )}
                    </div>

                    <div className="flex min-w-0 items-center gap-2">
                        {/* Attachment controls — image and mic always adjacent */}
                        <div className="flex items-center gap-2">
                            {!commentType ? (
                                <Button
                                    size="icon"
                                    variant="outline"
                                    aria-label={isUploadingImage ? "Uploading image…" : "Attach an image"}
                                    aria-busy={isUploadingImage}
                                    disabled={isUploadingImage}
                                    onClick={handleUploadMedia}
                                >
                                    {isUploadingImage ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Image className="h-4 w-4" />
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer hidden"
                                        ref={uploadImageInputRef}
                                        onChange={onImageInputChange}
                                    />
                                </Button>
                            ) : null}

                            {!commentType ? (
                                <Button
                                    size="icon"
                                    variant="outline"
                                    aria-label={
                                        canRecord
                                            ? "Record a voice note"
                                            : `Voice notes unavailable — ${unsupportedReason}`
                                    }
                                    // Explains itself rather than failing on tap:
                                    // without this the button looked live and the
                                    // press did nothing at all.
                                    title={canRecord ? undefined : unsupportedReason}
                                    onClick={() => {
                                        if (!canRecord) {
                                            toast.error(unsupportedReason);
                                            return;
                                        }
                                        startRecording();
                                    }}
                                    disabled={!!mediaBlobUrl || !canRecord}
                                >
                                    <Mic className="h-4 w-4" />
                                </Button>
                            ) : null}

                            {status === "recording" ? (
                                <div className="flex min-w-0 items-center gap-2">
                                    <Button
                                        size="icon"
                                        variant="destructive"
                                        className="animate-pulse shrink-0"
                                        aria-label={`Stop recording — ${formatDuration(elapsedSeconds)} of ${formatDuration(MAX_RECORDING_SECONDS)}`}
                                        onClick={stopRecording}
                                    >
                                        <Square className="h-4 w-4" />
                                    </Button>
                                    <VoiceIndicator previewAudioStream={previewAudioStream} />
                                    {/* Countdown only once it matters, so the row
                                        stays quiet for most of the recording. */}
                                    {isNearLimit ? (
                                        <span className="shrink-0 text-xs font-medium tabular-nums text-destructive">
                                            {Math.ceil(remainingSeconds)}s left
                                        </span>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>

                        <Button
                            size="sm"
                            className="ml-auto shrink-0"
                            onClick={handleSend}
                            disabled={
                                isSending ||
                                (!newComment.trim() && !mediaBlobUrl && !mediaUrl)
                            }
                            aria-busy={isSending}
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    Sending…
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-1" /> Post
                                </>
                            )}
                        </Button>
                    </div>

                    {mediaBlobUrl && (
                        <div className="flex min-w-0 items-center gap-2">
                            <AudioPlayer src={mediaBlobUrl} className="min-w-0 flex-1" />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDeleteRecording}
                                aria-label="Discard voice note"
                                className="shrink-0 text-destructive hover:text-destructive/80"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {mediaUrl && (
                        <div className="relative flex items-center gap-3 rounded-md border border-border bg-background p-2 items-center justify-center">
                            <img
                                src={mediaUrl}
                                alt="Uploaded Media"
                                className="max-w-xs max-h-48 rounded-md"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDeleteMedia}
                                className="absolute top-1 right-1 text-destructive hover:text-destructive/80"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {status === "recording" && (
                        <p className="text-xs text-primary font-medium animate-pulse pl-1">
                            🎙️ Recording in progress…
                        </p>
                    )}
                </CardContent>
            </Card>
        </div >
    );
}
