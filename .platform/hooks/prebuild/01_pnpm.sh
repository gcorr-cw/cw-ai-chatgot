#!/bin/bash
# Redirect all output to a log file with timestamps for debugging
exec > >(while IFS= read -r line; do echo "$(date '+%Y-%m-%d %H:%M:%S') $line"; done) 2>&1
set -x

echo "Starting prebuild hook: Installing pnpm globally..."
npm install -g pnpm --verbose

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Removing any existing node_modules..."
rm -rf node_modules

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Installing dependencies with pnpm..."
pnpm install

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Building the app with pnpm build..."
pnpm build

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Prebuild hook completed."
