const S3_BUCKET_BASE_URL = import.meta.env.VITE_S3_BUCKET_BASE_URL || "";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB — must stay under nginx client_max_body_size

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/**
 * Turns a failed response into something worth showing a user.
 *
 * 413 in particular was the silent killer here: nginx rejects an oversized
 * body itself, so the response never reaches the upload service and carries no
 * JSON explanation at all.
 */
async function describeFailure(response: Response, file?: File): Promise<string> {
  if (response.status === 413) {
    const size = file ? ` (${formatBytes(file.size)})` : "";
    return `That image is too large to upload${size}. Try a smaller file.`;
  }
  if (response.status === 401 || response.status === 403) {
    return "You’re not signed in, or don’t have permission to upload.";
  }
  if (response.status === 415) {
    return `That file type isn’t supported${file?.type ? ` (${file.type})` : ""}.`;
  }

  let detail = "";
  try {
    const body = await response.json();
    if (body?.error) detail = ` — ${body.error}`;
  } catch {
    /* nginx errors are HTML, not JSON */
  }
  if (response.status >= 500) {
    return `The upload service failed (${response.status})${detail}.`;
  }
  return `Upload failed (${response.status})${detail}.`;
}

export default async function uploadFile(file: File): Promise<string> {
  const { ticket_id } = await uploadFileStepOne(file);
  const { totalChunks } = await uploadFileStepTwo({ file, ticket_id });
  const result = await uploadFileStepThree({
    ticket_id,
    totalChunks,
    fileName: file.name,
  });
  if (!result?.url) {
    throw new Error("Upload finished but no file URL was returned.");
  }
  return S3_BUCKET_BASE_URL + result.url;
}

async function uploadFileStepOne(file: File): Promise<{ ticket_id: string }> {
  const path = S3_BUCKET_BASE_URL + "/api/v1/upload";
  const fileName = file.name;
  const fileSize = file.size;
  const mimeType = file.type;

  const payload = {
    file_name: fileName,
    file_size: fileSize,
    mime_type: mimeType,
  };

  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      credentials: "include",
    });
  } catch (err) {
    console.error("Failed to reach the upload service:", err);
    throw new Error("Couldn’t reach the upload service. Check your connection.");
  }

  // This step had no status check at all: a rejection returned undefined and
  // the next step then uploaded chunks against `ticket_id === undefined`.
  if (!res.ok) {
    throw new Error(await describeFailure(res, file));
  }

  const data = await res.json().catch(() => null);
  if (!data?.ticket_id) {
    throw new Error("The upload service didn’t return an upload ticket.");
  }
  return data;
}

async function uploadFileStepTwo({
  file,
  ticket_id,
}: {
  file: File;
  ticket_id: string;
}): Promise<{
  totalChunks: number;
}> {
  const path = S3_BUCKET_BASE_URL + `/api/v1/upload/${ticket_id}`;
  const fileContent = await file.arrayBuffer();
  const fileSize = fileContent.byteLength;
  const numChunks = Math.ceil(fileSize / CHUNK_SIZE);

  for (let i = 0; i < numChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileSize);
    const chunk = fileContent.slice(start, end);
    const multipart = new FormData();
    multipart.append("file", new Blob([chunk]), file.name);
    multipart.append("chunkIndex", i.toString());

    let res: Response;
    try {
      res = await fetch(path, {
        method: "POST",
        body: multipart,
        credentials: "include",
      });
    } catch (err) {
      console.error(`Chunk ${i + 1}/${numChunks} request failed:`, err);
      throw new Error(
        `Upload interrupted at part ${i + 1} of ${numChunks}. Check your connection.`
      );
    }

    /*
     * The old message was just "Failed to upload chunk N", which told the user
     * nothing — and 413 is by far the most likely status here, because each
     * chunk is 5MB and nginx has to be configured to accept that.
     */
    if (!res.ok) {
      const reason = await describeFailure(res, file);
      console.error(
        `Chunk ${i + 1}/${numChunks} rejected: HTTP ${res.status} — ${reason}`
      );
      throw new Error(
        numChunks > 1 ? `${reason} (failed at part ${i + 1} of ${numChunks})` : reason
      );
    }
  }

  return { totalChunks: numChunks };
}

async function uploadFileStepThree({
  ticket_id,
  totalChunks,
  fileName,
}: {
  ticket_id: string;
  totalChunks: number;
  fileName: string;
}): Promise<{
  url: string;
}> {
  const path = S3_BUCKET_BASE_URL + `/api/v1/upload/${ticket_id}/complete`;

  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileName, totalChunks }),
      credentials: "include",
    });
  } catch (err) {
    console.error("Failed to finalize upload:", err);
    throw new Error("Couldn’t finish the upload. Check your connection.");
  }

  if (!res.ok) {
    const reason = await describeFailure(res);
    console.error(`Finalize rejected: HTTP ${res.status} — ${reason}`);
    throw new Error(reason);
  }

  return (await res.json().catch(() => null)) ?? { url: "" };
}
