import OpenAI from 'openai';

let openRouterFreeQuotaExceeded = false;

/**
 * Gọi AI (OpenAI hoặc OpenRouter) với prompt và tùy chọn trả về JSON.
 * @param {{ prompt: string, isJson?: boolean, keys?: any, onLog?: (msg: string) => void }} options
 * @returns {Promise<{ result: string | any }>}
 */
export async function callAI({ prompt, isJson = false, keys = {}, onLog, maxTokens }) {
  const customBaseURL = keys?.customBaseURL || process.env.CUSTOM_API_BASE_URL;
  const openRouterKey = keys?.openRouterKey || process.env.OPENROUTER_API_KEY;
  const openAiKey = keys?.openAiKey || process.env.OPENAI_API_KEY;

  // Nếu có custom base URL, ưu tiên dùng nó
  let apiKey, baseURL, isOpenRouter = false, isCustomAPI = false;
  
  if (customBaseURL) {
    isCustomAPI = true;
    apiKey = keys?.customApiKey || process.env.CUSTOM_API_KEY || 'dummy-key';
    baseURL = customBaseURL;
  } else if (openRouterKey) {
    isOpenRouter = true;
    apiKey = openRouterKey;
    baseURL = 'https://openrouter.ai/api/v1';
  } else if (openAiKey) {
    apiKey = openAiKey;
    baseURL = undefined;
  } else {
    throw new Error('Thiếu API Key hoặc Custom Base URL. Vui lòng cấu hình OPENAI_API_KEY, OPENROUTER_API_KEY, hoặc CUSTOM_API_BASE_URL trong file .env.');
  }
  
  // Ưu tiên dùng model từ keys, sau đó đến mặc định
  let model = keys?.model;
  if (!model) {
    if (isCustomAPI) {
      model = 'claude-sonnet-4-6'; // Model mặc định cho TrollLLM
    } else if (isOpenRouter) {
      model = 'google/gemini-2.5-flash';
    } else {
      model = 'gpt-4o-mini';
    }
  }

  const client = new OpenAI({
    apiKey,
    baseURL,
    dangerouslyAllowBrowser: true // Cho phép chạy trực tiếp nếu gọi từ electron render process
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

  // Danh sách các model để thử. Nếu model đầu tiên (trả phí) lỗi credit/rate limit, ta sẽ thử các model miễn phí.
  const modelsToTry = [options.model];
  
  // Chỉ thử fallback models nếu dùng OpenRouter
  if (isOpenRouter && !openRouterFreeQuotaExceeded) {
    const FREE_MODELS = [
      'deepseek/deepseek-v4-flash:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen-2.5-72b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
      'microsoft/phi-3-medium-128k-instruct:free',
      'google/gemma-2-9b-it:free',
      'google/gemma-4-31b-it:free',
      'meta-llama/llama-3.2-3b-instruct:free',
      'meta-llama/llama-3.2-1b-instruct:free',
      'openrouter/free'
    ];
    FREE_MODELS.forEach(m => {
      if (!modelsToTry.includes(m)) {
        modelsToTry.push(m);
      }
    });
  }

  let lastError = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    const isFreeModel = currentModel.endsWith(':free') || currentModel === 'openrouter/free';
    
    // Skip model free nếu đã hết quota
    if (isOpenRouter && isFreeModel && openRouterFreeQuotaExceeded) {
      onLog?.(`[AIRouter] Bỏ qua model free "${currentModel}" vì đã hết hạn mức free-models-per-day.`);
      continue;
    }
    
    options.model = currentModel;

    // Giới hạn max_tokens hợp lý cho model free để tránh bị từ chối
    if (isFreeModel) {
      options.max_tokens = Math.min(options.max_tokens, 2000);
    }

    let retryCount = 0;
    const maxRetriesForRateLimit = 2;

    while (retryCount <= maxRetriesForRateLimit) {
      if (retryCount > 0) {
        const waitTime = Math.min(retryCount * 3, 10);
        onLog?.(`[AIRouter] Bị rate limit. Chờ ${waitTime}s và thử lại model "${currentModel}" (Lần thử lại ${retryCount}/${maxRetriesForRateLimit})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      } else {
        onLog?.(`[AIRouter] Đang gọi model "${currentModel}" (Lần thử ${i + 1}/${modelsToTry.length}, isJson=${isJson})...`);
      }

      try {
        const completion = await client.chat.completions.create(options);
        const content = completion.choices[0]?.message?.content || '';

        if (isJson) {
          try {
            let cleanContent = content.trim();
            // Remove markdown wrappers if any
            if (cleanContent.startsWith('```')) {
              const match = cleanContent.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
              if (match) {
                cleanContent = match[1].trim();
              }
            }
            const parsed = JSON.parse(cleanContent);
            return { result: parsed };
          } catch (err) {
            // Fallback: try to extract JSON object
            try {
              const startIdx = content.indexOf('{');
              const endIdx = content.lastIndexOf('}');
              if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                const possibleJson = content.slice(startIdx, endIdx + 1);
                const parsed = JSON.parse(possibleJson);
                return { result: parsed };
              }
            } catch (e) {}

            // Fallback: try to extract JSON array
            try {
              const startIdx = content.indexOf('[');
              const endIdx = content.lastIndexOf(']');
              if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                const possibleJson = content.slice(startIdx, endIdx + 1);
                const parsed = JSON.parse(possibleJson);
                return { result: parsed };
              }
            } catch (e) {}

            onLog?.(`[AIRouter] Lỗi parse JSON từ AI response. Đang trả về raw string...\n[AIRouter] Nội dung raw:\n${content}`);
            return { result: content };
          }
        }

        return { result: content };
      } catch (error) {
        lastError = error;
        
        const isPaymentError = error.status === 402 || 
          (error.message && (error.message.includes('credits') || error.message.includes('afford') || error.message.includes('402')));
        const isRateLimitError = error.status === 429 || 
          (error.message && (error.message.includes('rate-limited') || error.message.includes('rate limit') || error.message.includes('429') || error.message.includes('Too Many Requests')));
        const isNotFoundError = error.status === 404 || 
          (error.message && (error.message.includes('not found') || error.message.includes('No endpoints found') || error.message.includes('404')));

        onLog?.(`[AIRouter] Thất bại với model "${currentModel}". Lỗi: ${error.status || 'unknown'} - ${error.message}`);

        // Chỉ xử lý fallback logic cho OpenRouter
        if (isOpenRouter) {
          if (isRateLimitError && error.message && (error.message.includes('free-models-per-day') || error.message.includes('free-models'))) {
            openRouterFreeQuotaExceeded = true;
            onLog?.(`[AIRouter] Phát hiện hết hạn mức free-models-per-day của OpenRouter. Bỏ qua các model free trong tương lai.`);
            break; // Chuyển sang model tiếp theo ngay
          }

          if (isRateLimitError && retryCount < maxRetriesForRateLimit) {
            retryCount++;
            continue; // Thử lại với cùng model
          }

          // Nếu đã hết retry hoặc gặp lỗi khác, chuyển sang model tiếp theo
          if (isPaymentError || isRateLimitError || isNotFoundError) {
            if (i < modelsToTry.length - 1) {
              onLog?.(`[AIRouter] Chuyển sang model dự phòng tiếp theo...`);
              await new Promise(resolve => setTimeout(resolve, 3000));
              break;
            }
          }
        }

        // Nếu không phải OpenRouter hoặc không có model dự phòng, throw error
        if (i === modelsToTry.length - 1) {
          throw error;
        }
        break; // Chuyển sang model tiếp theo
      }
    }
  }

  throw lastError || new Error('Tất cả các model gọi AI đều thất bại.');
}

