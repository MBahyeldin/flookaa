#!/usr/bin/env bash
set -euo pipefail

APP_NAME="server"
OUTPUT_DIR="../../ansible/files/gRPC"

# Make sure output directory exists
mkdir -p "$OUTPUT_DIR"

echo "🔨 Building $APP_NAME for Linux (amd64)..."
GOOS=linux GOARCH=amd64 go build -o "$OUTPUT_DIR/$APP_NAME" .

echo "✅ Build complete: $OUTPUT_DIR/$APP_NAME"