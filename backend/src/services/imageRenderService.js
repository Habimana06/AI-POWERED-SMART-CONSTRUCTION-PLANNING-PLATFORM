const env = require('../config/env');
const geminiService = require('./geminiService');
const pollinationsService = require('./pollinationsService');
const xaiService = require('./xaiService');
const {
  buildDesignGeometrySpec,
  buildGeometryLockedPrompt,
  buildTextOnlyAccuratePrompt,
} = require('../utils/designSpec');

const PROVIDER_LABELS = {
  gemini: 'Gemini (free)',
  'pollinations-flux': 'Flux (free)',
  'pollinations-turbo': 'Turbo (free)',
  grok: 'Grok Imagine (paid)',
};

/** Skip Gemini until this timestamp after quota/rate-limit errors. */
let geminiCooldownUntil = 0;

function isXaiBillingError(message = '') {
  return /403|permission-denied|doesn't have any credits|no credits|licenses yet/i.test(message);
}

function isGeminiQuotaError(message = '') {
  return /429|quota exceeded|rate.limit|free_tier|limit:\s*0/i.test(message);
}

function isGeminiAvailable() {
  if (!env.gemini.apiKey || env.gemini.skip) return false;
  if (Date.now() < geminiCooldownUntil) return false;
  return true;
}

function markGeminiQuotaHit(err) {
  if (isGeminiQuotaError(err?.message || String(err))) {
    geminiCooldownUntil = Date.now() + 30 * 60 * 1000;
    console.warn('[Image] Gemini quota/rate limit — skipping Gemini for 30 minutes (use Pollinations/Grok).');
  }
}

function defaultProviderOrder() {
  if (env.image.providerOrder.length) {
    return env.image.providerOrder.filter((id) => PROVIDER_LABELS[id] || id === 'grok' || id.startsWith('pollinations'));
  }
  // Pollinations + Grok first — Gemini free image tier is often exhausted (limit: 0)
  const order = ['pollinations-flux', 'pollinations-turbo'];
  if (env.xai.apiKey) order.push('grok');
  if (isGeminiAvailable()) order.push('gemini');
  return order;
}

function resolveProviderOrder(preferredProvider = 'auto') {
  const base = defaultProviderOrder();
  if (preferredProvider && preferredProvider !== 'auto') {
    const fallbacks = base.filter((id) => id !== preferredProvider);
    return [preferredProvider, ...fallbacks];
  }
  return base;
}

async function runProvider(providerId, {
  fullPrompt,
  geometryPrompt,
  referenceImage,
  referenceImages = [],
  aspectRatio,
  resolution,
  specifications,
  buildingStyle,
  buildingType,
  mode,
}) {
  const refs = referenceImages?.length
    ? referenceImages
    : referenceImage
      ? [referenceImage]
      : [];
  const primaryRef = refs[0];
  const editPrompt = geometryPrompt || fullPrompt;

  switch (providerId) {
    case 'gemini': {
      if (!isGeminiAvailable()) {
        throw new Error('Gemini skipped (quota cooldown or IMAGE_SKIP_GEMINI=true)');
      }
      try {
        const result = await geminiService.generateImage({
          prompt: refs.length ? editPrompt : fullPrompt,
          referenceImage: primaryRef,
          referenceImages: refs,
          aspectRatio,
        });
        return {
          imageDataUri: geminiService.toDataUri(result.base64, result.mime),
          usedReference: refs.length > 0,
          provider: 'gemini',
          model: result.model,
        };
      } catch (err) {
        markGeminiQuotaHit(err);
        throw err;
      }
    }
    case 'pollinations-flux': {
      const result = await pollinationsService.generateImage({
        prompt: geometryPrompt || fullPrompt,
        aspectRatio,
        model: 'flux',
      });
      return {
        imageDataUri: pollinationsService.toDataUri(result.base64, result.mime),
        usedReference: false,
        provider: 'pollinations-flux',
      };
    }
    case 'pollinations-turbo': {
      const result = await pollinationsService.generateImage({
        prompt: geometryPrompt || fullPrompt,
        aspectRatio,
        model: 'turbo',
      });
      return {
        imageDataUri: pollinationsService.toDataUri(result.base64, result.mime),
        usedReference: false,
        provider: 'pollinations-turbo',
      };
    }
    case 'grok': {
      let imageResult;
      let usedReference = false;
      if (primaryRef && mode === 'exterior') {
        try {
          imageResult = await xaiService.editImage({
            prompt: editPrompt,
            imageDataUri: primaryRef,
            responseFormat: 'b64_json',
          });
          usedReference = true;
        } catch {
          imageResult = null;
        }
      }
      if (!imageResult) {
        imageResult = await xaiService.generateImage({
          prompt: fullPrompt,
          aspectRatio,
          resolution,
          responseFormat: 'b64_json',
        });
      }
      return {
        imageDataUri: xaiService.toDataUri(imageResult.base64, imageResult.url),
        usedReference,
        provider: 'grok',
      };
    }
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}

/**
 * Try free/paid image providers in order until one succeeds.
 */
async function generateWithProviders(options) {
  const {
    fullPrompt,
    geometryPrompt,
    referenceImage,
    referenceImages = [],
    aspectRatio = '16:9',
    resolution = '1k',
    specifications = {},
    buildingStyle,
    buildingType,
    mode = 'exterior',
    preferredProvider = 'auto',
  } = options;

  const order = resolveProviderOrder(preferredProvider);
  const attempts = [];

  for (const providerId of order) {
    if (providerId === 'gemini' && !isGeminiAvailable()) {
      attempts.push({ provider: providerId, error: 'Skipped (quota cooldown or IMAGE_SKIP_GEMINI)' });
      continue;
    }
    try {
      const result = await runProvider(providerId, {
        fullPrompt,
        geometryPrompt,
        referenceImage,
        referenceImages,
        aspectRatio,
        resolution,
        specifications,
        buildingStyle,
        buildingType,
        mode,
      });
      const billingRequired = attempts.some((a) => a.provider === 'grok' && isXaiBillingError(a.error));
      return {
        ...result,
        providerLabel: PROVIDER_LABELS[result.provider] || result.provider,
        attempts: attempts.length ? attempts : undefined,
        billingRequired: result.provider !== 'grok' && billingRequired,
        billingMessage: result.provider !== 'grok' && billingRequired
          ? 'Grok needs xAI credits — using free models instead. Add credits at console.x.ai for Grok.'
          : null,
      };
    } catch (err) {
      attempts.push({ provider: providerId, error: err.message });
      console.warn(`Image provider ${providerId} failed:`, err.message);
    }
  }

  const summary = attempts.map((a) => `${a.provider}: ${a.error}`).join('; ');
  throw new Error(
    `All image providers failed. ${summary}. `
    + 'Free Pollinations may be rate-limited — wait 1–2 minutes and retry once. '
    + 'For Gemini, create a new key at aistudio.google.com or set IMAGE_SKIP_GEMINI=true. '
    + 'For Grok, add credits at console.x.ai.',
  );
}

function listAvailableProviders() {
  return {
    auto: defaultProviderOrder(),
    options: [
      { id: 'auto', label: 'Auto (Pollinations → Grok → Gemini)', available: true },
      { id: 'gemini', label: PROVIDER_LABELS.gemini, available: isGeminiAvailable() },
      { id: 'pollinations-flux', label: PROVIDER_LABELS['pollinations-flux'], available: true },
      { id: 'pollinations-turbo', label: PROVIDER_LABELS['pollinations-turbo'], available: true },
      { id: 'grok', label: PROVIDER_LABELS.grok, available: Boolean(env.xai.apiKey) },
    ],
  };
}

module.exports = {
  generateWithProviders,
  listAvailableProviders,
  PROVIDER_LABELS,
  defaultProviderOrder,
};
