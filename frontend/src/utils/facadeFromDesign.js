const FLOOR_H = 3;

/** Convert saved floorRooms + dimensions into facade window/door layout for presentation */
export function deriveFacadeFromDesign({
  width = 8,
  depth = 6,
  floors = 1,
  floorRooms = {},
  doorStyle = 'wood',
  windowStyle = 'standard',
  placedItems = [],
}) {
  const windows = [];
  const floorCount = Math.max(1, floors);

  for (let f = 1; f <= floorCount; f += 1) {
    const rooms = floorRooms[String(f)] || floorRooms[f] || [];
    const floorY = 1.35 + (f - 1) * FLOOR_H;

    if (rooms.length) {
      const frontRooms = rooms.filter((r) => r.y <= 0.5 || r.label?.toLowerCase().includes('balcony'));
      const targets = frontRooms.length ? frontRooms : rooms;
      const step = width / (targets.length + 1);

      targets.forEach((room, i) => {
        const cx = -width / 2 + step * (i + 1);
        const winW = Math.min(1.5, Math.max(0.9, (room.w || 3) * 0.08));
        const winH = Math.min(1.8, FLOOR_H * 0.55);
        windows.push({ x: cx, y: floorY, w: winW, h: winH, floor: f, room: room.label });
      });
    } else {
      const cols = Math.max(2, Math.min(4, Math.floor(width / 2.2)));
      for (let c = 0; c < cols; c += 1) {
        windows.push({
          x: -width / 2 + (c + 0.75) * (width / cols),
          y: floorY,
          w: 1.2,
          h: 1.55,
          floor: f,
        });
      }
    }
  }

  const hasBalcony = Object.values(floorRooms).flat().some((r) =>
    /balcony|terrace|patio/i.test(r.label || '')
  ) || placedItems.some((i) => /balcony|terrace/i.test(i.name || ''));

  const exteriorItems = placedItems.filter((i) => i.zone === 'exterior');

  return {
    windows,
    door: { x: 0, y: 1.35, style: doorStyle },
    windowStyle,
    hasBalcony: hasBalcony && floorCount >= 2,
    balconyFloor: 2,
    exteriorItems,
    floors: floorCount,
    width,
    depth,
  };
}

/** Summarize saved design for AI photo prompts */
export function summarizeDesignForPrompt({
  floors = 1,
  width = 8,
  depth = 6,
  materials = {},
  floorRooms = {},
  placedItems = [],
  doorStyle,
  windowStyle,
  buildingType,
  projectType,
  floor,
}) {
  const roomSummary = Object.entries(floorRooms).flatMap(([fl, rooms]) =>
    (rooms || []).map((r) => `L${fl} ${r.label}`)
  ).slice(0, 12);

  const furniture = placedItems
    .filter((i) => !i.zone || i.zone === 'interior')
    .filter((i) => !floor || i.floor === floor)
    .map((i) => i.name)
    .slice(0, 10);

  const exterior = placedItems
    .filter((i) => i.zone === 'exterior')
    .map((i) => i.name)
    .slice(0, 6);

  return { roomSummary, furniture, exterior, doorStyle, windowStyle, buildingType, projectType, floors, width, depth, materials };
}

export { FLOOR_H as FACADE_FLOOR_H };
