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
        docker compose -p deep-research-$COMMIT up -d --build
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

echo "Deployment complete!"