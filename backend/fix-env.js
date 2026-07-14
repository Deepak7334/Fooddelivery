const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
let content = fs.readFileSync(envPath, 'utf8');

// Find the private key and fix it
const match = content.match(/FIREBASE_PRIVATE_KEY="([^"]+)"/);
if (match) {
  let key = match[1];
  // Replace literal '\n' sequences with real newlines
  key = key.replace(/\\n/g, '\n');
  // Remove any trailing backslash
  key = key.replace(/\\$/, '');
  // Remove trailing newlines
  key = key.trim();
  
  content = content.replace(match[0], `FIREBASE_PRIVATE_KEY="${key}"`);
  fs.writeFileSync(envPath, content);
  console.log('Fixed .env private key');
}
