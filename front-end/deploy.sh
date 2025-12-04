#!/bin/bash

# Deploy script for front-end application
echo "Starting front-end deployment..."

pnpm run build

scp -r dist/* mini-onshape:/home/azureuser/www/html/