#!/bin/bash
# Remove external log redirection
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