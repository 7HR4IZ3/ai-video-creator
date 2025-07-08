#!/bin/bash

# Setup script for OAuth Proxy Server

echo "🚀 Setting up OAuth Proxy Server for Video Creator"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install main project dependencies
echo "📦 Installing main project dependencies..."
npm install

# Setup OAuth server
echo "📦 Setting up OAuth server..."
cd oauth-server

# Install OAuth server dependencies
npm install

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating OAuth server .env file..."
    cp .env.example .env
    echo "⚠️  Please edit oauth-server/.env with your OAuth credentials"
else
    echo "✅ OAuth server .env file already exists"
fi

cd ..

# Copy main .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating main .env file..."
    cat > .env << 'EOF'
# Main Application Configuration
USE_OAUTH=true
OAUTH_SERVER_URL=http://localhost:3001

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=

# YouTube Configuration (for OAuth server)
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_CHANNEL_ID=

# Facebook Configuration (for OAuth server)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_PAGE_ID=

# TikTok Configuration (for OAuth server)
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
EOF
    echo "⚠️  Please edit .env with your configuration"
else
    echo "✅ Main .env file already exists"
fi

# Create startup scripts
echo "📝 Creating startup scripts..."

# Create start-oauth-server script
cat > start-oauth-server.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting OAuth Proxy Server..."
cd oauth-server && npm run dev
EOF
chmod +x start-oauth-server.sh

# Create start-with-oauth script  
cat > start-with-oauth.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting OAuth Proxy Server in background..."
cd oauth-server && npm run dev &
OAUTH_PID=$!
echo "OAuth server started with PID: $OAUTH_PID"

echo "⏳ Waiting for OAuth server to be ready..."
sleep 3

echo "🎬 Starting video creator CLI..."
echo "You can now run commands like:"
echo "  npm run generate -- --platform youtube"
echo "  npm run upload -- --story mystory --platform youtube,facebook,tiktok"
echo ""
echo "To stop the OAuth server later, run: kill $OAUTH_PID"
EOF
chmod +x start-with-oauth.sh

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env and oauth-server/.env with your OAuth credentials"
echo "2. Make sure Redis is running"
echo "3. Start the OAuth server: ./start-oauth-server.sh"
echo "4. Or start everything together: ./start-with-oauth.sh"
echo ""
echo "📖 For OAuth app setup instructions, see oauth-server/README.md"
echo ""
echo "🎯 Test the setup with:"
echo "   npm run generate -- --story test --platform youtube"
