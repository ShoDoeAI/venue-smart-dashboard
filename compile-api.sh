#!/bin/bash

echo "🚀 Compiling TypeScript API files for Vercel deployment..."

# Create api directory if it doesn't exist
mkdir -p api

# Compile TypeScript files from packages/backend/api to root api directory
echo "📦 Compiling backend API functions..."

# Use TypeScript compiler with specific options for Vercel
cd packages/backend

# First, make sure dependencies are installed
pnpm install

# Compile all TypeScript files
npx tsc api/**/*.ts \
  --outDir ../../api \
  --module commonjs \
  --target es2020 \
  --esModuleInterop \
  --resolveJsonModule \
  --skipLibCheck \
  --forceConsistentCasingInFileNames \
  --allowJs \
  --declaration false \
  --removeComments true

cd ../..

# Check if compilation was successful
if [ $? -eq 0 ]; then
  echo "✅ API compilation successful!"
  echo "📁 Compiled files:"
  find api -name "*.js" -type f | head -20
else
  echo "❌ API compilation failed!"
  exit 1
fi

echo "
🎉 API functions are ready for Vercel deployment!
Next steps:
1. Commit the compiled JS files: git add api && git commit -m 'Add compiled API functions'
2. Push to trigger Vercel deployment: git push
"