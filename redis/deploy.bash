#!/usr/bin/env bash
set -euo pipefail

APP_NAME="app"
OUTPUT_DIR="bin"

# Make sure output directory exists
mkdir -p "$OUTPUT_DIR"

echo "🔨 Building $APP_NAME for Linux (arm64)..."
GOOS=linux GOARCH=arm64 go build -o "$OUTPUT_DIR/$APP_NAME" .

# deploy to remote server
echo "🚀 Deploying to remote server..."
scp "$OUTPUT_DIR/$APP_NAME" gRPC@lxd-development-redis:/home/gRPC/watched