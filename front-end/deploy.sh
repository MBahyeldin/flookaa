#!/bin/bash

# Deploy script for front-end application
echo "Starting front-end deployment..."

pnpm run build

scp -r dist/* flookaa-front-end:/opt/wwwroot/flookaa.com/