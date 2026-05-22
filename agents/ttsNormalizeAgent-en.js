// src/agents/ttsNormalizeAgent-en.js — English TTS normalize
// Khi output language = English, chuẩn hóa text cho TTS tiếng Anh
import { callAI } from '../services/aiRouter.js';

const TTS_NORMALIZE_EN_PROMPT = `You are a professional editor specializing in preparing text for English TTS narration.

TASK:
- Receive a list of video scenes with a "voice" field (the display version for subtitles).
- Create a "ttsVoice" field optimized for English TTS to read naturally.

GOALS:
- KEEP 100% of the original meaning.
- DO NOT add, remove, or rephrase content.
- ONLY fix parts that English TTS commonly mispronounces:
  - Numbers: spell out currency ($1.5M → one point five million dollars)
  - Abbreviations/acronyms: CEO → C.E.O., US → U.S., NATO → NATO (keep as-is if commonly spoken)
  - URLs, emails, @handles: spell out or simplify
  - Technical terms: add phonetic hints only if TTS would mispronounce
  - Dates: "4/27" → "April twenty-seventh"
  - Percentages: "50%" → "fifty percent"

RULES:
- "voice" is the subtitle display version — DO NOT modify it.
- "ttsVoice" is for reading — may spell out abbreviations, numbers.
- If a sentence already reads naturally in English TTS, keep it nearly identical.
- Prioritize natural spoken English, not robotic spelling.

EXAMPLE:
Input:
[
  {
    "stt": 1,
    "voice": "The S&P 500 dropped 3.2% today, marking its worst day since March 2024."
  }
]
Output:
[
  {
    "stt": 1,
    "ttsVoice": "The S and P 500 dropped three point two percent today, marking its worst day since March twenty twenty-four."
  }
]

Return a JSON ARRAY with this schema:
[
  {
    "stt": 1,
    "ttsVoice": "..."
  }
]

SCENES TO PROCESS:
{{SCENES_JSON}}
`;

function normalizeTTSResult(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.scenes)) return result.scenes;
  if (Array.isArray(result?.items)) return result.items;
  const firstArr = result && Object.values(result).find(v => Array.isArray(v));
  if (firstArr) return firstArr;
  throw new Error('TTS normalize result is not an array');
}

export async function normalizeTTSVoices_EN({ scenes, keys, onLog }) {
  if (!Array.isArray(scenes) || !scenes.length) return scenes;

  const inputScenes = scenes.map(sc => ({
    stt: sc.stt,
    voice: sc.voice,
  }));

  onLog?.(`Normalizing English TTS voices for ${scenes.length} scenes...`);
  const prompt = TTS_NORMALIZE_EN_PROMPT.replace('{{SCENES_JSON}}', JSON.stringify(inputScenes, null, 2));
  const { result } = await callAI({ prompt, isJson: true, keys, onLog });
  const normalized = normalizeTTSResult(result);
  const byStt = new Map(normalized.map(item => [Number(item.stt), String(item.ttsVoice || '').trim()]));

  return scenes.map(sc => {
    const ttsVoice = byStt.get(Number(sc.stt));
    return {
      ...sc,
      ttsVoice: ttsVoice || sc.voice,
    };
  });
}
// EOF: agents/ttsNormalizeAgent-en.js
