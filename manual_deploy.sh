#!/bin/bash
set -e

export COMMIT=$(git rev-parse HEAD)
export PORT=8000
docker compose -p deep-research-$PORT up -d --build