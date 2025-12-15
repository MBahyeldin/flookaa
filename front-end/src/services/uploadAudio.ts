const S3_BUCKET_BASE_URL = import.meta.env.VITE_S3_BUCKET_BASE_URL || "";

export default async function uploadAudio({
  blob,
  fileName,
  fileSize,
  mimeType,
}: {
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
}): Promise<string> {
  const path = S3_BUCKET_BASE_URL + "/api/v1/audio/upload";

  console.log("👉 Requesting presigned URL...");
  if (!mimeType) {
    throw new Error("MIME type is required");
  } else {
    console.log("MIME type: inner: ", mimeType);
  }
  const multipart = new FormData();
  multipart.append("file", blob, fileName);
  multipart.append("file_name", fileName);
  multipart.append("file_size", fileSize.toString());
  multipart.append("mime_type", mimeType);

  try {
    const presignedUrl = await fetch(path, {
      method: "POST",
      body: multipart,
    });
    const data = await presignedUrl.json();
    console.log("Server response:", data);
    return data.file_path;
  } catch (err) {
    console.error("Failed to upload audio file:", err);
    throw err;
  }
}
