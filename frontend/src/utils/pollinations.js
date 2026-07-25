// Pollinations AI — free text-to-image generation, no API key required.

const PALETTE_NAMES = {
  '#D5DBDB': 'light grey',
  '#BDC3C7': 'grey',
  '#F5F5F5': 'white',
  '#AAB7B8': 'slate',
  '#2C3E50': 'dark navy',
  '#E67E22': 'orange',
  '#7F8C8D': 'stone grey',
  '#8B7355': 'brown wood',
  '#27AE60': 'green',
  '#3498DB': 'blue',
  '#5D6D7E': 'blue-grey',
  '#F1C40F': 'yellow',
};

export function colorName(hex) {
  if (!hex) return 'neutral';
  const key = String(hex).toUpperCase();
  return PALETTE_NAMES[key] || PALETTE_NAMES[key.replace('#', '')] || `${hex} colored`;
}

function buildingTypeWord(buildingType, projectType) {
  const t = (buildingType || projectType || '').toLowerCase();
  if (t.includes('resident') || t.includes('house') || t.includes('home')) return 'residential house';
  if (t.includes('hotel')) return 'modern hotel';
  if (t.includes('retail') || t.includes('shop') || t.includes('store')) return 'retail storefront';
  if (t.includes('warehouse') || t.includes('industrial')) return 'industrial warehouse';
  if (t.includes('office') || t.includes('commercial')) return 'modern office building';
  return 'modern building';
}

/**
 * Build a photorealistic prompt from the FULL saved design — rooms, furniture, materials, styles.
 */
export function buildHousePrompt({
  mode = 'exterior',
  floors = 1,
  width = 8,
  depth = 6,
  materials = {},
  buildingType,
  projectType,
  floor,
  floorRooms = {},
  placedItems = [],
  doorStyle,
  windowStyle,
}) {
  const typeWord = buildingTypeWord(buildingType, projectType);
  const wall = colorName(materials.wallColor);
  const accent = colorName(materials.accentColor);
  const roof = colorName(materials.roofColor);
  const stone = colorName(materials.stoneColor);

  const rooms = Object.entries(floorRooms).flatMap(([fl, rs]) =>
    (rs || []).map((r) => `floor ${fl} ${r.label}`)
  ).slice(0, 10);

  const furniture = placedItems
    .filter((i) => !i.zone || i.zone === 'interior')
    .filter((i) => !floor || i.floor === floor)
    .map((i) => i.name)
    .slice(0, 8);

  const exterior = placedItems
    .filter((i) => i.zone === 'exterior')
    .map((i) => i.name)
    .slice(0, 5);

  const roomText = rooms.length ? `, rooms: ${rooms.join(', ')}` : '';
  const furnText = furniture.length ? `, furniture: ${furniture.join(', ')}` : '';
  const extText = exterior.length ? `, exterior features: ${exterior.join(', ')}` : '';
  const styleText = `${doorStyle || 'modern'} door, ${windowStyle || 'standard'} windows`;

  if (mode === 'interior') {
    const floorLabel = floor ? `level ${floor}` : 'a typical floor';
    return `Photorealistic isometric cutaway interior render of ${floorLabel} inside a ${typeWord}, ${wall} walls, ${accent} accents${roomText}${furnText}, modern furniture, warm interior lighting, architectural visualization like professional real estate marketing, highly detailed, 8k`;
  }

  return `Photorealistic architectural exterior photograph of a ${floors}-story ${typeWord}, ${width}m by ${depth}m footprint, ${wall} plaster walls, ${stone} stone accents, ${accent} trim, ${roof} flat roof, ${styleText}${roomText}, modern contemporary facade with recessed windows and warm evening lighting, subtle landscaping, blue sky, professional real estate photography, highly detailed, 8k, single building centered, no cars, no people`;
}

export function truncatePromptForImage(prompt, maxLen = 900) {
  if (!prompt || typeof prompt !== 'string') return '';
  const trimmed = prompt.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

export function pollinationsImageUrl(prompt, { width = 1024, height = 1024, seed, model = 'flux', nologo = true } = {}) {
  const safePrompt = truncatePromptForImage(prompt, 850);
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    model,
    nologo: String(nologo),
  });
  if (seed != null) params.set('seed', String(seed));
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?${params.toString()}`;
}

export function randomSeed() {
  return Math.floor(Math.random() * 1000000);
}
