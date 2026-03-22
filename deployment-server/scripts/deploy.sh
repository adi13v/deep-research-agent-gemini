#!/bin/bash

set -Eexuo pipefail

REPO_DIR="/home/user/prog/deep-research"
FRONTEND_DIR="$REPO_DIR/frontend"
WWW_DIR="/var/www/deep-research"

echo "Deployment started..."

cd $REPO_DIR

# Step 1: Pull latest code
git pull origin master

# Get the latest commit on the repo
REPO_COMMIT=$(git rev-parse HEAD)

export COMMIT=$REPO_COMMIT

# Get the commit hash from the running container's image name (deep-research:<commit>)
DOCKER_IMAGE=$(docker ps --filter name=deep-research --format '{{.Image}}' 2>/dev/null || echo "none:none")
DOCKER_COMMIT="${DOCKER_IMAGE##*:}"

echo "Repo commit:   $REPO_COMMIT"
echo "Docker commit: $DOCKER_COMMIT"

# Step 2: If commits don't match, rebuild docker (excluding frontend changes)
if [ "$REPO_COMMIT" != "$DOCKER_COMMIT" ]; then
    BACKEND_DIFF=$(git diff $DOCKER_COMMIT $REPO_COMMIT --name-only -- . ':(exclude)frontend' 2>/dev/null || echo "unknown")

    if [ -n "$BACKEND_DIFF" ]; then
        echo "Backend changes detected, rebuilding Docker..."
        # Blue green deployment
        if ss -ltn | grep -q ':8000 ' ; then
            PORT=8001
        else
            PORT=8000
        fi

        PROJECT=deep-research-$COMMIT
        # Trap errors so we tear down the failed project instead of stalling
        on_error() {
            echo "Docker compose failed, tearing down project $PROJECT..."
            PORT=$PORT docker compose -p "$PROJECT" down --remove-orphans 2>/dev/null || true
            exit 1
        }
        trap on_error ERR

        # timeout 120 ensures docker compose never stalls indefinitely
        PORT=$PORT timeout 120 docker compose -p "$PROJECT" up -d --build
        trap - ERR  # reset trap after success
        echo "Docker rebuilt and running."
    else
        echo "Only frontend changes in commit diff, skipping Docker rebuild."
    fi
else
    echo "Docker is already on latest commit, skipping rebuild."
fi

# Step 3: Check diff between frontend/ and /var/www/deep-research
FRONTEND_DIFF=$(diff -rq $FRONTEND_DIR $WWW_DIR 2>/dev/null || echo "diff")

if [ -n "$FRONTEND_DIFF" ]; then
    echo "Frontend changes detected, copying files..."
    cp -r $FRONTEND_DIR/. $WWW_DIR/
    echo "Frontend deployed to $WWW_DIR."
else
    echo "No frontend changes, skipping frontend deploy."
fi

# Step 4: Health check of new created process
echo "Running health check on port $PORT..."

sleep 3

HEALTH_OK=false

for i in {1..10}; do
    if curl -fs http://localhost:$PORT/health >/dev/null; then
        HEALTH_OK=true
        break
    fi
    sleep 2
done

if [ "$HEALTH_OK" = false ]; then
    echo "Health check failed, tearing down project $PROJECT..."
    PORT=$PORT docker compose -p "$PROJECT" down --remove-orphans 2>/dev/null || true
    exit 1
fi

