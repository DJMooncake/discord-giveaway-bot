const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const examplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.error('Missing .env file. Create one from .env.example and add your own Discord credentials.');
  if (fs.existsSync(examplePath)) {
    console.error(`Template: ${examplePath}`);
  }
  process.exit(1);
}

const env = fs.readFileSync(envPath, 'utf8');
const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];
const missing = required.filter((key) => !new RegExp(`^${key}=`, 'm').test(env));

if (missing.length > 0) {
  console.error(`Missing required environment variables in .env: ${missing.join(', ')}`);
  console.error('Fill them in using the values from your Discord Developer Portal.');
  process.exit(1);
}

console.log('Environment check passed.');
