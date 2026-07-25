/** Room layout templates (feet) — scaled to building width × depth */
export function getResidentialRooms(widthM, depthM, floor = 1) {
  const w = widthM * 3.281; // meters to feet for display
  const d = depthM * 3.281;
  if (floor === 1) {
    return [
      { id: 'bedroom1', label: 'Bedroom 1', x: 0, y: 0, w: w * 0.48, h: d * 0.36, fixtures: ['bed-double', 'wardrobe'] },
      { id: 'bedroom2', label: 'Bedroom 2', x: 0, y: d * 0.36, w: w * 0.48, h: d * 0.26, fixtures: ['bed-single', 'wardrobe'] },
      { id: 'hall', label: 'Hall', x: w * 0.48, y: d * 0.26, w: w * 0.52, h: d * 0.44, fixtures: [] },
      { id: 'wash', label: 'Wash Area', x: w * 0.48, y: 0, w: w * 0.52, h: d * 0.26, fixtures: ['sink'] },
      { id: 'toilet', label: 'Toilet', x: w * 0.48, y: d * 0.62, w: w * 0.32, h: d * 0.1, fixtures: ['toilet'] },
      { id: 'parking', label: 'Parking', x: w * 0.48, y: d * 0.72, w: w * 0.52, h: d * 0.28, fixtures: [] },
    ];
  }
  return [
    { id: 'drawing', label: 'Drawing Room', x: w * 0.48, y: d * 0.26, w: w * 0.52, h: d * 0.38, fixtures: ['sofa', 'light-chandelier'] },
    { id: 'kitchen', label: 'Kitchen', x: w * 0.48, y: 0, w: w * 0.32, h: d * 0.26, fixtures: ['stove', 'sink'] },
    { id: 'bedroom3', label: 'Bedroom', x: 0, y: d * 0.36, w: w * 0.48, h: d * 0.26, fixtures: ['bed-double', 'wardrobe'] },
    { id: 'bedroom4', label: 'Bedroom', x: 0, y: 0, w: w * 0.48, h: d * 0.36, fixtures: ['bed-king', 'wardrobe'] },
    { id: 'bath', label: 'Bathroom', x: w * 0.48, y: d * 0.64, w: w * 0.32, h: d * 0.12, fixtures: ['toilet', 'sink'] },
    { id: 'balcony', label: 'Balcony', x: w * 0.48, y: d * 0.76, w: w * 0.52, h: d * 0.24, fixtures: [] },
  ];
}

export function getCommercialRooms(widthM, depthM, floor, totalFloors = 10) {
  const w = widthM * 3.281;
  const d = depthM * 3.281;

  if (floor === 1) {
    return [
      { id: 'lobby', label: 'Lobby & Reception', x: 0, y: 0, w: w * 0.55, h: d * 0.45, fixtures: ['sofa', 'light-chandelier'] },
      { id: 'security', label: 'Security / Mail', x: w * 0.55, y: 0, w: w * 0.45, h: d * 0.2, fixtures: ['desk'] },
      { id: 'cafe', label: 'Café / Break', x: w * 0.55, y: d * 0.2, w: w * 0.45, h: d * 0.35, fixtures: ['table-dining', 'sink'] },
      { id: 'parking', label: 'Parking Access', x: 0, y: d * 0.45, w: w * 0.55, h: d * 0.55, fixtures: [] },
      { id: 'storage', label: 'Storage', x: w * 0.55, y: d * 0.55, w: w * 0.45, h: d * 0.45, fixtures: ['wardrobe'] },
    ];
  }

  if (floor === totalFloors || floor >= totalFloors) {
    return [
      { id: 'executive', label: 'Executive Suite', x: 0, y: 0, w: w * 0.5, h: d * 0.55, fixtures: ['desk', 'sofa', 'light-chandelier'] },
      { id: 'boardroom', label: 'Board Room', x: w * 0.5, y: 0, w: w * 0.5, h: d * 0.45, fixtures: ['table-dining', 'light-chandelier'] },
      { id: 'terrace', label: 'Rooftop Terrace', x: 0, y: d * 0.55, w: w * 0.65, h: d * 0.45, fixtures: ['plant', 'light-floor'] },
      { id: 'pantry', label: 'Executive Pantry', x: w * 0.65, y: d * 0.45, w: w * 0.35, h: d * 0.55, fixtures: ['stove', 'sink'] },
    ];
  }

  const flip = floor % 2 === 0;
  if (flip) {
    return [
      { id: 'open', label: `Floor ${floor} — Open Workspace`, x: 0, y: 0, w: w * 0.6, h: d * 0.65, fixtures: ['desk', 'desk', 'light-ceiling'] },
      { id: 'meeting', label: 'Meeting Room A', x: w * 0.6, y: 0, w: w * 0.4, h: d * 0.35, fixtures: ['table-dining', 'light-chandelier'] },
      { id: 'meeting2', label: 'Meeting Room B', x: w * 0.6, y: d * 0.35, w: w * 0.4, h: d * 0.35, fixtures: ['table-dining'] },
      { id: 'services', label: 'Services / WC', x: w * 0.6, y: d * 0.7, w: w * 0.4, h: d * 0.3, fixtures: ['sink', 'toilet'] },
    ];
  }

  return [
    { id: 'open', label: `Floor ${floor} — Team Office`, x: w * 0.35, y: 0, w: w * 0.65, h: d * 0.7, fixtures: ['desk', 'desk', 'chair', 'light-ceiling'] },
    { id: 'focus', label: 'Focus Pods', x: 0, y: 0, w: w * 0.35, h: d * 0.4, fixtures: ['desk', 'light-wall'] },
    { id: 'collab', label: 'Collaboration Hub', x: 0, y: d * 0.4, w: w * 0.35, h: d * 0.35, fixtures: ['sofa', 'coffee-table'] },
    { id: 'services', label: 'Services', x: 0, y: d * 0.75, w: w * 0.35, h: d * 0.25, fixtures: ['sink'] },
  ];
}

/** Default furnished layout for residential cutaway view (positions in meters, relative to center) */
export function generateDefaultInterior(width, depth, floors, catalog) {
  const items = [];
  const find = (id) => catalog.find((a) => a.id === id) || { id, name: id, w: 1, h: 0.5, d: 1, color: '#999' };

  if (floors >= 1) {
    items.push(
      { ...find('bed-double'), uid: 'def-bed1', floor: 1, x: -width * 0.28, z: -depth * 0.22, y: 0 },
      { ...find('bed-single'), uid: 'def-bed2', floor: 1, x: -width * 0.28, z: depth * 0.08, y: 0 },
      { ...find('wardrobe'), uid: 'def-wardrobe1', floor: 1, x: -width * 0.38, z: -depth * 0.05, y: 0 },
      { ...find('wardrobe'), uid: 'def-wardrobe2', floor: 1, x: -width * 0.38, z: depth * 0.15, y: 0 },
      { ...find('sofa'), uid: 'def-sofa', floor: 1, x: width * 0.08, z: depth * 0.12, y: 0 },
      { ...find('armchair'), uid: 'def-chair1', floor: 1, x: width * 0.28, z: depth * 0.05, y: 0 },
      { ...find('armchair'), uid: 'def-chair2', floor: 1, x: width * 0.28, z: depth * 0.22, y: 0 },
      { ...find('rug'), uid: 'def-rug', floor: 1, x: width * 0.1, z: depth * 0.15, y: 0 },
      { ...find('coffee-table'), uid: 'def-coffee', floor: 1, x: width * 0.12, z: depth * 0.28, y: 0 },
      { ...find('table-dining'), uid: 'def-dining', floor: 1, x: width * 0.15, z: -depth * 0.15, y: 0 },
      { ...find('stove'), uid: 'def-stove', floor: 1, x: width * 0.32, z: -depth * 0.28, y: 0 },
      { ...find('sink'), uid: 'def-sink', floor: 1, x: width * 0.22, z: -depth * 0.28, y: 0 },
      { ...find('tv'), uid: 'def-tv', floor: 1, x: width * 0.05, z: depth * 0.32, y: 0.6 },
      { ...find('toilet'), uid: 'def-toilet', floor: 1, x: width * 0.2, z: depth * 0.3, y: 0 },
      { ...find('light-chandelier'), uid: 'def-light1', floor: 1, x: width * 0.05, z: 0, y: 2.5 },
    );
  }
  if (floors >= 2) {
    items.push(
      { ...find('bed-king'), uid: 'def-bed3', floor: 2, x: -width * 0.22, z: -depth * 0.05, y: 3 },
      { ...find('bed-double'), uid: 'def-bed4', floor: 2, x: -width * 0.22, z: depth * 0.18, y: 3 },
      { ...find('sofa'), uid: 'def-sofa2', floor: 2, x: width * 0.12, z: depth * 0.15, y: 3 },
      { ...find('armchair'), uid: 'def-arm2', floor: 2, x: width * 0.28, z: depth * 0.1, y: 3 },
      { ...find('rug'), uid: 'def-rug2', floor: 2, x: width * 0.15, z: depth * 0.2, y: 3 },
      { ...find('table-dining'), uid: 'def-dining2', floor: 2, x: width * 0.1, z: -depth * 0.1, y: 3 },
      { ...find('desk'), uid: 'def-desk', floor: 2, x: width * 0.25, z: -depth * 0.25, y: 3 },
      { ...find('plant'), uid: 'def-plant2', floor: 2, x: -width * 0.05, z: depth * 0.32, y: 3 },
      { ...find('light-chandelier'), uid: 'def-light2', floor: 2, x: 0, z: 0, y: 5.5 },
    );
  }
  for (let f = 3; f <= floors; f++) {
    const offset = (f % 2) * 0.15;
    items.push(
      { ...find('desk'), uid: `def-desk-${f}-1`, floor: f, x: -width * 0.2 + offset, z: -depth * 0.1, y: (f - 1) * 3 },
      { ...find('desk'), uid: `def-desk-${f}-2`, floor: f, x: width * 0.15, z: depth * 0.1, y: (f - 1) * 3 },
      { ...find('chair'), uid: `def-chair-${f}`, floor: f, x: -width * 0.25 + offset, z: depth * 0.15, y: (f - 1) * 3 },
      { ...find('light-ceiling'), uid: `def-light-${f}`, floor: f, x: 0, z: 0, y: (f - 1) * 3 + 2.5 },
    );
    if (f === floors) {
      items.push(
        { ...find('sofa'), uid: `def-sofa-top`, floor: f, x: -width * 0.1, z: depth * 0.25, y: (f - 1) * 3 },
        { ...find('table-dining'), uid: `def-board-${f}`, floor: f, x: width * 0.2, z: -depth * 0.15, y: (f - 1) * 3 },
      );
    }
  }
  return items;
}

/** Generate default furniture per floor for commercial towers */
export function generateCommercialInterior(width, depth, floors, catalog) {
  const items = [];
  const find = (id) => catalog.find((a) => a.id === id) || { id, name: id, w: 1, h: 0.5, d: 1, color: '#999' };

  for (let f = 1; f <= floors; f++) {
    const y = (f - 1) * 3;
    if (f === 1) {
      items.push(
        { ...find('sofa'), uid: `com-sofa-${f}`, floor: f, x: -width * 0.12, z: 0.05, y },
        { ...find('armchair'), uid: `com-arm1-${f}`, floor: f, x: -width * 0.28, z: 0.2, y },
        { ...find('armchair'), uid: `com-arm2-${f}`, floor: f, x: -width * 0.05, z: 0.25, y },
        { ...find('rug'), uid: `com-rug-${f}`, floor: f, x: -width * 0.1, z: 0.1, y },
        { ...find('coffee-table'), uid: `com-coffee-${f}`, floor: f, x: -width * 0.08, z: 0.28, y },
        { ...find('desk'), uid: `com-desk-${f}`, floor: f, x: width * 0.25, z: -depth * 0.12, y },
        { ...find('chair'), uid: `com-chair1-${f}`, floor: f, x: width * 0.18, z: -depth * 0.12, y },
        { ...find('table-dining'), uid: `com-table-${f}`, floor: f, x: width * 0.2, z: depth * 0.12, y },
        { ...find('plant'), uid: `com-plant-${f}`, floor: f, x: width * 0.32, z: depth * 0.28, y },
        { ...find('light-chandelier'), uid: `com-light-${f}`, floor: f, x: 0, z: 0, y: y + 2.5 },
      );
    } else if (f === floors) {
      items.push(
        { ...find('desk'), uid: `com-exec-${f}`, floor: f, x: -width * 0.2, z: 0, y },
        { ...find('sofa'), uid: `com-lounge-${f}`, floor: f, x: width * 0.15, z: depth * 0.2, y },
        { ...find('table-dining'), uid: `com-board-${f}`, floor: f, x: width * 0.25, z: -depth * 0.1, y },
        { ...find('plant'), uid: `com-plant-${f}`, floor: f, x: -width * 0.05, z: depth * 0.3, y },
      );
    } else {
      const flip = f % 2 === 0;
      items.push(
        { ...find('desk'), uid: `com-d1-${f}`, floor: f, x: flip ? -width * 0.2 : width * 0.1, z: -depth * 0.1, y },
        { ...find('desk'), uid: `com-d2-${f}`, floor: f, x: flip ? width * 0.05 : -width * 0.15, z: depth * 0.05, y },
        { ...find('chair'), uid: `com-chair-${f}`, floor: f, x: flip ? -width * 0.25 : width * 0.2, z: 0, y },
        { ...find(flip ? 'table-dining' : 'coffee-table'), uid: `com-meet-${f}`, floor: f, x: flip ? width * 0.25 : -width * 0.05, z: depth * 0.2, y },
        { ...find('light-ceiling'), uid: `com-light-${f}`, floor: f, x: 0, z: 0, y: y + 2.5 },
      );
    }
  }
  return items;
}

export function metersToFeet(m) {
  const ft = Math.floor(m * 3.28084);
  const inches = Math.round((m * 3.28084 - ft) * 12);
  return inches > 0 ? `${ft}'-${inches}"` : `${ft}'-0"`;
}

export function getResidentialWallLines(widthM, depthM, floor = 1) {
  const w = widthM * 3.281;
  const d = depthM * 3.281;
  const lines = [
    { x1: w * 0.48, y1: 0, x2: w * 0.48, y2: d },
    { x1: 0, y1: d * 0.36, x2: w * 0.48, y2: d * 0.36 },
  ];
  if (floor === 1) {
    lines.push(
      { x1: w * 0.48, y1: d * 0.26, x2: w, y2: d * 0.26 },
      { x1: w * 0.48, y1: d * 0.62, x2: w * 0.8, y2: d * 0.62 },
      { x1: w * 0.8, y1: d * 0.62, x2: w * 0.8, y2: d * 0.72 },
      { x1: w * 0.48, y1: d * 0.72, x2: w, y2: d * 0.72 },
    );
  } else {
    lines.push(
      { x1: w * 0.48, y1: d * 0.26, x2: w, y2: d * 0.26 },
      { x1: 0, y1: d * 0.36, x2: w * 0.48, y2: d * 0.36 },
      { x1: w * 0.48, y1: d * 0.64, x2: w * 0.8, y2: d * 0.64 },
      { x1: w * 0.48, y1: d * 0.76, x2: w, y2: d * 0.76 },
    );
  }
  return lines;
}

export function getCommercialWallLines(widthM, depthM, floor = 1, totalFloors = 10) {
  const w = widthM * 3.281;
  const d = depthM * 3.281;
  if (floor === 1) {
    return [
      { x1: w * 0.55, y1: 0, x2: w * 0.55, y2: d * 0.45 },
      { x1: 0, y1: d * 0.45, x2: w * 0.55, y2: d * 0.45 },
      { x1: w * 0.55, y1: d * 0.2, x2: w, y2: d * 0.2 },
      { x1: w * 0.55, y1: d * 0.55, x2: w, y2: d * 0.55 },
    ];
  }
  if (floor >= totalFloors) {
    return [
      { x1: w * 0.5, y1: 0, x2: w * 0.5, y2: d * 0.55 },
      { x1: 0, y1: d * 0.55, x2: w * 0.65, y2: d * 0.55 },
      { x1: w * 0.65, y1: d * 0.45, x2: w * 0.65, y2: d },
    ];
  }
  const flip = floor % 2 === 0;
  if (flip) {
    return [
      { x1: w * 0.6, y1: 0, x2: w * 0.6, y2: d },
      { x1: w * 0.6, y1: d * 0.35, x2: w, y2: d * 0.35 },
      { x1: w * 0.6, y1: d * 0.7, x2: w, y2: d * 0.7 },
    ];
  }
  return [
    { x1: w * 0.35, y1: 0, x2: w * 0.35, y2: d * 0.75 },
    { x1: 0, y1: d * 0.4, x2: w * 0.35, y2: d * 0.4 },
    { x1: 0, y1: d * 0.75, x2: w * 0.35, y2: d * 0.75 },
  ];
}

export function isCommercialBuilding(buildingType, floors, projectType) {
  if (buildingType === 'residential' || projectType === 'residential') return false;
  return projectType === 'commercial' || floors > 3;
}

/** Rooms for a floor — custom saved layout or template */
export function getRoomsForFloor(widthM, depthM, floor, buildingType, floors, floorRooms = {}) {
  const key = String(floor);
  if (floorRooms[key]?.length) return floorRooms[key];
  return isCommercialBuilding(buildingType, floors)
    ? getCommercialRooms(widthM, depthM, floor, floors)
    : getResidentialRooms(widthM, depthM, floor);
}

/** Wall lines from custom room rectangles (feet coords) */
export function deriveWallLinesFromRooms(rooms, wFt, dFt) {
  const lines = [];
  const xs = [...new Set(rooms.flatMap((r) => [r.x, r.x + r.w]))].filter((x) => x > 0.05 && x < wFt - 0.05);
  const ys = [...new Set(rooms.flatMap((r) => [r.y, r.y + r.h]))].filter((y) => y > 0.05 && y < dFt - 0.05);

  xs.forEach((x) => {
    const touch = rooms.filter((r) => Math.abs(r.x - x) < 0.02 || Math.abs(r.x + r.w - x) < 0.02);
    if (touch.length < 2) return;
    const y1 = Math.min(...touch.map((r) => r.y));
    const y2 = Math.max(...touch.map((r) => r.y + r.h));
    lines.push({ x1: x, y1, x2: x, y2 });
  });
  ys.forEach((y) => {
    const touch = rooms.filter((r) => Math.abs(r.y - y) < 0.02 || Math.abs(r.y + r.h - y) < 0.02);
    if (touch.length < 2) return;
    const x1 = Math.min(...touch.map((r) => r.x));
    const x2 = Math.max(...touch.map((r) => r.x + r.w));
    lines.push({ x1: x1, y1: y, x2: x2, y2: y });
  });
  return lines;
}

export function getWallLines(widthM, depthM, floor, buildingType, floors, floorRooms = {}) {
  const key = String(floor);
  if (floorRooms[key]?.length) {
    const wFt = widthM * 3.281;
    const dFt = depthM * 3.281;
    return deriveWallLinesFromRooms(floorRooms[key], wFt, dFt);
  }
  return isCommercialBuilding(buildingType, floors)
    ? getCommercialWallLines(widthM, depthM, floor, floors)
    : getResidentialWallLines(widthM, depthM, floor);
}

export function initFloorRooms(widthM, depthM, floors, buildingType) {
  const out = {};
  for (let f = 1; f <= floors; f++) {
    out[String(f)] = getRoomsForFloor(widthM, depthM, f, buildingType, floors, {});
  }
  return out;
}

/** Convert wall line (feet from origin) to 3D half-wall mesh data (meters, centered on building) */
export function wallLineTo3D(line, widthM, depthM, floorY, heightM = 1.2) {
  const wFt = widthM * 3.281;
  const dFt = depthM * 3.281;
  const cx = ((line.x1 + line.x2) / 2 / wFt - 0.5) * widthM;
  const cz = ((line.y1 + line.y2) / 2 / dFt - 0.5) * depthM;
  const isVertical = Math.abs(line.x1 - line.x2) < 0.01;
  const lenFt = isVertical
    ? Math.abs(line.y2 - line.y1)
    : Math.abs(line.x2 - line.x1);
  const lenM = (lenFt / wFt) * widthM;
  return {
    position: [cx, floorY + heightM / 2, cz],
    size: isVertical ? [0.12, heightM, (lenFt / dFt) * depthM] : [(lenFt / wFt) * widthM, heightM, 0.12],
  };
}

export function formatDim(feet) {
  const f = Math.floor(feet);
  const i = Math.round((feet - f) * 12);
  return i > 0 ? `${f}' ${i}"` : `${f}'-0"`;
}
