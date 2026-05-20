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

const ROOT_DIR = process.cwd();

app.use(express.json());
app.use(express.static(path.join(ROOT_DIR, "public")));
app.use("/renders", express.static(path.join(ROOT_DIR, "renders")));

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

    // Parse renamed video path from run_pipeline output
    // Matches: ✅ Video đã đổi tên: old.mp4 → new.mp4
    const renameMatch = text.match(/→\s+([\w\-\.]+\.mp4)/);
    if (renameMatch) {
      videoPath = path.join(ROOT_DIR, "renders", renameMatch[1].trim());
    }
    // Also match hyperframes output: ◇ path/to/file.mp4
    const hfMatch = text.match(/◇\s+(.*\.mp4)/);
    if (hfMatch) {
      videoPath = hfMatch[1].trim();
    }
  });

  child.stderr.on("data", (data) => {
    const text = data.toString();
    io.emit("job_output", { id, text });
  });

  child.on("close", (code) => {
    if (code === 0) {
      // Fallback: find most recently modified mp4
      if (!videoPath) {
        const rendersDir = path.join(ROOT_DIR, "renders");
        if (fs.existsSync(rendersDir)) {
          const files = fs.readdirSync(rendersDir).filter(f => f.endsWith(".mp4"));
          if (files.length > 0) {
            files.sort((a, b) =>
              fs.statSync(path.join(rendersDir, b)).mtime.getTime() -
              fs.statSync(path.join(rendersDir, a)).mtime.getTime()
            );
            videoPath = path.join(rendersDir, files[0]);
          }
        }
      }

      let relativeVideoPath = null;
      if (videoPath) {
        const basename = path.basename(videoPath);
        relativeVideoPath = "/renders/" + basename;
        console.log(`[job_done] videoPath: ${videoPath} → serving: ${relativeVideoPath}`);
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

app.get("/api/recent-videos", (req, res) => {
  const rendersDir = path.join(ROOT_DIR, "renders");
  if (!fs.existsSync(rendersDir)) return res.json([]);
  const files = fs.readdirSync(rendersDir)
    .filter(f => f.endsWith(".mp4"))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(rendersDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 2)
    .map(f => ({ name: f.name, url: "/renders/" + f.name }));
  res.json(files);
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`UI Server running at http://localhost:${PORT}`);
});
