import express from "express";
import http from "http";
import { Server } from "socket.io";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));
app.use("/renders", express.static("renders"));

// Queue for sequential processing
const jobQueue = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || jobQueue.length === 0) return;
  isProcessing = true;

  const job = jobQueue.shift();
  const { url, id } = job;
  
  io.emit("job_start", { id, url });

  const child = spawn("node", [path.join(__dirname, "run_pipeline.js"), url]);

  let videoPath = null;
  let fullOutput = "";

  child.stdout.on("data", (data) => {
    const text = data.toString();
    fullOutput += text;
    io.emit("job_output", { id, text });

    // Parse video path
    const match = text.match(/◇\s+(.*\.mp4)/);
    if (match) {
      videoPath = match[1].trim();
    }
  });

  child.stderr.on("data", (data) => {
    const text = data.toString();
    io.emit("job_output", { id, text });
  });

  child.on("close", (code) => {
    if (code === 0) {
      // Find the most recently created mp4 in renders folder as a fallback
      if (!videoPath) {
        const rendersDir = path.join(process.cwd(), "renders");
        if (fs.existsSync(rendersDir)) {
          const files = fs.readdirSync(rendersDir).filter(f => f.endsWith(".mp4"));
          if (files.length > 0) {
            // Sort by modified time
            files.sort((a, b) => {
              return fs.statSync(path.join(rendersDir, b)).mtime.getTime() - 
                     fs.statSync(path.join(rendersDir, a)).mtime.getTime();
            });
            videoPath = path.join(rendersDir, files[0]);
          }
        }
      }

      let relativeVideoPath = null;
      if (videoPath) {
        // convert to relative path for web
        relativeVideoPath = "/renders/" + path.basename(videoPath);
      }
      io.emit("job_done", { id, videoPath: relativeVideoPath });
    } else {
      io.emit("job_error", { id, error: `Process exited with code ${code}` });
    }
    
    isProcessing = false;
    processQueue();
  });
}

app.post("/api/generate", (req, res) => {
  const { urls } = req.body;
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: "Invalid urls" });
  }

  const jobs = urls.map(url => ({
    id: Math.random().toString(36).substring(7),
    url
  }));

  jobQueue.push(...jobs);
  processQueue();

  res.json({ success: true, jobs });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`UI Server running at http://localhost:${PORT}`);
});
