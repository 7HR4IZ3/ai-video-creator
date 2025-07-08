#!/usr/bin/env node

// Simple test script to verify OAuth setup
import { OAuthClient } from './src/oauth-client.js';

async function testOAuthSetup() {
  console.log('🧪 Testing OAuth Setup');
  console.log('=====================\n');

  const client = new OAuthClient();

  // Test 1: Check if OAuth server is running
  console.log('1. Checking OAuth server status...');
  try {
    const isRunning = await client.isServerRunning();
    if (isRunning) {
      console.log('✅ OAuth server is running');
    } else {
      console.log('❌ OAuth server is not running');
      console.log('   Start it with: npm run oauth-server');
      return;
    }
  } catch (error) {
    console.log('❌ Failed to check OAuth server:', error.message);
    return;
  }

  // Test 2: Check for existing tokens
  console.log('\n2. Checking for existing tokens...');
  const platforms = ['youtube', 'facebook', 'tiktok'];
  
  for (const platform of platforms) {
    try {
      const tokens = await client.getStoredTokens(platform);
      if (tokens) {
        const isValid = client.areTokensValid ? client.areTokensValid(tokens) : true;
        console.log(`✅ ${platform}: ${isValid ? 'Valid tokens found' : 'Tokens expired'}`);
      } else {
        console.log(`⚠️  ${platform}: No tokens found`);
      }
    } catch (error) {
      console.log(`❌ ${platform}: Error checking tokens - ${error.message}`);
    }
  }

  // Test 3: Environment check
  console.log('\n3. Checking environment configuration...');
  const requiredEnvVars = {
    youtube: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
    facebook: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET', 'FACEBOOK_PAGE_ID'],
    tiktok: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']
  };

  for (const [platform, vars] of Object.entries(requiredEnvVars)) {
    const missing = vars.filter(v => !process.env[v]);
    if (missing.length === 0) {
      console.log(`✅ ${platform}: All environment variables configured`);
    } else {
      console.log(`⚠️  ${platform}: Missing variables: ${missing.join(', ')}`);
    }
  }

  console.log('\n🎯 Test complete!');
  console.log('\nNext steps:');
  console.log('1. Configure missing environment variables');
  console.log('2. Test upload: npm run generate -- --story test --platform youtube');
  console.log('3. The system will guide you through OAuth if needed');
}

testOAuthSetup().catch(console.error);
