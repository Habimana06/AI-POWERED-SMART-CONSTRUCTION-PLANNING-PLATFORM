const env = require('../config/env');

const XAI_BASE = 'https://api.x.ai/v1';

async function parseError(response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    return json.error?.message || json.message || text;
  } catch {
    return text;
  }
}

/**
 * Generate image from text prompt via Grok Imagine.
 */
async function generateImage({
  prompt,
  model,
  aspectRatio = '16:9',
  resolution = '1k',
  responseFormat = 'b64_json',
}) {
  if (!env.xai.apiKey) {
    throw new Error('XAI_API_KEY is not configured');
  }

  const response = await fetch(`${XAI_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.xai.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || env.xai.imageModel,
      prompt,
      aspect_ratio: aspectRatio,
      resolution,
      response_format: responseFormat,
    }),
  });

  if (!response.ok) {
    throw new Error(`xAI generate (${response.status}): ${await parseError(response)}`);
  }

  const data = await response.json();
  const item = data.data?.[0];
  if (!item) throw new Error('xAI returned no image data');

  return {
    base64: item.b64_json || null,
    url: item.url || null,
    model: data.model || model || env.xai.imageModel,
  };
}

/**
 * Photorealistic edit from 3D blueprint reference + strict prompt.
 */
async function editImage({
  prompt,
  imageDataUri,
  model,
  responseFormat = 'b64_json',
}) {
  if (!env.xai.apiKey) {
    throw new Error('XAI_API_KEY is not configured');
  }
  if (!imageDataUri) {
    throw new Error('Reference image is required for edit');
  }

  const response = await fetch(`${XAI_BASE}/images/edits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.xai.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || env.xai.imageModel,
      prompt,
      response_format: responseFormat,
      image: {
        url: imageDataUri,
        type: 'image_url',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`xAI edit (${response.status}): ${await parseError(response)}`);
  }

  const data = await response.json();
  const item = data.data?.[0];
  if (!item) throw new Error('xAI edit returned no image data');

  return {
    base64: item.b64_json || null,
    url: item.url || null,
    model: data.model || model || env.xai.imageModel,
  };
}

function toDataUri(base64, url) {
  if (base64) return `data:image/png;base64,${base64}`;
  return url;
}

module.exports = {
  generateImage,
  editImage,
  toDataUri,
};
