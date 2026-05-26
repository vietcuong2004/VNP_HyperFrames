import express from "express";
import http from "http";
import { Server } from "socket.io";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { inspectEnvironment } from "./environment.mjs";
import { createNodeScriptCommand } from "./runtime_binaries.mjs";
import { createWorkspacePaths, ensureWorkspace } from "./workspace.mjs";
import { loadWorkspaceEnv, saveWorkspaceEnv } from "./settings.mjs";
import { syncTemplates, createJob, updateJobProgress } from "../services/dbService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findLatestMp4(rendersDir) {
  if (!fs.existsSync(rendersDir)) return null;

  const files = fs
    .readdirSync(rendersDir)
    .filter((file) => file.endsWith(".mp4"))
    .map((file) => ({
      name: file,
      mtime: fs.statSync(path.join(rendersDir, file)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return files.length > 0 ? path.join(rendersDir, files[0].name) : null;
}

export function createJobId(index, now = Date.now()) {
  return randomUUID();
}

async function cleanUpTempWorkspace(workspacePath) {
  try {
    // 1. Unlink junctions/symlinks first to avoid recursive traversal issues on Windows
    const symlinks = [
      path.join(workspacePath, "assets", "character"),
      path.join(workspacePath, "assets", "background-music"),
      path.join(workspacePath, "assets", "sound-effect"),
      path.join(workspacePath, "assets", "logo"),
      path.join(workspacePath, "compositions"),
      path.join(workspacePath, "vendor"),
    ];

    for (const link of symlinks) {
      try {
        const stat = await fsp.lstat(link).catch(() => null);
        if (stat && (stat.isSymbolicLink() || stat.isDirectory())) {
          await fsp.unlink(link).catch(async () => {
            await fsp.rmdir(link).catch(() => {});
          });
        }
      } catch (e) {}
    }

    // 2. Perform a retry-based rm on the main directory (with brief delay to release locks)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await fsp.rm(workspacePath, { recursive: true, force: true });
        return;
      } catch (err) {
        if (attempt === 3) {
          console.warn(`[desktop] Failed to clean up temp workspace ${workspacePath} after 3 attempts:`, err.message);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
  } catch (err) {
    console.warn(`[desktop] Exception during temp workspace cleanup ${workspacePath}:`, err.message);
  }
}


function openFolder(folderPath) {
  const command = process.platform === "win32" ? "explorer.exe" : process.platform === "darwin" ? "open" : "xdg-open";
  const child = spawn(command, [folderPath], {
    detached: true,
    stdio: "ignore",
    shell: false,
  });
  child.unref();
}

function createApp({ appRoot, workspaceRoot, runtimeEnv = {}, isPackaged = false, nodePath, electronPath, browserRuntime }) {
  const paths = createWorkspacePaths({ appRoot, workspaceRoot });
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  app.use(express.json());
  app.use(express.static(paths.publicDir));
  app.use("/renders", express.static(paths.rendersDir));

  const jobQueue = [];
  let activeJobsCount = 0;
  const MAX_CONCURRENT_JOBS = 3;

  async function processQueue() {
    if (activeJobsCount >= MAX_CONCURRENT_JOBS || jobQueue.length === 0) return;
    activeJobsCount++;

    const job = jobQueue.shift();
    
    // Gọi tiếp để khởi động các job khác song song nếu còn slot trống
    processQueue();

    const { url, id } = job;
    
    // Tạo thư mục workspace cô lập cho tiến trình chạy song song này trong renders/tmp
    const jobWorkspaceRoot = path.join(paths.rendersDir, "tmp", `tmp_workspace_${id}`);
    await fsp.mkdir(jobWorkspaceRoot, { recursive: true });

    const logPath = path.join(paths.logsDir, `${id}.log`);
    io.emit("job_start", { id, url });
    await updateJobProgress(id, { status: "running", current_stage: "starting", progress: 5 }).catch(() => {});

    try {
      if (browserRuntime) {
        io.emit("job_output", { id, text: "[desktop] Checking browser runtime for screenshots...\n" });
        const browserResult = await browserRuntime.ensureReady();
        if (browserResult.executablePath) {
          runtimeEnv.PUPPETEER_EXECUTABLE_PATH = browserResult.executablePath;
          runtimeEnv.PUPPETEER_CACHE_DIR = browserRuntime.cacheDir;
          const installNote = browserResult.installed ? "installed" : browserResult.source;
          io.emit("job_output", { id, text: `[desktop] Browser ready (${installNote}).\n` });
        } else if (isPackaged) {
          throw new Error("Không tìm thấy browser để Puppeteer chụp màn hình.");
        }
      }

      // Link static assets into the temporary workspace assets directory to save space and time
      await fsp.mkdir(path.join(jobWorkspaceRoot, "assets"), { recursive: true });
      const symlinkType = process.platform === "win32" ? "junction" : "dir";
      const assetSubdirs = ["character", "background-music", "sound-effect", "logo", "fonts"];
      
      for (const dir of assetSubdirs) {
        const srcDir = path.join(workspaceRoot, "assets", dir);
        if (fs.existsSync(srcDir)) {
          await fsp.symlink(srcDir, path.join(jobWorkspaceRoot, "assets", dir), symlinkType);
        }
      }
      
      // Link compositions and vendor directories
      await fsp.symlink(path.join(workspaceRoot, "compositions"), path.join(jobWorkspaceRoot, "compositions"), symlinkType);
      await fsp.symlink(path.join(workspaceRoot, "vendor"), path.join(jobWorkspaceRoot, "vendor"), symlinkType);

      // Copy config files
      for (const file of ["hyperframes.json", "meta.json"]) {
        const srcFile = path.join(workspaceRoot, file);
        if (fs.existsSync(srcFile)) {
          await fsp.copyFile(srcFile, path.join(jobWorkspaceRoot, file));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await fsp.appendFile(logPath, `[desktop] Temporary workspace setup failed: ${message}\n`, "utf-8").catch(() => {});
      io.emit("job_error", { id, error: `Workspace setup failed: ${message}`, logPath });
      await updateJobProgress(id, { status: "failed", current_stage: "failed", error_message: `Workspace setup failed: ${message}` }).catch(() => {});
      
      // Clean up workspace if setup fails
      await fsp.rm(jobWorkspaceRoot, { recursive: true, force: true }).catch(() => {});
      
      activeJobsCount--;
      processQueue();
      return;
    }

    const nodeCommand = createNodeScriptCommand({
      scriptPath: path.join(__dirname, "../pipeline/run_pipeline.js"),
      args: [url],
      isPackaged,
      nodePath,
      electronPath,
    });

    const child = spawn(nodeCommand.command, nodeCommand.args, {
      cwd: appRoot,
      shell: false,
      env: {
        ...process.env,
        ...runtimeEnv,
        ...nodeCommand.env,
        APP_ROOT: appRoot,
        WORKSPACE_DIR: jobWorkspaceRoot,
        JOB_ID: id,
      },
    });

    let videoPath = null;
    const appendLog = (text) => {
      fsp.appendFile(logPath, text, "utf-8").catch(() => { });
    };

    child.stdout.on("data", (data) => {
      const text = data.toString();
      appendLog(text);
      io.emit("job_output", { id, text });

      const renameMatch =
        text.match(/->\s+([\w\-.]+\.mp4)/) ||
        text.match(/→\s+([\w\-.]+\.mp4)/) ||
        text.match(/â†’\s+([\w\-.]+\.mp4)/);
      if (renameMatch) {
        videoPath = path.join(jobWorkspaceRoot, "renders", renameMatch[1].trim());
      }

      const hfMatch = text.match(/◇\s+(.*\.mp4)/) || text.match(/â—‡\s+(.*\.mp4)/);
      if (hfMatch) {
        videoPath = hfMatch[1].trim();
      }
    });

    child.stderr.on("data", (data) => {
      const text = data.toString();
      appendLog(text);
      io.emit("job_output", { id, text });
    });

    child.on("close", async (code) => {
      if (code === 0) {
        if (!videoPath) {
          videoPath = findLatestMp4(path.join(jobWorkspaceRoot, "renders"));
        }

        let finalVideoPath = null;
        if (videoPath && fs.existsSync(videoPath)) {
          finalVideoPath = path.join(paths.rendersDir, path.basename(videoPath));
          try {
            await fsp.rename(videoPath, finalVideoPath);
          } catch (err) {
            // Fallback to copy + unlink if rename fails (e.g. cross-volume move)
            await fsp.copyFile(videoPath, finalVideoPath);
            await fsp.unlink(videoPath).catch(() => {});
          }
        }

        const relativeVideoPath = finalVideoPath ? `/renders/${path.basename(finalVideoPath)}` : null;
        if (finalVideoPath) {
          console.log(`[job_done] videoPath: ${finalVideoPath} -> serving: ${relativeVideoPath}`);
        }
        io.emit("job_done", { id, videoPath: relativeVideoPath, logPath });
      } else {
        io.emit("job_error", { id, error: `Process exited with code ${code}`, logPath });
        await updateJobProgress(id, { status: "failed", current_stage: "failed", error_message: `Tiến trình render thất bại với mã lỗi ${code}` }).catch(() => {});
      }

      // Clean up the temporary workspace directory robustly
      await cleanUpTempWorkspace(jobWorkspaceRoot);

      activeJobsCount--;
      processQueue();
    });
  }

  function detectPlatform(url) {
    if (!url) return "web";
    const lower = url.toLowerCase();
    if (lower.includes("github.com")) return "github";
    if (lower.includes("hub.docker.com") || lower.includes("docker.io") || lower.includes("docker")) return "docker";
    return "web";
  }

  app.post("/api/generate", async (req, res) => {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: "Invalid urls" });
    }

    const jobs = [];
    for (let index = 0; index < urls.length; index++) {
      const url = urls[index];
      const jobId = createJobId(index);
      const platform = detectPlatform(url);

      try {
        await createJob(jobId, url, platform, null, null);
      } catch (dbErr) {
        console.error(`[DB Error] Đăng ký job ${jobId} lên Supabase thất bại:`, dbErr.message);
      }

      jobs.push({ id: jobId, url });
    }

    jobQueue.push(...jobs);
    processQueue();

    return res.json({ success: true, jobs });
  });

  app.get("/api/recent-videos", (req, res) => {
    if (!fs.existsSync(paths.rendersDir)) return res.json([]);

    const files = fs
      .readdirSync(paths.rendersDir)
      .filter((file) => file.endsWith(".mp4"))
      .map((file) => ({
        name: file,
        mtime: fs.statSync(path.join(paths.rendersDir, file)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 2)
      .map((file) => ({ name: file.name, url: `/renders/${file.name}` }));

    return res.json(files);
  });

  app.get("/api/environment", async (_req, res) => {
    const result = await inspectEnvironment({
      appRoot,
      workspaceRoot,
      env: runtimeEnv,
      isPackaged,
    });
    return res.json({ ...result, workspaceRoot });
  });

  app.post("/api/open-renders", async (_req, res) => {
    await ensureWorkspace(paths);
    openFolder(paths.rendersDir);
    return res.json({ success: true, path: paths.rendersDir });
  });

  app.get("/api/settings", async (req, res) => {
    try {
      const workspaceEnv = await loadWorkspaceEnv(workspaceRoot);
      return res.json({
        openaiApiKey: workspaceEnv.OPENAI_API_KEY || "",
        openrouterApiKey: workspaceEnv.OPENROUTER_API_KEY || "",
        tavilyApiKey: workspaceEnv.TAVILY_API_KEY || "",
        larvoiceApiKey: workspaceEnv.LARVOICE_API_KEY || "",
        larvoiceVoiceId: workspaceEnv.LARVOICE_VOICE_ID || "1",
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const { openaiApiKey, openrouterApiKey, tavilyApiKey, larvoiceApiKey, larvoiceVoiceId } = req.body;
      await saveWorkspaceEnv(workspaceRoot, {
        openaiApiKey,
        openrouterApiKey,
        tavilyApiKey,
        larvoiceApiKey,
        larvoiceVoiceId,
      });
      // Also update runtimeEnv dynamically so the current running process has the updated keys
      runtimeEnv.OPENAI_API_KEY = openaiApiKey;
      runtimeEnv.OPENROUTER_API_KEY = openrouterApiKey;
      runtimeEnv.TAVILY_API_KEY = tavilyApiKey;
      runtimeEnv.LARVOICE_API_KEY = larvoiceApiKey;
      runtimeEnv.LARVOICE_VOICE_ID = larvoiceVoiceId;
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  return { app, server, io, paths };
}

export async function startServer(options = {}) {
  const appRoot = options.rootDir ? path.resolve(options.rootDir) : process.cwd();
  const workspaceRoot = options.workspaceDir ? path.resolve(options.workspaceDir) : appRoot;
  const port = Number(options.port ?? process.env.PORT ?? 3001);
  const host = options.host ?? process.env.HOST ?? "127.0.0.1";
  const { app, server, io, paths } = createApp({
    appRoot,
    workspaceRoot,
    runtimeEnv: options.runtimeEnv,
    isPackaged: options.isPackaged,
    nodePath: options.nodePath,
    electronPath: options.electronPath,
    browserRuntime: options.browserRuntime,
  });
  await ensureWorkspace(paths);
  await syncTemplates(paths.templatesDir).catch((err) => {
    console.error("[desktop] Đồng bộ templates thất bại:", err.message);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const url = `http://${host}:${actualPort}`;

  return {
    app,
    server,
    io,
    rootDir: appRoot,
    appRoot,
    workspaceRoot,
    port: actualPort,
    host,
    url,
    close: () =>
      new Promise((resolve, reject) => {
        io.close();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isCli) {
  startServer({
    workspaceDir: process.env.WORKSPACE_DIR,
  })
    .then((instance) => {
      console.log(`UI Server running at ${instance.url}`);
      console.log(`Workspace: ${instance.workspaceRoot}`);
    })
    .catch((error) => {
      console.error("Failed to start UI server:", error);
      process.exit(1);
    });
}
