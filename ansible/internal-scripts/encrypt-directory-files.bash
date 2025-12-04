#!/bin/bash

VAULT_PASS="./internal-scripts/vault-pass.bash"
TARGET_DIR="$1" 

find "$TARGET_DIR" -type f | while read -r file; do
  echo "Encrypting: $file"
  ansible-vault encrypt "$file" --vault-password-file "$VAULT_PASS"
done
