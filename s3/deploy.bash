#!/usr/bin/env bash
set -euo pipefail

APP_NAME="s3"
OUTPUT_DIR="bin"

# Make sure output directory exists
mkdir -p "$OUTPUT_DIR"

echo "🔨 Building $APP_NAME for Linux (amd64)..."
GOOS=linux GOARCH=amd64 go build -o "$OUTPUT_DIR/$APP_NAME" .

echo "✅ Build complete: $OUTPUT_DIR/$APP_NAME"

echo "🚀 Deploying to remote server..."
scp "$OUTPUT_DIR/$APP_NAME" gRPC@flookaa-s3:/home/gRPC/watched
