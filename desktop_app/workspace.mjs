import fs from "fs";
import fsp from "fs/promises";
import path from "path";

export function createWorkspacePaths({ appRoot = process.cwd(), workspaceRoot = process.cwd() } = {}) {
  const resolvedAppRoot = path.resolve(appRoot);
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);

  return {
    appRoot: resolvedAppRoot,
    workspaceRoot: resolvedWorkspaceRoot,
    publicDir: path.join(resolvedAppRoot, "public"),
    templatesDir: path.join(resolvedAppRoot, "templates"),
    compositionsDir: path.join(resolvedAppRoot, "compositions"),
    sourceAssetsDir: path.join(resolvedAppRoot, "assets"),
    dataDir: path.join(resolvedWorkspaceRoot, "data"),
    audioDir: path.join(resolvedWorkspaceRoot, "assets", "audio"),
    imageDir: path.join(resolvedWorkspaceRoot, "assets", "images"),
    workspaceAssetsDir: path.join(resolvedWorkspaceRoot, "assets"),
    vendorDir: path.join(resolvedWorkspaceRoot, "vendor"),
    rendersDir: path.join(resolvedWorkspaceRoot, "renders"),
    logsDir: path.join(resolvedWorkspaceRoot, "logs"),
    compositionPath: path.join(resolvedWorkspaceRoot, "index.html"),
    hyperframesConfigPath: path.join(resolvedWorkspaceRoot, "hyperframes.json"),
    metaPath: path.join(resolvedWorkspaceRoot, "meta.json"),
  };
}

export async function ensureWorkspace(paths) {
  const dirs = [
    paths.dataDir,
    paths.audioDir,
    paths.imageDir,
    paths.vendorDir,
    paths.rendersDir,
    paths.logsDir,
  ];

  await Promise.all(
    dirs.map(async (dir) => {
      if (!dir) return;
      try {
        const stat = await fsp.stat(dir).catch(() => fsp.lstat(dir));
        if (stat.isDirectory() || stat.isSymbolicLink()) {
          return;
        }
      } catch (err) {}
      await fsp.mkdir(dir, { recursive: true });
    })
  );
}

async function copyFileIfChanged(source, target) {
  let realSource, realTarget;
  try {
    realSource = fs.realpathSync(source);
  } catch (e) {
    realSource = path.resolve(source);
  }
  try {
    realTarget = fs.realpathSync(target);
  } catch (e) {
    realTarget = path.resolve(target);
  }
  if (realSource === realTarget) return;

  const [sourceStat, targetStat] = await Promise.all([
    fsp.stat(source),
    fsp.stat(target).catch(() => null),
  ]);

  if (targetStat && targetStat.size === sourceStat.size && targetStat.mtimeMs >= sourceStat.mtimeMs) {
    return;
  }

  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.copyFile(source, target);
}

async function copyDirectoryIfExists(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) return;
  
  let realSource, realTarget;
  try {
    realSource = fs.realpathSync(sourceDir);
  } catch (e) {
    realSource = path.resolve(sourceDir);
  }
  try {
    realTarget = fs.realpathSync(targetDir);
  } catch (e) {
    realTarget = path.resolve(targetDir);
  }
  if (realSource === realTarget) return;

  await fsp.cp(sourceDir, targetDir, {
    recursive: true,
    force: true,
    errorOnExist: false,
  });
}

export async function prepareWorkspaceRuntime(paths) {
  await ensureWorkspace(paths);

  await Promise.all([
    copyDirectoryIfExists(path.join(paths.sourceAssetsDir, "character"), path.join(paths.workspaceAssetsDir, "character")),
    copyDirectoryIfExists(path.join(paths.sourceAssetsDir, "background-music"), path.join(paths.workspaceAssetsDir, "background-music")),
    copyDirectoryIfExists(path.join(paths.sourceAssetsDir, "sound-effect"), path.join(paths.workspaceAssetsDir, "sound-effect")),
    copyDirectoryIfExists(path.join(paths.sourceAssetsDir, "logo"), path.join(paths.workspaceAssetsDir, "logo")),
    copyDirectoryIfExists(paths.compositionsDir, path.join(paths.workspaceRoot, "compositions")),
  ]);

  const gsapSource = path.join(paths.appRoot, "node_modules", "gsap", "dist", "gsap.min.js");
  if (fs.existsSync(gsapSource)) {
    await copyFileIfChanged(gsapSource, path.join(paths.vendorDir, "gsap.min.js"));
  }

  const configCopies = [
    ["hyperframes.json", paths.hyperframesConfigPath],
    ["meta.json", paths.metaPath],
  ];

  for (const [filename, target] of configCopies) {
    const source = path.join(paths.appRoot, filename);
    if (fs.existsSync(source)) {
      await copyFileIfChanged(source, target);
    }
  }
}
