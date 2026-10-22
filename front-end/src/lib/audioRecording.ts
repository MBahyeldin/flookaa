export type AudioRecordingFormat = {
  mimeType: string;
  fileExtension: string;
  unsupportedReason: string;
};

// Every candidate is one the s3 audio upload accepts; ordered by preference.
const candidates: { type: string; ext: string }[] = [
  { type: "audio/webm;codecs=opus", ext: "webm" },
  { type: "audio/ogg;codecs=opus", ext: "ogg" },
  { type: "audio/mp4", ext: "m4a" },
];

const unsupported = (unsupportedReason: string): AudioRecordingFormat => ({
  mimeType: "",
  fileExtension: "webm",
  unsupportedReason,
});

export function audioRecordingFormat(): AudioRecordingFormat {
  // getUserMedia is missing outside a secure context (plain http on a LAN address).
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return unsupported(
      window.isSecureContext
        ? "This browser can’t access the microphone."
        : "Voice notes need a secure (HTTPS) connection."
    );
  }
  if (typeof MediaRecorder === "undefined") {
    return unsupported("This browser can’t record audio.");
  }
  const supported = candidates.find((candidate) => MediaRecorder.isTypeSupported?.(candidate.type));
  if (!supported) {
    return unsupported("This browser doesn’t support any audio format we can upload.");
  }
  return { mimeType: supported.type, fileExtension: supported.ext, unsupportedReason: "" };
}
