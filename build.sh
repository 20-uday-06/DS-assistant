# Build script for Netlify - fallback approach
#!/bin/bash
echo "Starting build process..."

# Set Node version
export NODE_VERSION=20.11.1

# Clean install approach
echo "Cleaning node_modules and package-lock.json..."
rm -rf node_modules package-lock.json

# Install dependencies
echo "Installing dependencies..."
npm install --force

# Run build
echo "Running build..."
npm run build

echo "Build completed!"
