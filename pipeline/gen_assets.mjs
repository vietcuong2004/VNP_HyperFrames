import fsp from "fs/promises";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const SPEECH_SPEED = 1.18;
const TEXT_DURATION_FACTOR = 0.85;
const DEFAULT_VOICE = "vi-VN-NamMinhNeural";

export function formatError(error) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error === undefined || error === null) return "Unknown error";
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runWithRetries(operation, options = {}) {
  const attempts = options.attempts ?? 3;
  const delayMs = options.delayMs ?? 1500;
  const label = options.label ?? "operation";
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        console.warn(`Warning: ${label} failed on attempt ${attempt}/${attempts}, retrying... (${formatError(error)})`);
        await sleep(delayMs);
      }
    }
  }

  throw new Error(`${label} failed after ${attempts} attempts: ${formatError(lastError)}`);
}

function toPosixPath(value) {
  return value.replace(/\\/g, "/");
}

function roundTime(value) {
  return Math.round(value * 100) / 100;
}

export function buildTranscript(text, audioStart, sceneDuration) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const effectiveTextDuration = sceneDuration * TEXT_DURATION_FACTOR;
  const timePerWord = effectiveTextDuration / words.length;
  let wordStart = audioStart;

  return words.map((word) => {
    const item = {
      text: word,
      start: roundTime(wordStart),
      end: roundTime(wordStart + timePerWord),
    };
    wordStart += timePerWord;
    return item;
  });
}

export async function generateEdgeTts(text, outputPath, options = {}) {
  const { EdgeTTS } = await import("node-edge-tts");
  await fsp.mkdir(path.dirname(outputPath), { recursive: true });
  const tts = new EdgeTTS({
    voice: options.voice ?? DEFAULT_VOICE,
    lang: "vi-VN",
    outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    timeout: options.timeout ?? 60000,
  });
  await tts.ttsPromise(text, outputPath);
}

function getRuntimeBinary(name) {
  if (name === "ffmpeg") return process.env.FFMPEG_PATH || "ffmpeg";
  if (name === "ffprobe") return process.env.FFPROBE_PATH || "ffprobe";
  return name;
}

export function runFfmpeg(args, label) {
  const result = spawnSync(getRuntimeBinary("ffmpeg"), args, {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed: ${result.stderr || result.stdout}`);
  }
}

export function runFfprobe(args) {
  const result = spawnSync(getRuntimeBinary("ffprobe"), args, {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffprobe failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

export async function speedUpAudio(filePath, speed = SPEECH_SPEED) {
  if (speed <= 1) return;
  const parsed = path.parse(filePath);
  const tempPath = path.join(parsed.dir, `${parsed.name}.tmp${parsed.ext}`);

  runFfmpeg(
    ["-y", "-i", filePath, "-filter:a", `atempo=${speed}`, "-vn", tempPath],
    "ffmpeg atempo",
  );

  // Use copyFile + unlink instead of rename to avoid EPERM on Windows
  // (ffmpeg output may still be locked briefly by OS/antivirus)
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await fsp.copyFile(tempPath, filePath);
      await fsp.unlink(tempPath);
      return;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await sleep(300 * attempt); // 300ms, 600ms, 900ms...
    }
  }
}

export async function getAudioDuration(filePath) {
  let output = "";
  try {
    output = runFfprobe([
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
  } catch {
    const result = spawnSync(getRuntimeBinary("ffmpeg"), ["-i", filePath], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const durationMatch = `${result.stdout || ""}\n${result.stderr || ""}`.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (durationMatch) {
      const [, hours, minutes, seconds] = durationMatch;
      output = String(Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds));
    }
  }
  const duration = Number.parseFloat(output);
  if (!Number.isFinite(duration)) {
    throw new Error(`Could not read audio duration for ${filePath}`);
  }
  return duration;
}

export async function addGeneratedAssets(data, options) {
  const audioDir = options.audioDir;
  const filePrefix = options.filePrefix;
  const generateAudio = options.generateAudio ?? generateEdgeTts;
  const speedAudio = options.speedUpAudio ?? speedUpAudio;
  const readDuration = options.getAudioDuration ?? getAudioDuration;
  const pauseBetweenScenes = options.pauseBetweenScenes ?? 1.2;
  const audioExtension = options.audioExtension ?? "mp3";
  const relativeAudioDir = options.relativeAudioDir ?? "assets/audio";

  await fsp.mkdir(audioDir, { recursive: true });

  let currentStartTime = 0.5;

  for (const [index, scene] of data.scenes.entries()) {
    const sceneNumber = index + 1;
    const text = scene.voice;
    const audioFilename = `${filePrefix}_scene_${sceneNumber}.${audioExtension}`;
    const audioPath = path.join(audioDir, audioFilename);

    console.log(`Generating TTS for scene ${sceneNumber}...`);
    await runWithRetries(() => generateAudio(text, audioPath), {
      attempts: options.ttsAttempts ?? 3,
      delayMs: options.ttsRetryDelayMs ?? 2000,
      label: `TTS scene ${sceneNumber}`,
    });
    await speedAudio(audioPath, SPEECH_SPEED);

    const sceneDuration = await readDuration(audioPath);
    console.log(`  Exact duration: ${sceneDuration}s`);

    scene.audio_start = roundTime(currentStartTime);
    scene.audio_duration = roundTime(sceneDuration);
    scene.audio_path = toPosixPath(path.join(relativeAudioDir, audioFilename));
    scene.transcript = buildTranscript(text, scene.audio_start, sceneDuration);

    currentStartTime += sceneDuration + pauseBetweenScenes;
  }

  data.duration = Math.trunc(currentStartTime) + 2;
  return data;
}

export async function generateAssetsForJson(jsonPath, options = {}) {
  const dataRaw = await fsp.readFile(jsonPath, "utf-8");
  const data = JSON.parse(dataRaw);
  const filePrefix = options.filePrefix ?? path.basename(jsonPath, ".json");
  const workspaceDir = options.workspaceDir ?? process.env.WORKSPACE_DIR ?? process.cwd();
  const audioDir = options.audioDir ?? path.join(workspaceDir, "assets", "audio");

  const updatedData = await addGeneratedAssets(data, {
    audioDir,
    filePrefix,
    relativeAudioDir: options.relativeAudioDir,
  });

  await fsp.writeFile(jsonPath, JSON.stringify(updatedData, null, 2), "utf-8");
  console.log(`Done! Total duration: ${updatedData.duration}s`);
}

const __filename = fileURLToPath(import.meta.url);
const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isCli) {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error("Usage: node gen_assets.mjs <json_path>");
    process.exit(1);
  }

  generateAssetsForJson(jsonPath).catch((error) => {
    console.error("Asset generation failed:", formatError(error));
    if (error?.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}
