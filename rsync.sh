#! /bin/bash

rsync -avz  --files-from=<(git ls-files) ./ devBuilder@flookaa-internal-build:/home/devBuilder/workspace/