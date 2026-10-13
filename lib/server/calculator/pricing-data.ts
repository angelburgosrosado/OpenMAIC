export interface ModelPricing {
  id: string;
  name: string;
  provider: string;
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion?: number;
  cacheWritePerMillion?: number;
  reasoningPerMillion?: number;
  contextWindow: number;
  recommendedRole?: 'flagship' | 'fast' | 'economy' | 'reasoning';
}

export const LLM_MODELS_PRICING: Record<string, ModelPricing> = {
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'OpenAI GPT-4o',
    provider: 'OpenAI',
    inputPerMillion: 2.5,
    outputPerMillion: 10.0,
    cacheReadPerMillion: 1.25,
    contextWindow: 128_000,
    recommendedRole: 'flagship',
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'OpenAI GPT-4o mini',
    provider: 'OpenAI',
    inputPerMillion: 0.15,
    outputPerMillion: 0.6,
    cacheReadPerMillion: 0.075,
    contextWindow: 128_000,
    recommendedRole: 'fast',
  },
  'o3-mini': {
    id: 'o3-mini',
    name: 'OpenAI o3-mini',
    provider: 'OpenAI',
    inputPerMillion: 1.1,
    outputPerMillion: 4.4,
    reasoningPerMillion: 4.4,
    contextWindow: 200_000,
    recommendedRole: 'reasoning',
  },
  'claude-3-7-sonnet': {
    id: 'claude-3-7-sonnet',
    name: 'Anthropic Claude 3.7 Sonnet',
    provider: 'Anthropic',
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
    cacheReadPerMillion: 0.3,
    cacheWritePerMillion: 3.75,
    contextWindow: 200_000,
    recommendedRole: 'flagship',
  },
  'claude-3-5-haiku': {
    id: 'claude-3-5-haiku',
    name: 'Anthropic Claude 3.5 Haiku',
    provider: 'Anthropic',
    inputPerMillion: 0.8,
    outputPerMillion: 4.0,
    cacheReadPerMillion: 0.08,
    contextWindow: 200_000,
    recommendedRole: 'fast',
  },
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    name: 'Google Gemini 2.5 Pro',
    provider: 'Google',
    inputPerMillion: 1.25,
    outputPerMillion: 5.0,
    cacheReadPerMillion: 0.3125,
    contextWindow: 1_000_000,
    recommendedRole: 'flagship',
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Google Gemini 2.5 Flash',
    provider: 'Google',
    inputPerMillion: 0.075,
    outputPerMillion: 0.3,
    cacheReadPerMillion: 0.01875,
    contextWindow: 1_000_000,
    recommendedRole: 'fast',
  },
  'deepseek-v3': {
    id: 'deepseek-v3',
    name: 'DeepSeek-V3',
    provider: 'DeepSeek',
    inputPerMillion: 0.14,
    outputPerMillion: 0.28,
    cacheReadPerMillion: 0.014,
    contextWindow: 64_000,
    recommendedRole: 'economy',
  },
  'deepseek-r1': {
    id: 'deepseek-r1',
    name: 'DeepSeek-R1 (Reasoning)',
    provider: 'DeepSeek',
    inputPerMillion: 0.55,
    outputPerMillion: 2.19,
    cacheReadPerMillion: 0.14,
    contextWindow: 64_000,
    recommendedRole: 'reasoning',
  },
  'groq-llama-3.3-70b': {
    id: 'groq-llama-3.3-70b',
    name: 'Llama 3.3 70B (Groq LPU)',
    provider: 'Groq',
    inputPerMillion: 0.59,
    outputPerMillion: 0.79,
    contextWindow: 128_000,
    recommendedRole: 'fast',
  },
  'minimax-abab6.5s': {
    id: 'minimax-abab6.5s',
    name: 'MiniMax abab6.5s',
    provider: 'MiniMax',
    inputPerMillion: 0.5,
    outputPerMillion: 1.0,
    contextWindow: 245_000,
    recommendedRole: 'economy',
  },
};

export interface AudioTTSPricing {
  id: string;
  name: string;
  provider: string;
  costPerMillionChars: number;
}

export const TTS_PRICING: Record<string, AudioTTSPricing> = {
  'edge-tts': {
    id: 'edge-tts',
    name: 'Microsoft Edge TTS (Free standard)',
    provider: 'Edge',
    costPerMillionChars: 0.0,
  },
  'openai-tts': {
    id: 'openai-tts',
    name: 'OpenAI TTS (Standard)',
    provider: 'OpenAI',
    costPerMillionChars: 15.0,
  },
  'openai-tts-hd': {
    id: 'openai-tts-hd',
    name: 'OpenAI TTS HD',
    provider: 'OpenAI',
    costPerMillionChars: 30.0,
  },
  'elevenlabs-multilingual': {
    id: 'elevenlabs-multilingual',
    name: 'ElevenLabs Multilingual v2',
    provider: 'ElevenLabs',
    costPerMillionChars: 180.0,
  },
  'azure-neural': {
    id: 'azure-neural',
    name: 'Azure Cognitive Neural Voice',
    provider: 'Azure',
    costPerMillionChars: 16.0,
  },
  'minimax-speech': {
    id: 'minimax-speech',
    name: 'MiniMax Speech-01 HD',
    provider: 'MiniMax',
    costPerMillionChars: 35.0,
  },
};

export interface ImagePricing {
  id: string;
  name: string;
  provider: string;
  costPerImage: number;
}

export const IMAGE_PRICING: Record<string, ImagePricing> = {
  'flux-schnell': {
    id: 'flux-schnell',
    name: 'FLUX.1 [schnell] (Fast)',
    provider: 'Black Forest Labs',
    costPerImage: 0.003,
  },
  'flux-dev': {
    id: 'flux-dev',
    name: 'FLUX.1 [dev] (Detailed)',
    provider: 'Black Forest Labs',
    costPerImage: 0.025,
  },
  'flux-pro': {
    id: 'flux-pro',
    name: 'FLUX 1.1 [pro] (Ultra HD)',
    provider: 'Black Forest Labs',
    costPerImage: 0.04,
  },
  'dall-e-3': {
    id: 'dall-e-3',
    name: 'OpenAI DALL-E 3 (1024x1024)',
    provider: 'OpenAI',
    costPerImage: 0.04,
  },
  'dall-e-3-hd': {
    id: 'dall-e-3-hd',
    name: 'OpenAI DALL-E 3 HD (1792x1024)',
    provider: 'OpenAI',
    costPerImage: 0.08,
  },
};

export interface VideoPricing {
  id: string;
  name: string;
  costPerSecond: number;
}

export const VIDEO_PRICING: Record<string, VideoPricing> = {
  'video-render-local': {
    id: 'video-render-local',
    name: 'OpenMAIC Native Canvas 1080p Compositor',
    costPerSecond: 0.001,
  },
  'hailuo-video': {
    id: 'hailuo-video',
    name: 'MiniMax Hailuo AI Video',
    costPerSecond: 0.05,
  },
  'luma-dream-machine': {
    id: 'luma-dream-machine',
    name: 'Luma Dream Machine HD',
    costPerSecond: 0.08,
  },
};

export const OTHER_PRICING = {
  webSearchPer1kQueries: 5.0, // ~$0.005 per search (Tavily/Brave)
  asrPerMinute: 0.006, // Deepgram Nova-3 / Whisper
  pdfParsePer1kPages: 2.0, // DocMind / OCR
};
