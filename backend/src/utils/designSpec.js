/** Shared building geometry for accurate AI prompts — 3m per floor matches BuildingViewer */
const FLOOR_H = 3;

function countWindowsPerFloor(floorRooms = {}, floors = 1, width = 8) {
  const counts = {};
  for (let f = 1; f <= floors; f += 1) {
    const rooms = floorRooms[String(f)] || floorRooms[f] || [];
    if (rooms.length) {
      const front = rooms.filter((r) => (r.y || 0) <= 0.5);
      counts[f] = Math.max(1, front.length || rooms.length);
    } else {
      counts[f] = Math.max(2, Math.min(4, Math.floor(width / 2.2)));
    }
  }
  return counts;
}

function buildDesignGeometrySpec(specs = {}, buildingStyle = 'commercial', buildingType = '') {
  const floors = Math.max(1, Number(specs.floors) || 1);
  const width = Number(specs.width) || 8;
  const depth = Number(specs.depth) || 6;
  const totalHeightM = floors * FLOOR_H;
  const materials = specs.materials || {};
  const typeLabel = buildingStyle === 'commercial'
    ? 'commercial/office tower'
    : /resident|house|home|villa/i.test(String(buildingType))
      ? 'residential building'
      : 'building';

  const windowsPerFloor = countWindowsPerFloor(specs.floorRooms || {}, floors, width);
  const windowSummary = Object.entries(windowsPerFloor)
    .map(([fl, n]) => `floor ${fl}: ${n} window bays`)
    .join(', ');

  const strictGeometryLine = [
    `EXACTLY ${floors} above-ground floors (not ${floors - 1}, not ${floors + 1})`,
    `total building height ${totalHeightM} meters (${FLOOR_H}m per floor)`,
    `footprint ${width}m wide × ${depth}m deep`,
    `width-to-depth ratio ${(width / depth).toFixed(2)}:1`,
    `vertical rectangular massing — flat roof`,
    windowSummary,
  ].join('; ');

  return {
    floors,
    width,
    depth,
    totalHeightM,
    floorHeightM: FLOOR_H,
    typeLabel,
    materials,
    windowSummary,
    strictGeometryLine,
  };
}

function buildGeometryLockedPrompt(geo, { doorStyle, windowStyle } = {}) {
  const m = geo.materials || {};
  return [
    'Transform the attached 3D architectural model into a photorealistic exterior photograph.',
    'GEOMETRY IS LOCKED — copy the reference silhouette pixel-perfect:',
    geo.strictGeometryLine,
    `Materials only: walls ${m.wallColor || 'light grey'}, accent trim ${m.accentColor || 'orange'}, roof ${m.roofColor || 'dark grey'}, stone ${m.stoneColor || 'grey'}.`,
    `${doorStyle || 'wood'} main entrance, ${windowStyle || 'standard'} windows aligned per floor.`,
    'Do NOT add floors. Do NOT change height or footprint proportions. Do NOT add wings, towers, or extra volumes.',
    'No cars, no people, no text, clear sky, professional architectural photography.',
  ].join(' ');
}

function buildTextOnlyAccuratePrompt(geo, groqPrompt = '') {
  return [
    groqPrompt,
    `MANDATORY GEOMETRY: ${geo.strictGeometryLine}.`,
    'Tall narrow tower if footprint is small with many floors. Match exact floor count and total height.',
    'No cars, no people, single building centered.',
  ].filter(Boolean).join(' ');
}

function computeRenderAspectRatio(geo) {
  const span = Math.max(geo.width, geo.depth);
  const ratio = geo.totalHeightM / span;
  if (ratio >= 1.75) return '9:16';
  if (ratio >= 1.15) return '3:4';
  if (ratio <= 0.55) return '16:9';
  return '4:3';
}

module.exports = {
  FLOOR_H,
  buildDesignGeometrySpec,
  buildGeometryLockedPrompt,
  buildTextOnlyAccuratePrompt,
  computeRenderAspectRatio,
};
