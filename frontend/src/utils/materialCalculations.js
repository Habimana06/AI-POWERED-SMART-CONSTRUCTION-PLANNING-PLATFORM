import { FURNITURE_CATALOG, EXTERIOR_CATALOG } from './buildingAssets';

/** Rwanda construction unit prices (FRw) — 2025 benchmarks */
export const RWANDA_UNIT_PRICES = {
  cement: { label: 'Cement (50kg bag)', unit: 'bag', price: 10000 },
  sand: { label: 'Sand', unit: 'm³', price: 45000 },
  gravel: { label: 'Gravel / Aggregate', unit: 'm³', price: 55000 },
  steel: { label: 'Steel reinforcement', unit: 'kg', price: 1200 },
  blocks: { label: 'Concrete blocks', unit: 'piece', price: 650 },
  stone_cladding: { label: 'Stone cladding', unit: 'm²', price: 35000 },
  exterior_paint: { label: 'Exterior paint', unit: 'L', price: 8500 },
  interior_paint: { label: 'Interior paint', unit: 'L', price: 6500 },
  floor_tiles: { label: 'Floor tiles', unit: 'm²', price: 18000 },
  roofing_sheet: { label: 'Roofing sheets', unit: 'm²', price: 22000 },
  glass_window: { label: 'Window glass (unit)', unit: 'unit', price: 185000 },
  wooden_door: { label: 'Wooden door', unit: 'unit', price: 95000 },
  plumbing_set: { label: 'Plumbing fixtures (floor)', unit: 'set', price: 450000 },
  electrical_floor: { label: 'Electrical (per floor)', unit: 'set', price: 380000 },
  hvac_floor: { label: 'HVAC (per floor)', unit: 'set', price: 520000 },
  pool: { label: 'Swimming pool (built)', unit: 'unit', price: 8500000 },
  car_parking: { label: 'Parking / driveway', unit: 'unit', price: 1200000 },
  cctv_system: { label: 'CCTV security system', unit: 'set', price: 450000 },
  corrugated_roof: { label: 'Corrugated roof sheets', unit: 'm²', price: 28000 },
  solar_panel: { label: 'Solar panel array', unit: 'set', price: 3200000 },
  gate: { label: 'Front gate & fence', unit: 'unit', price: 980000 },
  worker_labor: { label: 'Construction labor (workers wages)', unit: 'project', price: 1 },
};

/**
 * Calculate material quantities from building design specs
 */
export function calculateMaterialQuantities({
  width = 8, depth = 6, floors = 1, areaSqft = 0, placedItems = [], buildingType = 'commercial',
  workerSalaryTotal = 0,
}) {
  const footprintM2 = width * depth;
  const totalAreaM2 = areaSqft ? areaSqft * 0.092903 : footprintM2 * floors;
  const wallAreaM2 = 2 * (width + depth) * 3 * floors;
  const slabVolumeM3 = footprintM2 * 0.15 * floors;

  const cementBags = Math.ceil(slabVolumeM3 * 7 + wallAreaM2 * 0.35);
  const sandM3 = Math.ceil(slabVolumeM3 * 0.45 + wallAreaM2 * 0.02);
  const gravelM3 = Math.ceil(slabVolumeM3 * 0.55);
  const steelKg = Math.ceil(totalAreaM2 * 12);
  const blocks = Math.ceil(wallAreaM2 * 12);
  const stoneM2 = Math.ceil(wallAreaM2 * 0.25);
  const extPaintL = Math.ceil(wallAreaM2 * 0.12);
  const intPaintL = Math.ceil(totalAreaM2 * 0.08);
  const tilesM2 = Math.ceil(totalAreaM2 * 0.85);
  const roofM2 = Math.ceil(footprintM2 * 1.15);
  const windows = Math.ceil(floors * (buildingType === 'residential' ? 6 : 16));
  const doors = Math.ceil(floors * 2 + 2);
  const furnitureCount = placedItems.length || Math.ceil(floors * 8);

  const rows = [
    { key: 'cement', quantity: cementBags },
    { key: 'sand', quantity: sandM3 },
    { key: 'gravel', quantity: gravelM3 },
    { key: 'steel', quantity: steelKg },
    { key: 'blocks', quantity: blocks },
    { key: 'stone_cladding', quantity: stoneM2 },
    { key: 'exterior_paint', quantity: extPaintL },
    { key: 'interior_paint', quantity: intPaintL },
    { key: 'floor_tiles', quantity: tilesM2 },
    { key: 'roofing_sheet', quantity: roofM2 },
    { key: 'glass_window', quantity: windows },
    { key: 'wooden_door', quantity: doors },
    { key: 'plumbing_set', quantity: floors },
    { key: 'electrical_floor', quantity: floors },
    { key: 'hvac_floor', quantity: buildingType === 'residential' ? Math.max(1, Math.ceil(floors / 2)) : floors },
  ];

  const footprintM2ForLabor = width * depth;
  const totalAreaForLabor = areaSqft ? areaSqft * 0.092903 : footprintM2ForLabor * floors;
  const laborTotal = workerSalaryTotal > 0
    ? Math.round(workerSalaryTotal)
    : Math.round(floors * 8_500_000 + totalAreaForLabor * 42_000);
  rows.push({ key: 'worker_labor', quantity: laborTotal });

  return rows.map(({ key, quantity }) => {
    const spec = RWANDA_UNIT_PRICES[key];
    const unitCost = spec.price;
    return {
      id: key,
      material: spec.label,
      unit: spec.unit,
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
      category: getCategory(key),
    };
  });
}

function getCategory(key) {
  if (key === 'worker_labor') return 'Labor';
  if (['cement', 'sand', 'gravel', 'steel', 'blocks'].includes(key)) return 'Structure';
  if (['stone_cladding', 'exterior_paint', 'roofing_sheet', 'glass_window', 'wooden_door'].includes(key)) return 'Envelope';
  if (['interior_paint', 'floor_tiles'].includes(key)) return 'Finishes';
  return 'MEP';
}

/** Interior + exterior items from placed catalog items */
export function calculateInteriorMaterials(placedItems = []) {
  const catalog = FURNITURE_CATALOG;
  const exteriorIds = {
    pool: 'pool', car: 'car_parking', cctv: 'cctv_system',
    'corrugated-roof': 'corrugated_roof', 'solar-panel': 'solar_panel', gate: 'gate',
  };
  const interiorPrices = {
    bed: 450000, furniture: 280000, kitchen: 650000, bathroom: 320000,
    light: 85000, decor: 120000,
  };

  const rows = [];
  placedItems.forEach((item) => {
    const extKey = exteriorIds[item.id];
    if (extKey && RWANDA_UNIT_PRICES[extKey]) {
      const spec = RWANDA_UNIT_PRICES[extKey];
      rows.push({
        id: `ext-${item.uid || item.id}`,
        material: `${item.name || spec.label}`,
        unit: spec.unit,
        quantity: 1,
        unitCost: spec.price,
        totalCost: spec.price,
        category: 'Exterior',
      });
      return;
    }
    const cat = catalog.find((c) => c.id === item.id)?.category || 'furniture';
    const unitCost = interiorPrices[cat] || 150000;
    rows.push({
      id: `item-${item.uid || item.id}`,
      material: item.name || `${cat} item`,
      unit: 'unit',
      quantity: 1,
      unitCost,
      totalCost: unitCost,
      category: cat === 'kitchen' || cat === 'bathroom' ? 'MEP' : 'Interior',
    });
  });

  if (rows.length) return rows;

  const byType = {};
  placedItems.forEach((item) => {
    const cat = catalog.find((c) => c.id === item.id)?.category || 'furniture';
    byType[cat] = (byType[cat] || 0) + 1;
  });
  return Object.entries(byType).map(([cat, qty]) => ({
    id: `interior-${cat}`,
    material: `${cat.charAt(0).toUpperCase() + cat.slice(1)} items`,
    unit: 'unit',
    quantity: qty,
    unitCost: interiorPrices[cat] || 150000,
    totalCost: qty * (interiorPrices[cat] || 150000),
    category: 'Interior',
  }));
}

export function summarizeMaterialCosts(materialRows, budget = 0) {
  const total = materialRows.reduce((s, r) => s + r.totalCost, 0);
  const byCategory = materialRows.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + r.totalCost;
    return acc;
  }, {});
  const variance = budget ? budget - total : 0;
  const overBudget = budget > 0 && total > budget;
  return { total, byCategory, variance, overBudget, budgetUsedPct: budget ? (total / budget) * 100 : 0 };
}
