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

  if (!mimeType) {
    throw new Error("MIME type is required");
  }
  const multipart = new FormData();
  multipart.append("file", blob, fileName);
  multipart.append("file_name", fileName);
  multipart.append("file_size", fileSize.toString());
  multipart.append("mime_type", mimeType);

  if (blob.size === 0) {
    throw new Error("Recording is empty — nothing was captured");
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      body: multipart,
      credentials: "include",
    });
  } catch (err) {
    console.error("Audio upload request failed:", err);
    throw new Error("Couldn’t reach the upload service");
  }

  /*
   * fetch only rejects on network failure — a 400 or 401 resolves normally.
   * Without this check a rejected upload fell through to `data.file_path`
   * being undefined, and the comment was posted with the literal URL
   * ".../undefined": the comment appeared but the audio never played, which
   * looks exactly like "voice notes don't work".
   */
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body?.error ? ` — ${body.error}` : "";
      if (body?.mime_type) detail += ` (${body.mime_type})`;
    } catch {
      /* non-JSON error body */
    }
    console.error(`Audio upload rejected: HTTP ${response.status}${detail}`);
    throw new Error(`Upload failed (${response.status})${detail}`);
  }

  const data = await response.json().catch(() => null);
  if (!data?.file_path) {
    console.error("Audio upload succeeded but returned no file_path:", data);
    throw new Error("Upload succeeded but no file path was returned");
  }

  return S3_BUCKET_BASE_URL + data.file_path;
}
