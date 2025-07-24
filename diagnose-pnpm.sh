#!/bin/bash

echo "🔍 Diagnosing pnpm dev issues..."
echo "================================"

# Check Node version
echo "1. Checking Node.js version..."
node_version=$(node --version 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Node.js is not installed!"
    echo "   Fix: Install Node.js 18+ from https://nodejs.org"
    exit 1
fi
echo "✅ Node version: $node_version"

# Check pnpm
echo -e "\n2. Checking pnpm installation..."
pnpm_version=$(pnpm --version 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ pnpm is not installed!"
    echo "   Fix: npm install -g pnpm"
    exit 1
fi
echo "✅ pnpm version: $pnpm_version"

# Check if in correct directory
echo -e "\n3. Checking project directory..."
if [ ! -f "package.json" ]; then
    echo "❌ Not in project root directory!"
    echo "   Fix: cd /Users/sho/Code/venue-smart-dashboard"
    exit 1
fi
echo "✅ In correct directory"

# Check node_modules
echo -e "\n4. Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not installed!"
    echo "   Fix: pnpm install"
else
    echo "✅ node_modules exists"
fi

# Check workspace packages
echo -e "\n5. Checking workspace packages..."
for pkg in "shared" "backend" "frontend"; do
    if [ ! -d "packages/$pkg/node_modules" ]; then
        echo "❌ Missing node_modules in packages/$pkg"
        echo "   Fix: pnpm install"
    else
        echo "✅ packages/$pkg has dependencies"
    fi
done

# Check if shared is built
echo -e "\n6. Checking shared package build..."
if [ ! -d "packages/shared/dist" ]; then
    echo "❌ Shared package not built!"
    echo "   Fix: pnpm build:shared"
else
    echo "✅ Shared package is built"
fi

# Check ports
echo -e "\n7. Checking port availability..."
for port in 3000 3001; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ Port $port is already in use!"
        echo "   Fix: Kill the process using: lsof -ti:$port | xargs kill -9"
    else
        echo "✅ Port $port is available"
    fi
done

# Check Vercel CLI
echo -e "\n8. Checking Vercel CLI..."
vercel_version=$(vercel --version 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "⚠️  Vercel CLI not installed (needed for backend)"
    echo "   Fix: pnpm add -g vercel"
else
    echo "✅ Vercel CLI: $vercel_version"
fi

echo -e "\n================================"
echo "📋 RECOMMENDED FIXES:"
echo "================================"

# Provide consolidated fix commands
echo -e "\nRun these commands in order:"
echo "1. pnpm install"
echo "2. pnpm build:shared"
echo "3. pnpm dev"

echo -e "\nIf that doesn't work, try:"
echo "pnpm clean && rm -rf pnpm-lock.yaml && pnpm install"