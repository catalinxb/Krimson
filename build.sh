#!/bin/bash
set -e

# Install dependencies
echo "Installing backend dependencies..."
cd backend
npm install
npx prisma generate

# Build frontend
echo "Building frontend..."
cd ../
npm install
npm run build

# Copy built frontend to backend public folder
echo "Copying frontend build to backend..."
mkdir -p backend/public
cp -r dist/* backend/public/

echo "Build complete! Ready for Railway deployment."
