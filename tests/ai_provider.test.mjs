import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildAiProviders,
  isFallbackableAiError,
  createChatCompletionWithFallback,
} from "../pipeline/ai_provider.mjs";

test("buildAiProviders adds TROLLLLM as OpenRouter-compatible fallback after OPENROUTER", () => {
  const providers = buildAiProviders({
    OPENROUTER_API_KEY: "sk-or-primary",
    TROLLLLM_API_KEY: "sk-or-backup",
  });

  assert.deepEqual(
    providers.map((provider) => ({
      name: provider.name,
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
      model: provider.model,
    })),
    [
      {
        name: "openrouter",
        apiKey: "sk-or-primary",
        baseURL: "https://openrouter.ai/api/v1",
        model: "openai/gpt-4o-mini",
      },
      {
        name: "trollllm",
        apiKey: "sk-or-backup",
        baseURL: "https://openrouter.ai/api/v1",
        model: "openai/gpt-4o-mini",
      },
    ],
  );
});

test("isFallbackableAiError only retries quota, auth, and rate failures", () => {
  assert.equal(isFallbackableAiError({ status: 429 }), true);
  assert.equal(isFallbackableAiError({ status: 402 }), true);
  assert.equal(isFallbackableAiError(new Error("insufficient credits")), true);
  assert.equal(isFallbackableAiError(new Error("schema invalid")), false);
});

test("createChatCompletionWithFallback retries TROLLLLM when OpenRouter quota fails", async () => {
  const calls = [];
  const response = await createChatCompletionWithFallback({
    providers: buildAiProviders({
      OPENROUTER_API_KEY: "sk-or-primary",
      TROLLLLM_API_KEY: "sk-or-backup",
    }),
    request: {
      messages: [{ role: "user", content: "hello" }],
      response_format: { type: "json_object" },
    },
    clientFactory(provider) {
      return {
        chat: {
          completions: {
            async create(payload) {
              calls.push({ provider, payload });
              if (provider.name === "openrouter") {
                const error = new Error("quota exceeded");
                error.status = 429;
                throw error;
              }
              return { choices: [{ message: { content: "{\"ok\":true}" } }] };
            },
          },
        },
      };
    },
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].provider.name, "openrouter");
  assert.equal(calls[1].provider.name, "trollllm");
  assert.equal(calls[1].provider.apiKey, "sk-or-backup");
  assert.equal(response.provider.name, "trollllm");
  assert.equal(response.result.choices[0].message.content, "{\"ok\":true}");
});
