#!/bin/bash
set -e

export COMMIT=$(git rev-parse HEAD)
docker compose up -d --build