#!/bin/bash
set -e

echo "📦 Installing dependencies..."
npm install

echo "🔧 Generating Prisma Client..."
npx prisma generate

echo "🔄 Resolving failed migrations..."
npx prisma migrate resolve --applied 20251112013014_init || echo "⚠️ Migration already resolved or doesn't need resolution"

echo "📊 Running migrations..."
npx prisma migrate deploy

echo "🏗️ Building application..."
npm run build

echo "✅ Build completed successfully!"
