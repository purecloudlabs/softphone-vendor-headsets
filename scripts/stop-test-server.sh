#!/usr/bin/env bash

FILENAME="tmp/.mock-server-pid";

if [ -f $FILENAME ]; then
    typeset -i pid=$(cat $FILENAME)
    echo "Killing mock server. PID: $pid"
    kill $pid
    rm $FILENAME;
fi
