#!/bin/bash
# Redirect all output to a log file for debugging
exec > /tmp/01_pnpm.log 2>&1
set -x

echo "Starting prebuild hook: Installing pnpm globally..."
npm install -g pnpm --verbose

echo "Removing any existing node_modules..."
rm -rf node_modules

echo "Installing dependencies with pnpm..."
pnpm install

echo "Building the app with pnpm build..."
pnpm build

echo "Prebuild hook completed."