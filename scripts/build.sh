#!/bin/bash

# Build script for Render deployment
echo "Starting build process..."

# Install dependencies
npm install

# Build the application
npm run build

# Run database migrations
npm run db:push

echo "Build completed successfully!"