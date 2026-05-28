import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

async function testGenerate() {
  console.log('Sending POST request to /api/generate...');
  
  // Set MOCK_TTS so it runs offline
  process.env.MOCK_TTS = 'true';

  const response = await fetch('http://127.0.0.1:3001/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      urls: ['https://github.com/heygen-com/hyperframes']
    })
  });

  const data = await response.json();
  console.log('API Response:', JSON.stringify(data, null, 2));

  if (!data.success || !data.jobs || data.jobs.length === 0) {
    console.error('Failed to trigger generation.');
    return;
  }

  const job = data.jobs[0];
  const jobId = job.id;
  const logFile = path.join(appRoot, 'logs', `${jobId}.log`);
  console.log(`Watching log file: ${logFile}`);

  // Poll log file
  let lastSize = 0;
  const interval = setInterval(() => {
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      if (stats.size > lastSize) {
        const stream = fs.createReadStream(logFile, { start: lastSize, end: stats.size });
        stream.on('data', (chunk) => {
          process.stdout.write(chunk.toString());
        });
        lastSize = stats.size;
      }
    }
  }, 1000);

  // Monitor status by checking recent-videos or waiting for log file to indicate completion
  // The log will end with "AGENT PIPELINE DA HOAN THANH CONG!" or error trace.
  // We'll also check if the server is still running.
  
  const checkCompletionInterval = setInterval(async () => {
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, 'utf8');
      if (content.includes('AGENT PIPELINE DA HOAN THANH CONG!') || content.includes('Gap loi trong qua trinh chay Agent pipeline') || content.includes('Process exited with code')) {
        console.log('\n--- Job finished ---');
        clearInterval(interval);
        clearInterval(checkCompletionInterval);
        
        // Print recent videos
        const recentsResponse = await fetch('http://127.0.0.1:3001/api/recent-videos');
        const recents = await recentsResponse.json();
        console.log('Recent videos from API:', JSON.stringify(recents, null, 2));
      }
    }
  }, 2000);
}

testGenerate().catch(console.error);
