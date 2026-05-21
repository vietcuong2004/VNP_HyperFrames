import path from "path";

export function createNodeScriptCommand(options) {
  const scriptPath = options.scriptPath;
  const args = options.args ?? [];
  const isPackaged = Boolean(options.isPackaged);

  if (isPackaged) {
    return {
      command: options.bundledNodePath ?? options.nodePath ?? process.execPath,
      args: [scriptPath, ...args],
      env: {},
    };
  }

  return {
    command: options.nodePath ?? process.execPath,
    args: [scriptPath, ...args],
    env: {},
  };
}

export function createNodePackageBinCommand(options) {
  const appRoot = options.appRoot ?? process.cwd();
  return {
    command: options.nodePath ?? process.execPath,
    args: [
      path.join(appRoot, "node_modules", options.packageName, options.binRelativePath),
      ...(options.args ?? []),
    ],
    env: {},
  };
}

export function buildBundledBinaryEnv(options = {}) {
  const baseEnv = { ...(options.baseEnv ?? process.env) };
  const delimiter = options.delimiter ?? path.delimiter;
  const binaryDirs = [];

  if (options.nodePath && path.isAbsolute(options.nodePath)) {
    binaryDirs.push(path.dirname(options.nodePath));
  }

  if (options.ffmpegPath) {
    baseEnv.FFMPEG_PATH = options.ffmpegPath;
    binaryDirs.push(path.dirname(options.ffmpegPath));
  }

  if (options.ffprobePath) {
    baseEnv.FFPROBE_PATH = options.ffprobePath;
    binaryDirs.push(path.dirname(options.ffprobePath));
  }

  const existingPath = baseEnv.PATH || baseEnv.Path || "";
  const uniqueDirs = [...new Set(binaryDirs.filter(Boolean))];
  baseEnv.PATH = [...uniqueDirs, existingPath].filter(Boolean).join(delimiter);
  if (baseEnv.Path !== undefined) {
    baseEnv.Path = baseEnv.PATH;
  }

  return baseEnv;
}

export async function resolveBundledBinaryPaths(options = {}) {
  const appRoot = options.appRoot ?? process.cwd();
  const result = {
    nodePath: null,
    ffmpegPath: null,
    ffprobePath: null,
  };

  const nodePath = path.join(appRoot, "node_modules", "node", "bin", process.platform === "win32" ? "node.exe" : "node");
  result.nodePath = nodePath;

  try {
    const ffmpegModule = await import("ffmpeg-static");
    result.ffmpegPath = ffmpegModule.default || ffmpegModule.path || null;
  } catch {
    result.ffmpegPath = null;
  }

  try {
    const ffprobeModule = await import("ffprobe-static");
    result.ffprobePath = ffprobeModule.default?.path || ffprobeModule.path || null;
  } catch {
    result.ffprobePath = null;
  }

  return result;
}
