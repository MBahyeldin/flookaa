import { t } from "@/i18n";
import { formatNumber } from "@/lib/format";

const S3_BUCKET_BASE_URL = import.meta.env.VITE_S3_BUCKET_BASE_URL || "";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB — must stay under nginx client_max_body_size

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return t("common:bytes.mb", { n: formatNumber(Math.round((bytes / (1024 * 1024)) * 10) / 10) });
  if (bytes >= 1024) return t("common:bytes.kb", { n: formatNumber(Math.round(bytes / 1024)) });
  return t("common:bytes.b", { n: formatNumber(bytes) });
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
    return file ? t("common:upload.tooLargeSize", { size: formatBytes(file.size) }) : t("common:upload.tooLarge");
  }
  if (response.status === 401 || response.status === 403) {
    return t("common:upload.forbidden");
  }
  if (response.status === 415) {
    return t("common:upload.unsupportedType");
  }

  let detail = "";
  try {
    const body = await response.json();
    if (body?.error) detail = ` — ${body.error}`;
  } catch {
    /* nginx errors are HTML, not JSON */
  }
  console.error(`Upload failed: HTTP ${response.status}${detail}`);
  if (response.status >= 500) {
    return t("common:upload.serviceFailed", { status: response.status });
  }
  return t("common:upload.failedStatus", { status: response.status });
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
    throw new Error(t("common:upload.noUrl"));
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
    throw new Error(t("common:upload.unreachable"));
  }

  // This step had no status check at all: a rejection returned undefined and
  // the next step then uploaded chunks against `ticket_id === undefined`.
  if (!res.ok) {
    throw new Error(await describeFailure(res, file));
  }

  const data = await res.json().catch(() => null);
  if (!data?.ticket_id) {
    throw new Error(t("common:upload.noTicket"));
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
      throw new Error(t("common:upload.interrupted", { part: i + 1, total: numChunks }));
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
      throw new Error(numChunks > 1 ? t("common:upload.failedAtPart", { reason, part: i + 1, total: numChunks }) : reason);
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
    throw new Error(t("common:upload.couldNotFinish"));
  }

  if (!res.ok) {
    const reason = await describeFailure(res);
    console.error(`Finalize rejected: HTTP ${res.status} — ${reason}`);
    throw new Error(reason);
  }

  return (await res.json().catch(() => null)) ?? { url: "" };
}
