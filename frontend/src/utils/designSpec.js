/** Building geometry for accurate AI — matches BuildingViewer (3m per floor) */
export const DESIGN_FLOOR_H = 3;

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

export function buildDesignGeometrySpec(specs = {}, buildingStyle = 'commercial', buildingType = '') {
  const floors = Math.max(1, Number(specs.floors) || 1);
  const width = Number(specs.width) || 8;
  const depth = Number(specs.depth) || 6;
  const totalHeightM = floors * DESIGN_FLOOR_H;
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
    `EXACTLY ${floors} floors`,
    `total height ${totalHeightM}m (${DESIGN_FLOOR_H}m per floor)`,
    `footprint ${width}m × ${depth}m`,
    `ratio ${(width / depth).toFixed(2)}:1`,
    windowSummary,
  ].join('; ');

  return {
    floors, width, depth, totalHeightM, floorHeightM: DESIGN_FLOOR_H,
    typeLabel, materials, windowSummary, strictGeometryLine,
  };
}

export function captureHeightForFloors(floors = 1) {
  return Math.min(1400, 320 + floors * 58);
}

export function computeRenderAspectRatio(specs = {}) {
  const geo = buildDesignGeometrySpec(specs);
  const span = Math.max(geo.width, geo.depth);
  const ratio = geo.totalHeightM / span;
  if (ratio >= 1.75) return '9:16';
  if (ratio >= 1.15) return '3:4';
  if (ratio <= 0.55) return '16:9';
  return '4:3';
}

export function aspectClass(aspectRatio = '16:9') {
  if (aspectRatio === '9:16') return 'aspect-[9/16] max-h-[640px]';
  if (aspectRatio === '3:4') return 'aspect-[3/4] max-h-[580px]';
  if (aspectRatio === '4:3') return 'aspect-[4/3]';
  return 'aspect-[16/9]';
}
