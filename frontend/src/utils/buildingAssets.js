export const FURNITURE_CATALOG = [
  { id: 'bed-single', name: 'Single Bed', category: 'bed', w: 1, h: 0.5, d: 2, color: '#5DADE2', meshType: 'bed-single' },
  { id: 'bed-double', name: 'Double Bed', category: 'bed', w: 1.6, h: 0.5, d: 2, color: '#3498DB', meshType: 'bed-double' },
  { id: 'bed-king', name: 'King Bed', category: 'bed', w: 2, h: 0.55, d: 2.1, color: '#2874A6', meshType: 'bed-king' },
  { id: 'bed-bunk', name: 'Bunk Bed', category: 'bed', w: 1, h: 1.6, d: 2, color: '#1F618D', meshType: 'bed-bunk' },
  { id: 'sofa', name: 'Sofa', category: 'furniture', w: 2.2, h: 0.8, d: 0.9, color: '#E67E22', meshType: 'sofa' },
  { id: 'armchair', name: 'Armchair', category: 'furniture', w: 0.85, h: 0.85, d: 0.85, color: '#E67E22', meshType: 'armchair' },
  { id: 'rug', name: 'Area Rug', category: 'decor', w: 2.5, h: 0.02, d: 1.8, color: '#FAFAFA', meshType: 'rug' },
  { id: 'desk', name: 'Desk', category: 'furniture', w: 1.4, h: 0.75, d: 0.7, color: '#8B4513', meshType: 'desk' },
  { id: 'wardrobe', name: 'Wardrobe', category: 'furniture', w: 1.2, h: 2, d: 0.6, color: '#95A5A6', meshType: 'wardrobe' },
  { id: 'table-dining', name: 'Dining Table', category: 'furniture', w: 1.8, h: 0.75, d: 1, color: '#D35400', meshType: 'table-dining' },
  { id: 'tv', name: 'TV & Console', category: 'furniture', w: 1.6, h: 1.2, d: 0.4, color: '#1C2833', meshType: 'tv' },
  { id: 'light-ceiling', name: 'Ceiling Light', category: 'light', w: 0.4, h: 0.15, d: 0.4, color: '#F1C40F', meshType: 'light-ceiling' },
  { id: 'light-wall', name: 'Wall Sconce', category: 'light', w: 0.2, h: 0.5, d: 0.15, color: '#F39C12', meshType: 'light-wall' },
  { id: 'light-floor', name: 'Floor Lamp', category: 'light', w: 0.3, h: 1.6, d: 0.3, color: '#D68910', meshType: 'light-floor' },
  { id: 'light-chandelier', name: 'Chandelier', category: 'light', w: 0.8, h: 0.6, d: 0.8, color: '#FFD700', meshType: 'light-chandelier' },
  { id: 'toilet', name: 'Toilet', category: 'bathroom', w: 0.5, h: 0.5, d: 0.7, color: '#ECF0F1', meshType: 'toilet' },
  { id: 'sink', name: 'Sink', category: 'bathroom', w: 0.6, h: 0.85, d: 0.5, color: '#BDC3C7', meshType: 'sink' },
  { id: 'stove', name: 'Kitchen Stove', category: 'kitchen', w: 0.8, h: 0.9, d: 0.6, color: '#2C3E50', meshType: 'stove' },
  { id: 'fridge', name: 'Refrigerator', category: 'kitchen', w: 0.7, h: 1.8, d: 0.7, color: '#ECF0F1', meshType: 'fridge' },
  { id: 'chair', name: 'Office Chair', category: 'furniture', w: 0.55, h: 1, d: 0.55, color: '#34495E', meshType: 'chair' },
  { id: 'plant', name: 'Indoor Plant', category: 'decor', w: 0.5, h: 1.2, d: 0.5, color: '#27AE60', meshType: 'plant' },
  { id: 'bathtub', name: 'Bathtub', category: 'bathroom', w: 1.6, h: 0.55, d: 0.75, color: '#FAFAFA', meshType: 'bathtub' },
  { id: 'coffee-table', name: 'Coffee Table', category: 'furniture', w: 1.2, h: 0.4, d: 0.7, color: '#8B4513', meshType: 'coffee-table' },
  { id: 'bookshelf', name: 'Bookshelf', category: 'furniture', w: 1, h: 1.8, d: 0.35, color: '#6E2C00', meshType: 'bookshelf' },
];

/** Outdoor / full-house items */
export const EXTERIOR_CATALOG = [
  { id: 'car', name: 'Car', category: 'exterior', icon: '🚗', w: 1.8, h: 1.4, d: 4, color: '#3498DB', meshType: 'car', zone: 'exterior' },
  { id: 'pool', name: 'Swimming Pool', category: 'exterior', icon: '🏊', w: 4, h: 0.3, d: 3, color: '#3498DB', meshType: 'pool', zone: 'exterior' },
  { id: 'cctv', name: 'Security Camera', category: 'exterior', icon: '📷', w: 0.3, h: 0.3, d: 0.3, color: '#2C3E50', meshType: 'cctv', zone: 'exterior' },
  { id: 'corrugated-roof', name: 'Corrugated Roof', category: 'exterior', icon: '🏠', w: 3, h: 0.15, d: 2, color: '#7F8C8D', meshType: 'corrugated-roof', zone: 'exterior' },
  { id: 'gate', name: 'Front Gate', category: 'exterior', icon: '🚪', w: 2.5, h: 2, d: 0.2, color: '#5D4037', meshType: 'gate', zone: 'exterior' },
  { id: 'solar-panel', name: 'Solar Panels', category: 'exterior', icon: '☀️', w: 3, h: 0.1, d: 2, color: '#1C2833', meshType: 'solar-panel', zone: 'exterior' },
  { id: 'tree-large', name: 'Large Tree', category: 'exterior', icon: '🌳', w: 2, h: 3, d: 2, color: '#27AE60', meshType: 'tree-large', zone: 'exterior' },
];

export const ASSET_ICONS = {
  'bed-single': '🛏️', 'bed-double': '🛏️', 'bed-king': '🛏️', 'bed-bunk': '🛏️',
  sofa: '🛋️', armchair: '💺', rug: '🟫', desk: '🖥️', wardrobe: '🚪',
  'table-dining': '🍽️', tv: '📺', 'light-ceiling': '💡', 'light-wall': '💡',
  'light-floor': '💡', 'light-chandelier': '✨', toilet: '🚽', sink: '🚰',
  stove: '🍳', fridge: '🧊', chair: '🪑', plant: '🌿', bathtub: '🛁',
  'coffee-table': '☕', bookshelf: '📚',
  car: '🚗', pool: '🏊', cctv: '📷', 'corrugated-roof': '🏠', gate: '🚪',
  'solar-panel': '☀️', 'tree-large': '🌳',
};

export function getAssetIcon(asset) {
  return asset.icon || ASSET_ICONS[asset.id] || ASSET_ICONS[asset.meshType] || '📦';
}

export const ALL_ASSETS = [...FURNITURE_CATALOG, ...EXTERIOR_CATALOG];

export const DOOR_STYLES = [
  { id: 'wood', name: 'Wood Door', color: '#5D4037' },
  { id: 'glass', name: 'Glass Door', color: '#87CEEB' },
  { id: 'metal', name: 'Metal Door', color: '#566573' },
];

export const WINDOW_STYLES = [
  { id: 'standard', name: 'Standard Window', color: '#87CEEB' },
  { id: 'tinted', name: 'Tinted Glass', color: '#5D6D7E' },
  { id: 'curtain', name: 'Curtain Wall', color: '#AED6F1' },
];

export function projectToDesignParams(project) {
  if (!project) return null;
  const floors = project.floors || 6;
  const area = project.totalAreaSqft || 10000;
  const isResidential = project.projectType === 'residential' || project.buildingType === 'residential';
  const footprint = Math.sqrt(area / Math.max(floors, 1));
  const width = isResidential
    ? Math.max(8, Math.min(14, Math.round(footprint / 8)))
    : Math.max(6, Math.round(footprint / 10));
  const depth = isResidential
    ? Math.max(7, Math.min(12, Math.round(width * 0.85)))
    : Math.max(5, Math.round(width * 0.75));

  return {
    floors,
    width,
    depth,
    buildingStyle: isResidential ? 'residential' : 'commercial',
    buildingType: project.buildingType || project.projectType,
    materials: {
      wallColor: isResidential ? '#F5F5F5' : '#D5DBDB',
      roofColor: '#FAFAFA',
      accentColor: isResidential ? '#8B7355' : '#E67E22',
      stoneColor: '#7F8C8D',
    },
    doorStyle: isResidential ? 'glass' : 'glass',
    windowStyle: isResidential ? 'standard' : 'curtain',
    placedItems: [],
    viewMode: isResidential ? 'cutaway' : 'exterior',
    activeFloor: 'all',
    showRoof: true,
  };
}

export function resolveBuildingStyle(specs, project) {
  if (specs?.buildingStyle && specs.buildingStyle !== 'auto') return specs.buildingStyle;
  const fromProject = projectToDesignParams(project);
  if (fromProject?.buildingStyle) return fromProject.buildingStyle;
  const type = (specs?.buildingType || project?.buildingType || project?.projectType || '').toLowerCase();
  if (/resident|house|home|villa|apartment/.test(type)) return 'residential';
  return 'commercial';
}

export function parseDesignSpecifications(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

export function mergeAIPlacedItems(catalog, aiItems = []) {
  return aiItems.map((item, i) => {
    const base = catalog.find((a) => a.id === item.id || a.id === item.type) || catalog[0];
    return {
      ...base,
      ...item,
      uid: item.uid || `ai-${item.id}-${i}`,
      meshType: base.meshType || item.id,
    };
  });
}
