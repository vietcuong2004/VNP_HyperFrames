import OpenAI from "openai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const TROLLLLM_BASE_URL = "https://chat.trollllm.xyz/v1";
const OPENAI_MODEL = "gpt-4o-mini";
const OPENROUTER_MODEL = "openai/gpt-4o-mini";
const TROLLLLM_MODEL = "claude-sonnet-4-6";

function clean(value) {
  return String(value || "").trim();
}

export function buildAiProviders(env = process.env) {
  const providers = [];
  const openaiKey = clean(env.OPENAI_API_KEY);
  const openrouterKey = clean(env.OPENROUTER_API_KEY);
  const trollllmKey = clean(env.TROLLLLM_API_KEY);

  if (openaiKey) {
    providers.push({
      name: "openai",
      apiKey: openaiKey,
      baseURL: env.OPENAI_BASE_URL || undefined,
      model: env.OPENAI_MODEL || OPENAI_MODEL,
    });
  }

  if (openrouterKey) {
    providers.push({
      name: "openrouter",
      apiKey: openrouterKey,
      baseURL: env.OPENROUTER_BASE_URL || OPENROUTER_BASE_URL,
      model: env.OPENROUTER_MODEL || OPENROUTER_MODEL,
    });
  }

  if (trollllmKey) {
    providers.push({
      name: "trollllm",
      apiKey: trollllmKey,
      baseURL: env.TROLLLLM_BASE_URL || TROLLLLM_BASE_URL,
      model: env.TROLLLLM_MODEL || TROLLLLM_MODEL,
    });
  }

  return providers;
}

export function isFallbackableAiError(error) {
  const status = Number(error?.status || error?.code || error?.response?.status);
  if ([401, 402, 403, 408, 409, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  const message = String(error?.message || error || "").toLowerCase();
  return [
    "quota",
    "rate limit",
    "rate_limit",
    "insufficient",
    "credit",
    "credits",
    "billing",
    "unauthorized",
    "forbidden",
    "timeout",
    "temporarily",
    "overloaded",
  ].some((needle) => message.includes(needle));
}

export function parseAiJsonContent(content) {
  const raw = String(content || "").trim();
  if (!raw) throw new Error("AI trả về nội dung rỗng.");

  const fencedMatch = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const withoutFence = fencedMatch ? fencedMatch[1].trim() : raw;

  try {
    return JSON.parse(withoutFence);
  } catch (firstError) {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start !== -1 && end > start) {
      const candidate = withoutFence.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        // Keep the original parse error; it points at the exact malformed content.
      }
    }
    throw firstError;
  }
}

export async function createChatCompletionWithFallback({
  providers = buildAiProviders(),
  request,
  clientFactory = (provider) => new OpenAI({ apiKey: provider.apiKey, baseURL: provider.baseURL }),
  onFallback,
} = {}) {
  if (!providers.length) {
    throw new Error("Không tìm thấy OPENAI_API_KEY, OPENROUTER_API_KEY hoặc TROLLLLM_API_KEY trong cấu hình .env để chạy luồng sinh kịch bản AI.");
  }

  let lastError = null;
  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    const client = clientFactory(provider);
    try {
      const result = await client.chat.completions.create({
        ...request,
        model: request.model || provider.model,
      });
      return { result, provider };
    } catch (error) {
      lastError = error;
      const canFallback = index < providers.length - 1 && isFallbackableAiError(error);
      if (!canFallback) throw error;
      onFallback?.({ from: provider, to: providers[index + 1], error });
    }
  }

  throw lastError;
}
