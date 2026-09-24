#!/usr/bin/env bash
set -euo pipefail

APP_NAME="whatsapp"
OUTPUT_DIR="bin"

# Make sure output directory exists
mkdir -p "$OUTPUT_DIR"

echo "🔨 Building $APP_NAME for Linux (amd64)..."
# CGO_ENABLED=0 is explicit because the session store must stay on the pure-Go
# modernc.org/sqlite driver. Switching to mattn/go-sqlite3 would break this
# cross-build from macOS.
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o "$OUTPUT_DIR/$APP_NAME" .

echo "✅ Build complete: $OUTPUT_DIR/$APP_NAME"

echo "🚀 Deploying to remote server..."
scp "$OUTPUT_DIR/$APP_NAME" gRPC@whatsapp:/home/gRPC/watched
