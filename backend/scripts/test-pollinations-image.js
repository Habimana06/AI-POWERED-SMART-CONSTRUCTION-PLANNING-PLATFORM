/**
 * Test Pollinations image generation with token from .env
 * Usage: node scripts/test-pollinations-image.js
 */
require('../src/config/env');
const pollinationsService = require('../src/services/pollinationsService');

async function main() {
  const token = process.env.POLLINATIONS_API_KEY || process.env.POLLINATIONS_TOKEN;
  console.log('Pollinations token:', token ? `set (${token.length} chars)` : 'NOT SET');
  console.log('Testing flux model...');

  const start = Date.now();
  const result = await pollinationsService.generateImage({
    prompt: 'Modern two-story residential house, photorealistic exterior, clear sky, Rwanda architecture',
    aspectRatio: '16:9',
    model: 'flux',
  });

  const kb = Math.round(Buffer.from(result.base64, 'base64').length / 1024);
  console.log('OK: Image generated in', ((Date.now() - start) / 1000).toFixed(1), 's');
  console.log('OK: Size ~', kb, 'KB, mime:', result.mime);
  console.log('OK: URL sample:', result.url?.slice(0, 80) + '...');
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
