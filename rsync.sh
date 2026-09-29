#!/bin/bash

# Usage: ./rsync.sh [-n]
if [ "$1" = "-n" ]; then
  shift
  DRY_RUN="-n"
fi

# If DRY_RUN is set, rsync will perform a dry run.

#! /bin/bash

rsync -avz  --files-from=<(git ls-files) ./ devBuilder@flookaa-internal-build:/home/devBuilder/workspace/ $DRY_RUN