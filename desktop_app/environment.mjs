import fsp from "fs/promises";
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";

const isWindows = process.platform === "win32";

export function commandExists(name) {
  const command = isWindows ? "where.exe" : "which";
  return new Promise((resolve) => {
    const child = spawn(command, [name], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export async function canWriteWorkspace(workspaceRoot) {
  const target = path.join(workspaceRoot, `.write-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try {
    await fsp.mkdir(workspaceRoot, { recursive: true });
    await fsp.writeFile(target, "ok", "utf-8");
    await fsp.rm(target, { force: true });
    return true;
  } catch {
    return false;
  }
}

function fileExists(filePath) {
  return Boolean(filePath && fs.existsSync(filePath));
}

export async function inspectEnvironment(options = {}) {
  const checkCommand = options.commandExists ?? commandExists;
  const checkWorkspace = options.canWriteWorkspace ?? (() => canWriteWorkspace(options.workspaceRoot ?? process.cwd()));
  const env = options.env ?? process.env;
  const appRoot = options.appRoot ?? process.cwd();
  const hyperframesLocal = path.join(appRoot, "node_modules", ".bin", isWindows ? "hyperframes.cmd" : "hyperframes");
  const hasHyperframes = fs.existsSync(hyperframesLocal) || (await checkCommand(isWindows ? "hyperframes.cmd" : "hyperframes"));
  const hasSystemNode = await checkCommand("node");
  const hasSystemFfmpeg = await checkCommand("ffmpeg");
  const hasSystemFfprobe = await checkCommand("ffprobe");
  const hasBundledFfmpeg = fileExists(env.FFMPEG_PATH);
  const hasBundledFfprobe = fileExists(env.FFPROBE_PATH);

  const checks = [
    {
      id: "node",
      label: "Node.js",
      required: true,
      ok: Boolean(options.isPackaged) || hasSystemNode,
      source: options.isPackaged ? "bundled" : hasSystemNode ? "system" : "missing",
      fix: "Cài Node.js hoặc chạy app từ bản desktop đã bundle runtime.",
    },
    {
      id: "ffmpeg",
      label: "FFmpeg",
      required: true,
      ok: hasBundledFfmpeg || hasSystemFfmpeg,
      source: hasBundledFfmpeg ? "bundled" : hasSystemFfmpeg ? "system" : "missing",
      fix: "Cài FFmpeg và thêm vào PATH, hoặc dùng bản desktop đã bundle FFmpeg.",
    },
    {
      id: "ffprobe",
      label: "FFprobe",
      required: false,
      ok: hasBundledFfprobe || hasSystemFfprobe,
      source: hasBundledFfprobe ? "bundled" : hasSystemFfprobe ? "system" : "missing",
      fix: "Nên có FFprobe cùng FFmpeg để đọc duration chính xác hơn; app có fallback qua FFmpeg.",
    },
    {
      id: "hyperframes",
      label: "HyperFrames CLI",
      required: true,
      ok: hasHyperframes,
      fix: "Cài hyperframes local trong project.",
    },
    {
      id: "workspace",
      label: "Workspace writable",
      required: true,
      ok: await checkWorkspace(),
      fix: `Kiểm tra quyền ghi thư mục workspace (${os.platform()}).`,
    },
  ];

  return {
    ok: checks.every((check) => !check.required || check.ok),
    checks,
  };
}
