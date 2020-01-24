#!/bin/bash

while true
do
    curl -N http://127.0.0.1:9091/heartbeat/?clientId=asdfa -H 'accept:text/event-stream'
done
