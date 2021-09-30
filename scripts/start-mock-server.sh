#!/usr/bin/env bash

FILENAME="tmp/.mock-server-pid";

node ../mock-server/app
export MOCK_SERVER_PID=$!
echo "server running on $MOCK_SERVER_PID"
mkdir -p tmp
echo $MOCK_SERVER_PID > $FILENAME