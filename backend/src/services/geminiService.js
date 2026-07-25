const env = require('../config/env');

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const FALLBACK_MODELS = [
  env.gemini.imageModel,
  'gemini-2.5-flash-image',
].filter(Boolean);

function parseDataUri(dataUri) {
  if (!dataUri || typeof dataUri !== 'string') return null;
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function parseError(response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    return json.error?.message || json.message || text;
  } catch {
    return text;
  }
}

function extractImageFromResponse(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const inline = part.inlineData || part.inline_data;
    if (inline?.data) {
      return {
        base64: inline.data,
        mime: inline.mimeType || inline.mime_type || 'image/png',
      };
    }
  }
  throw new Error('Gemini returned no image in response');
}

/**
 * Generate image with Google Gemini (free tier at aistudio.google.com).
 * Supports optional 3D reference image for exterior renders.
 */
async function generateImage({
  prompt,
  referenceImage,
  referenceImages = [],
  aspectRatio = '16:9',
  model,
}) {
  if (!env.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const refs = [...referenceImages];
  if (referenceImage && !refs.includes(referenceImage)) refs.unshift(referenceImage);

  const parts = [{ text: prompt }];
  for (const refUri of refs.slice(0, 1)) {
    const ref = parseDataUri(refUri);
    if (ref) {
      parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
    }
  }

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio },
    },
  };

  const models = model ? [model] : [...new Set(FALLBACK_MODELS)];
  let lastError = null;

  for (const modelId of models) {
    try {
      const response = await fetch(
        `${GEMINI_BASE}/models/${modelId}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': env.gemini.apiKey,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(120_000),
        },
      );

      if (!response.ok) {
        const errText = await parseError(response);
        const hint = response.status === 429
          ? ' — Gemini image quota exceeded. Create a new key at aistudio.google.com/apikey (AIza...) or enable billing in Google AI Studio.'
          : response.status === 400 || response.status === 401
            ? ' — Invalid GEMINI_API_KEY. Get a key at aistudio.google.com/apikey (should start with AIza).'
            : '';
        lastError = new Error(`Gemini ${modelId} (${response.status}): ${errText}${hint}`);
        console.warn(`Gemini model ${modelId} failed:`, errText);
        continue;
      }

      const data = await response.json();
      const image = extractImageFromResponse(data);
      return { ...image, model: modelId };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Gemini image generation failed');
}

function toDataUri(base64, mime = 'image/png') {
  return `data:${mime};base64,${base64}`;
}

module.exports = {
  generateImage,
  toDataUri,
};
