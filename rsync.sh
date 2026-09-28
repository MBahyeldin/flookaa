#!/bin/bash

# Usage: ./rsync.sh [-n]
if [ "$1" = "-n" ]; then
  shift
  DRY_RUN="-n"
fi

# If DRY_RUN is set, rsync will perform a dry run.

git ls-files -co --exclude-standard -z | rsync -avz --delete \
  --files-from=- \
  --from0 \
  ./ devBuilder@flookaa-internal-build:/home/devBuilder/workspace/ $DRY_RUN