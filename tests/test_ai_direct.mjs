import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callAI } from '../services/aiRouter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
const dotenvPath = path.join(__dirname, '../.env');
if (fs.existsSync(dotenvPath)) {
  const dotenvContent = fs.readFileSync(dotenvPath, 'utf8');
  const dotenvLines = dotenvContent.split(/\r?\n/);
  for (const line of dotenvLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

async function test() {
  console.log('Testing callAI...');
  try {
    const res = await callAI({
      prompt: 'Say hello and return a JSON containing {"hello": "world"}. Do not return anything else.',
      isJson: true,
      onLog: console.log
    });
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Error in test:', err);
  }
}

test();
