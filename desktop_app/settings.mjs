import fs from "fs";
import fsp from "fs/promises";
import path from "path";

const APP_ENV_FILENAMES = [
  path.join("desktop_app", ".env"),
  path.join("desktop_app", "app.env"),
  ".env",
];

function quoteEnvValue(value) {
  return String(value ?? "").replace(/\r?\n/g, "");
}

export function parseDotEnv(text = "") {
  const env = {};

  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) env[key] = value;
  }

  return env;
}

async function loadEnvFile(filePath) {
  try {
    return parseDotEnv(await fsp.readFile(filePath, "utf-8"));
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

export async function loadWorkspaceEnv(workspaceRoot) {
  if (!workspaceRoot) return {};
  return await loadEnvFile(path.join(workspaceRoot, ".env"));
}

export async function loadAppBundledEnv(appRoot) {
  if (!appRoot) return {};

  for (const filename of APP_ENV_FILENAMES) {
    const filePath = path.join(appRoot, filename);
    if (fs.existsSync(filePath)) {
      return await loadEnvFile(filePath);
    }
  }

  return {};
}

export async function saveWorkspaceEnv(workspaceRoot, values = {}) {
  const lines = [];
  const entries = [
    ["OPENAI_API_KEY", values.openaiApiKey],
    ["OPENROUTER_API_KEY", values.openrouterApiKey],
    ["TROLLLLM_API_KEY", values.trollllmApiKey],
    ["TAVILY_API_KEY", values.tavilyApiKey],
  ];

  for (const [key, value] of entries) {
    if (value) lines.push(`${key}=${quoteEnvValue(value)}`);
  }

  await fsp.mkdir(workspaceRoot, { recursive: true });
  await fsp.writeFile(path.join(workspaceRoot, ".env"), `${lines.join("\n")}\n`, "utf-8");
}

export function buildRuntimeEnv(options = {}) {
  return {
    ...(options.baseEnv ?? process.env),
    ...(options.appEnv ?? {}),
    ...(options.workspaceEnv ?? {}),
  };
}

export function hasAiApiKey(env = process.env) {
  return Boolean(env.OPENAI_API_KEY || env.OPENROUTER_API_KEY || env.TROLLLLM_API_KEY);
}
