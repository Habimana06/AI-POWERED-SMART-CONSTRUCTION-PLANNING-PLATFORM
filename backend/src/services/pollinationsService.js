/**
 * Free Pollinations Flux fallback when Grok/xAI is unavailable or has no credits.
 */
function truncatePrompt(prompt, maxLen = 900) {
  if (!prompt || typeof prompt !== 'string') return '';
  const trimmed = prompt.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

function buildUrl(prompt, { width = 1280, height = 720, seed, model = 'flux' } = {}) {
  const safePrompt = truncatePrompt(prompt, 850);
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    model,
    nologo: 'true',
    seed: String(seed ?? Math.floor(Math.random() * 1_000_000)),
  });
  const token = process.env.POLLINATIONS_API_KEY || process.env.POLLINATIONS_TOKEN;
  if (token) params.set('token', token);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?${params.toString()}`;
}

function aspectToSize(aspectRatio = '16:9') {
  if (aspectRatio === '9:16') return { width: 720, height: 1280 };
  if (aspectRatio === '3:4') return { width: 960, height: 1280 };
  if (aspectRatio === '4:3') return { width: 1024, height: 768 };
  if (aspectRatio === '1:1') return { width: 1024, height: 1024 };
  return { width: 1280, height: 720 };
}

async function generateImage({ prompt, aspectRatio = '16:9', model = 'flux' }) {
  const size = aspectToSize(aspectRatio);
  const safePrompt = truncatePrompt(prompt, 900);
  const maxAttempts = 6;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const retrySize = attempt >= 4 ? { width: Math.round(size.width * 0.75), height: Math.round(size.height * 0.75) } : size;
      const url = buildUrl(safePrompt, { ...retrySize, model, seed: Math.floor(Math.random() * 1_000_000) });
      const response = await fetch(url, {
        signal: AbortSignal.timeout(120_000),
        headers: { 'User-Agent': 'BuildPlanAI/1.0' },
      });

      if (response.status === 429 && attempt < maxAttempts) {
        const waitMs = 25_000 * attempt;
        console.warn(`Pollinations ${model} rate limited (429), waiting ${waitMs / 1000}s (attempt ${attempt}/${maxAttempts})`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!response.ok) {
        throw new Error(`Pollinations ${model} failed (${response.status}${response.status === 429 ? ' — rate limit, wait 15s and retry' : ''})`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const base64 = buffer.toString('base64');
      const mime = response.headers.get('content-type') || 'image/jpeg';

      return { base64, url, mime };
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 5000 * attempt));
      }
    }
  }

  throw lastError || new Error(`Pollinations ${model} failed after retries`);
}

function toDataUri(base64, mime = 'image/jpeg') {
  return `data:${mime};base64,${base64}`;
}

module.exports = {
  generateImage,
  toDataUri,
  buildUrl,
  truncatePrompt,
};
