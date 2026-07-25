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

function isXaiBillingError(message = '') {
  return /403|permission-denied|doesn't have any credits|no credits|licenses yet/i.test(message);
}

function defaultProviderOrder() {
  const order = ['pollinations-flux', 'pollinations-turbo'];
  if (env.gemini.apiKey) order.push('gemini');
  if (env.xai.apiKey) order.push('grok');
  return order;
}

function resolveProviderOrder(preferredProvider = 'auto') {
  if (preferredProvider && preferredProvider !== 'auto') {
    return [preferredProvider];
  }
  return defaultProviderOrder();
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
  throw new Error(`All image providers failed. ${summary}`);
}

function listAvailableProviders() {
  return {
    auto: defaultProviderOrder(),
    options: [
      { id: 'auto', label: 'Auto (best free first)', available: true },
      { id: 'gemini', label: PROVIDER_LABELS.gemini, available: Boolean(env.gemini.apiKey) },
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
};
