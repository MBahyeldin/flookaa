import { useState, useMemo, useRef } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { useReactMediaRecorder } from "react-media-recorder";
import { Mic, Square, Trash2, Send, Image } from "lucide-react";
import VoiceIndicator from "./voiceIndocator";
import uploadAudio from "@/services/uploadAudio";
import uploadFile from "@/services/uploadFile";
import type { SimpleInput } from "@/generated/graphql";

export default function SimpleInputComponent({ onSend }: {
    onSend: (simpleInput: SimpleInput) => Promise<void>;
}) {
    const [newComment, setNewComment] = useState("");
    const [blob, setBlob] = useState<Blob | null>(null);
    const [mediaUrl, setMediaUrl] = useState<string>("");
    const uploadImageInputRef = useRef<HTMLInputElement>(null);
    const [commentType, setCommentType] = useState<"TEXT" | "VOICE" | "MEDIA" | null>(null);

    // ✅ Codec detection
    const mimeType = useMemo(() => {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))
            return "audio/webm;codecs=opus";
        if (MediaRecorder.isTypeSupported("audio/mp4"))
            return "audio/mp4";
        throw new Error("No supported audio codec found for MediaRecorder");
    }, []);

    const { status, startRecording, stopRecording, mediaBlobUrl, clearBlobUrl, previewAudioStream } =
        useReactMediaRecorder({
            audio: true, video: false, mediaRecorderOptions: { mimeType },
            onStart: () => {
                console.log("Recording started");
                setCommentType("VOICE");
            },
            onStop: (_, blob) => {
                setBlob(blob);
            },

        });

    const handleSend = async () => {
        // read blob as array buffer from mediaBlobUrl
        // Implement your blob upload logic here
        // Return the URL of the uploaded audio file
        let audioUrl = "";
        if (blob) {
            console.log("mimeType: ", mimeType);

            audioUrl = await uploadAudio({
                blob,
                fileName: "comment-audio.webm",
                fileSize: blob?.size || 0,
                mimeType: mimeType,
            });
        }
        console.log("Uploaded audio URL:", audioUrl);

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


        const res = await onSend({
            content,
            type: commentType,
        });

        console.log("Comment created:", res);
        setNewComment("");
        clearBlobUrl();
        setBlob(null);
        setMediaUrl("");
        setCommentType(null);
    };

    const handleDeleteRecording = () => {
        clearBlobUrl();
        setBlob(null);
        setCommentType(null);
    };

    const handleUploadMedia = () => {
        if (uploadImageInputRef.current) {
            uploadImageInputRef.current.click();
        }
    };

    const onImageInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        const url = await uploadFile(file);
        setMediaUrl(url);
        setCommentType("MEDIA");
    };

    const handleDeleteMedia = () => {
        setMediaUrl("");
        setCommentType(null);
        if (uploadImageInputRef.current) {
            uploadImageInputRef.current.value = "";
        }
    };



    return (
        <div className="flex space-x-3 items-start w-full">
            <Card className="flex-1 border border-muted bg-muted/50 p-2">
                <CardContent className="flex flex-col gap-2 p-0">
                    <div className="flex items-center gap-2 justify-end">
                        {!commentType || commentType === "TEXT" ? (
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
                                className="flex-1 bg-transparent rounded-full px-4 py-2 text-sm border border-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        ) : null}

                        {!commentType ? (
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={handleUploadMedia}
                            >
                                <Image className="h-4 w-4" />
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
                                onClick={startRecording}
                                disabled={!!mediaBlobUrl}
                            >
                                <Mic className="h-4 w-4" />
                            </Button>
                        ) : null}

                        {status === "recording" ? (
                            <div className="flex flex-col items-center gap-3 mt-6">
                                <Button
                                    size="icon"
                                    variant="destructive"
                                    className="animate-pulse"
                                    onClick={stopRecording}
                                >
                                    <Square className="h-4 w-4" />
                                </Button>
                                <VoiceIndicator previewAudioStream={previewAudioStream} />
                            </div>

                        ) : null}

                        < Button
                            size="sm"
                            onClick={handleSend}
                            disabled={!newComment.trim() && !mediaBlobUrl && !mediaUrl}
                        >
                            <Send className="h-4 w-4 mr-1" /> Post
                        </Button>
                    </div>

                    {mediaBlobUrl && (
                        <div className="flex items-center gap-3 rounded-md border border-border bg-background p-2">
                            <audio
                                controls
                                src={mediaBlobUrl}
                                className="flex-1"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDeleteRecording}
                                className="text-destructive hover:text-destructive/80"
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
