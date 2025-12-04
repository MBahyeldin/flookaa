#! /usr/bin/bash
set -euo pipefail

app_bin="$0"
if [[ ! -x "$app_bin" ]]; then
  echo "Error: $app_bin is not executable."
  exit 1
fi

version="$1"
if [[ -z "$version" ]]; then
  echo "Usage: $0 <version>"
  exit 1
fi

echo "Publishing $app_bin to /opt/app/$version"

./bin/client publish --app "$app_bin" --version "$version" --service "my_grpc_service"