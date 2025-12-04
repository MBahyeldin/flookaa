#!/bin/bash
set -euo pipefail

BASE_URL="https://lxd-development.s3/api/v1"

echo "Select a request to run:"
echo "0) Health Check"
echo "1) Upload File"
echo "2) Upload File Chunks"
echo "3) Complete File Upload"

read -rp "Enter choice [0-3]: " choice


FILE_PATH="/Users/baheuddeen/Downloads/6006106684071725706.jpg"

case "$choice" in
  0)
    echo "👉 Checking health..."
    curl -sk -X GET "$BASE_URL/health" | jq || true
    ;;
  1)
    FILE_NAME=$(basename "$FILE_PATH")
    FILE_SIZE=$(stat -c%s "$FILE_PATH" 2>/dev/null || stat -f%z "$FILE_PATH")
    MIME_TYPE=$(file --brief --mime-type "$FILE_PATH")
    CHECKSUM=$(sha256sum "$FILE_PATH" | awk '{print $1}')

    echo "👉 Uploading file..."
    curl -sk -X POST "$BASE_URL/upload" \
      -H "Content-Type: application/json" \
      -d "{
        \"file_name\": \"$FILE_NAME\",
        \"file_size\": $FILE_SIZE,
        \"mime_type\": \"$MIME_TYPE\",
        \"checksum\": \"$CHECKSUM\"
      }" | jq || true
    ;;
  2)
    TICKET_ID="4ae4fd0d855893493905360406e74b92"  # Replace with actual ticket ID from previous
    echo "👉 Uploading file chunk..."
    curl -sk -X POST "$BASE_URL/upload/$TICKET_ID" \
      -H "Content-Type: multipart/form-data" \
      -F "chunkIndex=0" \
      -F "file=@$FILE_PATH" | jq || true
    ;;
  3)
    TICKET_ID="4ae4fd0d855893493905360406e74b92"  # Replace with actual ticket ID from previous
    echo "👉 Completing file upload..."
    curl -sk -X POST "$BASE_URL/upload/$TICKET_ID/complete" \
      -H "Content-Type: application/json" \
      -d "{
        \"filename\": \"6asroo.gif\",
        \"totalChunks\": 1
      }" | jq || true
    ;;

  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac
