#! /bin/bash

set -e

APP_NAME="ws_proxy"
OUTPUT_DIR="bin"

if [ ! -d "$OUTPUT_DIR" ]; then
  mkdir -p "$OUTPUT_DIR"
fi


cargo build --target aarch64-unknown-linux-gnu --release

cp "target/aarch64-unknown-linux-gnu/release/$APP_NAME" "$OUTPUT_DIR/"

# deploy to remote server
echo "🚀 Deploying to remote server..."
scp "$OUTPUT_DIR/$APP_NAME" gRPC@lxd-development-nats:/home/gRPC/watched