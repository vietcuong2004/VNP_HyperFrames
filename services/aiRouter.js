import OpenAI from 'openai';

/**
 * Gọi AI (chỉ dùng CUSTOM_API_BASE_URL và CUSTOM_API_KEY cho tất cả tác vụ)
 * @param {{ prompt: string, isJson?: boolean, keys?: any, onLog?: (msg: string) => void, maxTokens?: number }} options
 * @returns {Promise<{ result: string | any }>}
 */
export async function callAI({ prompt, isJson = false, keys = {}, onLog, maxTokens }) {
  const baseURL = process.env.CUSTOM_API_BASE_URL || 'https://chat.trollllm.xyz/v1';
  const apiKey = process.env.CUSTOM_API_KEY || 'sk-trollllm-80d35366ed8607e53c4f7797f3af88b9eb8ef8779f61f0aac0c4aaee62886f7c';
  const model = 'claude-sonnet-4-6';

  const client = new OpenAI({
    apiKey,
    baseURL,
    dangerouslyAllowBrowser: true
  });

  const messages = [
    {
      role: 'system',
      content: isJson
        ? 'You are a helpful assistant that outputs only valid JSON.'
        : 'You are a professional designer and developer specializing in GSAP animations.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const currentMaxTokens = maxTokens || keys?.max_tokens || 2000;

  const options = {
    model,
    messages,
    temperature: 0.2,
    max_tokens: currentMaxTokens,
  };

  if (isJson) {
    options.response_format = { type: 'json_object' };
  }

  let lastError = null;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        onLog?.(`[AIRouter] Thử lại lần ${attempt}/${maxRetries} sau lỗi...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        onLog?.(`[AIRouter] Đang gọi model "${model}" qua custom API (isJson=${isJson})...`);
      }

      const completion = await client.chat.completions.create(options);
      const content = completion.choices[0]?.message?.content || '';

      if (isJson) {
        try {
          let cleanContent = content.trim();
          if (cleanContent.startsWith('```')) {
            const match = cleanContent.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
            if (match) {
              cleanContent = match[1].trim();
            }
          }
          const parsed = JSON.parse(cleanContent);
          return { result: parsed };
        } catch (err) {
          // Fallback: try to extract JSON
          try {
            const startIdx = content.indexOf('{');
            const endIdx = content.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
              const parsed = JSON.parse(content.slice(startIdx, endIdx + 1));
              return { result: parsed };
            }
          } catch (e) {}
          throw new Error('Lỗi parse JSON phản hồi từ AI');
        }
      }

      return { result: content };
    } catch (error) {
      lastError = error;
      onLog?.(`[AIRouter] Lỗi lần thử ${attempt}: ${error.message}`);
    }
  }

  throw lastError || new Error('Tất cả các lần thử gọi AI đều thất bại.');
}
