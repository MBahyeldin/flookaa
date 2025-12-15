const S3_BUCKET_BASE_URL = import.meta.env.VITE_S3_BUCKET_BASE_URL || "";

export default async function uploadFile(file: File): Promise<string> {
  const { ticket_id } = await uploadFileStepOne(file);
  const { totalChunks } = await uploadFileStepTwo({ file, ticket_id });
  const result = await uploadFileStepThree({
    ticket_id,
    totalChunks,
    fileName: file.name,
  });
  return result.url;
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

  console.log("👉 Requesting presigned URL...");
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log("Server response:", data);
    return data;
  } catch (err) {
    console.error("Failed to get presigned URL:", err);
    throw err;
  }
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
  const chunkSize = 5 * 1024 * 1024; // 5MB
  const numChunks = Math.ceil(fileSize / chunkSize);

  console.log("👉 Uploading file to S3...");
  try {
    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);
      const chunk = fileContent.slice(start, end);
      const multipart = new FormData();
      multipart.append("file", new Blob([chunk]), file.name);
      multipart.append("chunkIndex", i.toString());

      const res = await fetch(path, {
        method: "POST",
        body: multipart,
      });

      console.log(`Uploaded chunk ${i}/${numChunks}, status: ${res.status}`);

      if (!res.ok) {
        throw new Error(`Failed to upload chunk ${i + 1}`);
      }
    }
    console.log("File upload completed.");
  } catch (err) {
    console.error("Failed to upload file:", err);
    throw err;
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

  console.log("👉 Finalizing upload...");
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileName, totalChunks }),
    });
    if (!res.ok) {
      throw new Error("Failed to finalize upload");
    }
    const data = await res.json();
    console.log("Server response:", data);
    return data;
  } catch (err) {
    console.error("Failed to finalize upload:", err);
    throw err;
  }
}
