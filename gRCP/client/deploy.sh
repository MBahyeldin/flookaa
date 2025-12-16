#!/usr/bin/env bash
set -euo pipefail

APP_NAME="client"
OUTPUT_DIR="bin"

# Make sure output directory exists
mkdir -p "$OUTPUT_DIR"

echo "🔨 Building $APP_NAME for macOS (amd64)..."
GOOS=darwin GOARCH=amd64 go build -o "$OUTPUT_DIR/$APP_NAME" .

echo "✅ Build complete: $OUTPUT_DIR/$APP_NAME"

