#!/bin/bash

# This script builds the gRPC server application.
protoc --go_out=. --go-grpc_out=. proto/app_service.proto

cp -r app_service server

cp -r app_service client

cd server || exit
./deploy.sh
cd - || exit

cd client || exit
./deploy.sh
cd - || exit

rm -rf app_service

echo "gRPC server and client built successfully."
