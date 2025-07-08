#!/bin/bash

# Video Creator Web Interface Launcher
# This script starts the SvelteKit web interface for the Video Creator

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
CLIENT_DIR="$SCRIPT_DIR/client"

print_status "Starting Video Creator Web Interface..."

# Check if client directory exists
if [ ! -d "$CLIENT_DIR" ]; then
    print_error "Client directory not found at $CLIENT_DIR"
    print_error "Make sure you've set up the SvelteKit client application"
    exit 1
fi

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    print_error "Bun is not installed or not in PATH"
    print_error "Please install bun: https://bun.sh/docs/installation"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "$CLIENT_DIR/node_modules" ]; then
    print_warning "Dependencies not found. Installing..."
    cd "$CLIENT_DIR"
    bun install
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies"
        exit 1
    fi
    print_success "Dependencies installed successfully"
fi

# Check if the main video creator is set up
if [ ! -f "$SCRIPT_DIR/src/index.ts" ]; then
    print_error "Main video creator not found at $SCRIPT_DIR/src/index.ts"
    print_error "Make sure the main video creator is properly set up"
    exit 1
fi

# Check if media directories exist
MEDIA_DIR="$SCRIPT_DIR/media"
if [ ! -d "$MEDIA_DIR" ]; then
    print_warning "Media directory not found. Creating..."
    mkdir -p "$MEDIA_DIR/scripts"
    mkdir -p "$MEDIA_DIR/audios"
    mkdir -p "$MEDIA_DIR/outputs"
    print_success "Media directories created"
fi

# Start the development server
print_status "Starting development server..."
print_status "The web interface will be available at: http://localhost:3000"
print_status "Press Ctrl+C to stop the server"

cd "$CLIENT_DIR"

# Check if port 3000 is already in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port 3000 is already in use"
    print_status "Trying to start on a different port..."
    bun run dev --port 3001
else
    bun run dev
fi

# If we get here, the server was stopped
print_success "Development server stopped"
