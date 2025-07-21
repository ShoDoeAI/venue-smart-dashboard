#!/bin/bash
echo "Current directory: $(pwd)"
echo "Listing files:"
ls -la
echo "Checking src directory:"
ls -la src/
echo "Running vite build..."
npx vite build