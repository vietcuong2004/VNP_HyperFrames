import express from "express";
import http from "http";
import { Server } from "socket.io";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import { fileURLToPath } from "url";
import { inspectEnvironment } from "./environment.mjs";
import { createNodeScriptCommand } from "./runtime_binaries.mjs";
import { createWorkspacePaths, ensureWorkspace } from "./workspace.mjs";

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
  let isProcessing = false;

  async function processQueue() {
    if (isProcessing || jobQueue.length === 0) return;
    isProcessing = true;

    const job = jobQueue.shift();
    const { url, id } = job;
    await ensureWorkspace(paths);
    const logPath = path.join(paths.logsDir, `${id}.log`);

    io.emit("job_start", { id, url });

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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await fsp.appendFile(logPath, `[desktop] Browser setup failed: ${message}\n`, "utf-8").catch(() => {});
      io.emit("job_error", { id, error: `Browser setup failed: ${message}`, logPath });
      isProcessing = false;
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
        WORKSPACE_DIR: workspaceRoot,
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
        videoPath = path.join(paths.rendersDir, renameMatch[1].trim());
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

    child.on("close", (code) => {
      if (code === 0) {
        if (!videoPath) {
          videoPath = findLatestMp4(paths.rendersDir);
        }

        const relativeVideoPath = videoPath ? `/renders/${path.basename(videoPath)}` : null;
        if (videoPath) {
          console.log(`[job_done] videoPath: ${videoPath} -> serving: ${relativeVideoPath}`);
        }
        io.emit("job_done", { id, videoPath: relativeVideoPath, logPath });
      } else {
        io.emit("job_error", { id, error: `Process exited with code ${code}`, logPath });
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

    const jobs = urls.map((url, index) => ({
      id: `${Date.now().toString(36)}-${index}`,
      url,
    }));

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
