#!/bin/bash
# Vercel build script

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Build shared package first
echo "Building shared package..."
cd packages/shared
pnpm build
cd ../..

# Build backend
echo "Building backend..."
cd packages/backend
pnpm build
cd ../..

# Build frontend
echo "Building frontend..."
cd packages/frontend
pnpm build
cd ../..

echo "Build complete!"