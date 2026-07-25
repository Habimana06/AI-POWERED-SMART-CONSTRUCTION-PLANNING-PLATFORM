const env = require('../config/env');

const GROQ_URL = `${env.groq.baseUrl}/chat/completions`;

/** Rwanda construction benchmarks (FRw) — 2024-2026 regional estimates */
const RWANDA_BENCHMARKS = {
  residentialPerSqft: { min: 85000, avg: 125000, max: 180000 },
  commercialPerSqft: { min: 120000, avg: 175000, max: 280000 },
  industrialPerSqft: { min: 95000, avg: 140000, max: 200000 },
  laborShare: 0.38,
  materialShare: 0.42,
  equipmentShare: 0.08,
  contingencyShare: 0.07,
  overheadShare: 0.05,
};

function parseJson(content) {
  if (!content) return null;
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

async function callGroq(messages, options = {}) {
  if (!env.groq.apiKey) {
    return { content: '', mock: true };
  }

  const body = {
    model: env.groq.model,
    messages,
    temperature: options.temperature ?? 0.25,
    max_tokens: options.maxTokens ?? 4096,
  };
  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.groq.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return { content: data.choices?.[0]?.message?.content || '', usage: data.usage, mock: false };
}

function buildProjectContext(context) {
  const p = context.project || context;
  if (!p || !p.name) return 'No project selected.';
  return [
    `Project: ${p.name}`,
    `Type: ${p.project_type || p.projectType}/${p.building_type || p.buildingType}`,
    `Location: ${p.location || 'Rwanda'}`,
    `Floors: ${p.floors}, Area: ${p.total_area_sqft || p.totalAreaSqft} sqft`,
    `Budget: ${Number(p.budget || 0).toLocaleString()} FRw`,
    `Timeline: ${p.start_date || p.startDate} to ${p.end_date || p.endDate}`,
    `Progress: ${p.progress_percentage ?? p.progressPercentage ?? 0}%`,
    `Requirements: ${p.description || ''} ${p.metadata?.requirements || p.metadata?.aiPrompt || ''}`.trim(),
  ].join('\n');
}

async function chat(messages, context = {}) {
  const projectCtx = buildProjectContext(context);
  const systemPrompt = `You are BuildPlan AI, an expert construction planning assistant for Rwanda.
RULES:
- Always use Rwandan Franc (FRw) for costs. Never use USD unless asked to convert.
- Base answers ONLY on the project data provided. If data is missing, say what you need.
- Be precise with numbers, dates, and construction terminology.
- Reference Rwanda building codes and local material availability when relevant.

PROJECT CONTEXT:
${projectCtx}`;

  const result = await callGroq([
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ], { temperature: 0.3 });

  const reply = result.mock
    ? `[Demo Mode] Configure GROQ_API_KEY for live AI. Based on project context: ${projectCtx.split('\n')[0]}. Ask about costs, schedule, risks, or design.`
    : result.content;

  return { reply, usage: result.usage, mock: result.mock };
}

function computeFallbackDesign(params) {
  const { projectType, buildingType, floors, areaSqft } = params;
  const isRes = projectType === 'residential' || buildingType === 'residential';
  const f = Number(floors) || 2;
  const area = Number(areaSqft) || 2000;
  const footprint = Math.sqrt(area / f);
  const width = isRes ? Math.max(8, Math.round(footprint / 8)) : Math.max(10, Math.round(footprint / 10));
  const depth = Math.round(width * (isRes ? 0.85 : 0.75));

  return {
    name: `${buildingType || projectType} Design`,
    description: `${f}-floor ${buildingType} building, ${area} sqft total`,
    width,
    depth,
    floors: f,
    buildingStyle: isRes ? 'residential' : 'commercial',
    materials: {
      wallColor: isRes ? '#F5F5F5' : '#D5DBDB',
      roofColor: '#FAFAFA',
      accentColor: isRes ? '#8B7355' : '#E67E22',
      stoneColor: '#7F8C8D',
    },
    doorStyle: 'glass',
    windowStyle: isRes ? 'standard' : 'curtain',
    viewMode: isRes ? 'cutaway' : 'exterior',
    placedItems: isRes ? [
      { id: 'sofa', floor: 1, x: -1, z: 1 },
      { id: 'bed-double', floor: 1, x: -2.5, z: -2 },
      { id: 'stove', floor: 1, x: 2.5, z: -1.5 },
      { id: 'tv', floor: 1, x: -0.5, z: 2.5, y: 0 },
      { id: 'light-chandelier', floor: 1, x: 0, z: 0, y: 0 },
      { id: 'toilet', floor: 1, x: 2, z: 2.5 },
      { id: 'wardrobe', floor: 1, x: -3, z: 0.5 },
    ] : [],
    recommendations: [
      { title: 'Energy-Efficient Glazing', desc: 'Double-glazed windows reduce cooling costs 15-20%', impact: 'Cost +8%' },
      { title: 'Local Material Sourcing', desc: 'Use Rwanda-made cement and steel where possible', impact: 'Timeline -1 week' },
    ],
  };
}

async function generateBuildingDesign(params) {
  const { projectType, buildingType, floors, areaSqft, requirements, location, budget } = params;
  const prompt = `Design a construction building for Rwanda. Return JSON with EXACT keys:
{
  "name": "string",
  "description": "string",
  "width": number (meters, 6-20),
  "depth": number (meters, 5-16),
  "floors": number,
  "buildingStyle": "residential" or "commercial",
  "materials": { "wallColor": "#hex", "roofColor": "#hex", "accentColor": "#hex", "stoneColor": "#hex" },
  "doorStyle": "wood|glass|metal",
  "windowStyle": "standard|tinted|curtain",
  "viewMode": "cutaway|exterior|interior",
  "placedItems": [{ "id": "sofa|bed-double|stove|tv|toilet|sink|wardrobe|light-chandelier", "floor": 1, "x": 0, "z": 0 }],
  "rooms": [{ "label": "string", "floor": 1, "widthFt": number, "depthFt": number }],
  "recommendations": [{ "title": "string", "desc": "string", "impact": "string" }],
  "estimatedTimelineMonths": number,
  "estimatedCostFRw": number
}
INPUT: Type=${projectType}, Building=${buildingType}, Floors=${floors}, Area=${areaSqft}sqft, Location=${location || 'Kigali,Rwanda'}, Budget=${budget || 'N/A'}FRw, Requirements=${requirements || 'standard'}`;

  const result = await callGroq([
    { role: 'system', content: 'You are a Rwanda-licensed architect. Return ONLY valid JSON. Dimensions in meters. Costs in FRw.' },
    { role: 'user', content: prompt },
  ], { temperature: 0.2, jsonMode: true });

  const parsed = parseJson(result.content);
  const fallback = computeFallbackDesign(params);
  const design = parsed ? { ...fallback, ...parsed, specifications: parsed } : fallback;

  return { design, raw: result.content, mock: result.mock };
}

function computeFallbackCost(params) {
  const { projectType, areaSqft, floors, budget } = params;
  const area = Number(areaSqft) || 10000;
  const f = Number(floors) || 1;
  const rates = RWANDA_BENCHMARKS[`${projectType}PerSqft`] || RWANDA_BENCHMARKS.commercialPerSqft;
  let total = Math.round(area * rates.avg * (1 + (f - 1) * 0.12));
  if (budget && budget > 0) total = Math.round((total + Number(budget)) / 2);

  const labor = Math.round(total * RWANDA_BENCHMARKS.laborShare);
  const material = Math.round(total * RWANDA_BENCHMARKS.materialShare);
  const equipment = Math.round(total * RWANDA_BENCHMARKS.equipmentShare);
  const contingency = Math.round(total * RWANDA_BENCHMARKS.contingencyShare);
  const overhead = Math.round(total * RWANDA_BENCHMARKS.overheadShare);

  return {
    totalEstimatedCost: total,
    laborCost: labor,
    materialCost: material,
    equipmentCost: equipment,
    contingencyCost: contingency,
    overheadCost: overhead,
    breakdown: [
      { category: 'Structure & Foundation', amount: Math.round(total * 0.32), percentage: 32 },
      { category: 'MEP (Electrical/Plumbing/HVAC)', amount: Math.round(total * 0.22), percentage: 22 },
      { category: 'Finishes & Interior', amount: Math.round(total * 0.18), percentage: 18 },
      { category: 'Labor', amount: labor, percentage: 38 },
      { category: 'Equipment & Tools', amount: equipment, percentage: 8 },
      { category: 'Contingency', amount: contingency, percentage: 7 },
    ],
    confidenceScore: 82,
    notes: `Estimate based on Rwanda benchmark ${rates.avg.toLocaleString()} FRw/sqft for ${projectType} projects.`,
    currency: 'FRw',
  };
}

async function estimateCost(params) {
  const { projectType, areaSqft, floors, location, budget } = params;
  const benchmark = RWANDA_BENCHMARKS[`${projectType}PerSqft`] || RWANDA_BENCHMARKS.commercialPerSqft;

  const prompt = `Estimate construction cost for Rwanda. Return JSON:
{
  "totalEstimatedCost": number (FRw),
  "laborCost": number, "materialCost": number, "equipmentCost": number,
  "contingencyCost": number, "overheadCost": number,
  "breakdown": [{ "category": "string", "amount": number, "percentage": number }],
  "confidenceScore": number (0-100),
  "costPerSqft": number (FRw),
  "notes": "string",
  "currency": "FRw"
}
Use benchmark range ${benchmark.min}-${benchmark.max} FRw/sqft for ${projectType}.
Project: ${areaSqft} sqft, ${floors} floors, ${location}, budget hint ${budget || 'none'} FRw.
Cross-check: total should ≈ area × costPerSqft × floor multiplier (1 + 0.12 per extra floor).`;

  const result = await callGroq([
    { role: 'system', content: 'You are a Rwanda QS (Quantity Surveyor). Return ONLY valid JSON. All costs in FRw.' },
    { role: 'user', content: prompt },
  ], { temperature: 0.15, jsonMode: true });

  const parsed = parseJson(result.content);
  const fallback = computeFallbackCost(params);
  const estimation = parsed ? {
    ...fallback,
    ...parsed,
    breakdown: (parsed.breakdown || []).map((b) => ({
      category: b.category,
      amount: b.amount ?? b.cost,
      percentage: b.percentage,
    })),
  } : fallback;

  return { estimation, mock: result.mock };
}

async function predictRisks(params) {
  const { projectName, projectType, timeline, budget, location, currentProgress, materialsSummary } = params;
  const materialCtx = materialsSummary
    ? `\nMaterials from saved 3D design (total est. ${Number(materialsSummary.totalMaterialCost || 0).toLocaleString()} FRw):
- ${(materialsSummary.topMaterials || []).join('\n- ')}
- Placed items: ${materialsSummary.placedItemCount || 0}
- Exterior features: ${(materialsSummary.exteriorItems || []).join(', ') || 'none'}
- Paint/finish colors: ${JSON.stringify(materialsSummary.materials || {})}
Assess risks specific to these materials (import delays, weather sensitivity, supply chain, cost overrun).`
    : '';
  const prompt = `Analyze construction risks for Rwanda project. Return JSON:
{ "risks": [{ "riskType": "string", "riskLevel": "low|medium|high|critical", "probability": 0-100, "impactScore": 0-10, "description": "string", "mitigationPlan": "string" }] }
Provide 5-7 specific risks. Consider: Rwanda rainy seasons (Mar-May, Oct-Nov), material import delays, REB licensing, local labor availability.
Project: ${projectName}, Type: ${projectType}, Timeline: ${timeline}, Budget: ${budget} FRw, Location: ${location}, Progress: ${currentProgress}%${materialCtx}`;

  const result = await callGroq([
    { role: 'system', content: 'You are a Rwanda construction risk analyst. Return ONLY valid JSON.' },
    { role: 'user', content: prompt },
  ], { temperature: 0.2, jsonMode: true });

  const parsed = parseJson(result.content);
  if (parsed?.risks?.length) return { risks: parsed.risks, mock: result.mock };

  return {
    risks: [
      { riskType: 'Rainy Season Delay', riskLevel: 'high', probability: 65, impactScore: 7, description: 'Heavy rains Mar-May may delay foundation and roofing in ' + location, mitigationPlan: 'Schedule critical outdoor work in dry season (Jun-Sep); use weather covers' },
      { riskType: 'Material Import Lead Time', riskLevel: 'medium', probability: 45, impactScore: 6, description: 'Imported steel/glass may face 3-6 week customs delays', mitigationPlan: 'Pre-order materials 8 weeks ahead; identify local alternatives' },
      { riskType: 'Cost Escalation', riskLevel: 'medium', probability: 50, impactScore: 8, description: `Budget ${Number(budget).toLocaleString()} FRw may be insufficient for scope`, mitigationPlan: 'Lock supplier prices; maintain 10% contingency reserve' },
      { riskType: 'Permit & REB Approval', riskLevel: 'low', probability: 30, impactScore: 5, description: 'Building permit processing in Rwanda averages 4-8 weeks', mitigationPlan: 'Submit complete drawings early; engage local architect' },
      { riskType: 'Skilled Labor Shortage', riskLevel: 'medium', probability: 40, impactScore: 6, description: 'MEP specialists scarce in ' + location, mitigationPlan: 'Contract skilled teams early; cross-train local workers' },
    ],
    mock: result.mock,
  };
}

async function generateSchedule(params) {
  const { projectName, startDate, endDate, tasks, teamSize } = params;
  const prompt = `Create CPM construction schedule for Rwanda. Return JSON:
{
  "scheduleName": "string", "totalDurationWeeks": number,
  "phases": [{ "name": "string", "durationWeeks": number, "startWeek": number, "tasks": ["string"], "dependencies": ["string"] }],
  "criticalPath": ["string"],
  "recommendations": ["string"]
}
Project: ${projectName}, Start: ${startDate}, End: ${endDate}, Team: ${teamSize || 15}, Tasks: ${JSON.stringify(tasks || [])}
Account for Rwanda rainy seasons — avoid scheduling earthworks and roofing during Mar-May and Oct-Nov.`;

  const result = await callGroq([
    { role: 'system', content: 'You are a CPM scheduler for Rwanda construction. Return ONLY valid JSON. Durations in weeks.' },
    { role: 'user', content: prompt },
  ], { temperature: 0.2, jsonMode: true });

  const parsed = parseJson(result.content);
  if (parsed) return { schedule: parsed, mock: result.mock };

  return {
    schedule: {
      scheduleName: `${projectName} Master Schedule`,
      totalDurationWeeks: 52,
      phases: [
        { name: 'Pre-Construction & Permits', durationWeeks: 6, startWeek: 0, tasks: ['Site survey', 'REB permit', 'Mobilization'], dependencies: [] },
        { name: 'Foundation & Structure', durationWeeks: 16, startWeek: 6, tasks: ['Excavation', 'Foundation', 'Structural frame'], dependencies: ['Pre-Construction & Permits'] },
        { name: 'MEP & Envelope', durationWeeks: 14, startWeek: 22, tasks: ['Electrical', 'Plumbing', 'HVAC', 'Facade'], dependencies: ['Foundation & Structure'] },
        { name: 'Finishes & Commissioning', durationWeeks: 12, startWeek: 36, tasks: ['Interior finishes', 'Landscaping', 'Inspection'], dependencies: ['MEP & Envelope'] },
      ],
      criticalPath: ['REB permit', 'Foundation', 'Structural frame', 'Facade', 'Inspection'],
      recommendations: ['Avoid foundation work during rainy season', 'Weekly progress meetings', '10% schedule buffer'],
    },
    mock: result.mock,
  };
}

const {
  buildDesignGeometrySpec,
  buildGeometryLockedPrompt,
  buildTextOnlyAccuratePrompt,
  FLOOR_H: DESIGN_FLOOR_H,
  computeRenderAspectRatio,
} = require('../utils/designSpec');

function summarizeRoomsForRender(floorRooms = {}) {
  return Object.entries(floorRooms).flatMap(([fl, rooms]) =>
    (rooms || []).map((r) => `Floor ${fl}: ${r.label} (${Number(r.w || 0).toFixed(1)}m × ${Number(r.h || 0).toFixed(1)}m)`)
  ).slice(0, 20);
}

function formatDetailedFloorPlan(floorRooms = {}, width = 8, depth = 6) {
  const w = Number(width) || 8;
  const d = Number(depth) || 6;
  return Object.entries(floorRooms)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([fl, rooms]) => {
      const list = (rooms || []).map((r) => {
        const xPct = (((r.x || 0) / w) * 100).toFixed(0);
        const yPct = (((r.y || 0) / d) * 100).toFixed(0);
        const wPct = (((r.w || 0) / w) * 100).toFixed(0);
        const hPct = (((r.h || 0) / d) * 100).toFixed(0);
        return `${r.label} [${wPct}%×${hPct}% at x${xPct}% y${yPct}%]`;
      });
      return `Level ${fl}: ${list.join('; ') || 'open plan'}`;
    })
    .join('\n');
}

function buildStrictRenderPrompt({
  prompt,
  negativePrompt,
  mode = 'exterior',
  floor,
}) {
  const avoid = negativePrompt || 'cars, vehicles, people, extra buildings, wrong floor count, swimming pool, cartoon, sketch, watermark';
  const modeHint = mode === 'floorplan'
    ? `Photorealistic architectural isometric cutaway of floor ${floor || 1} interior matching the exact 2D blueprint room positions.`
    : 'Photorealistic architectural exterior photograph matching the exact 3D massing and floor plan layout.';
  return `${modeHint} ${prompt}. CRITICAL: Match exact floor count, footprint dimensions, room names and positions from the plan. Single building only. Avoid: ${avoid}.`;
}

async function generateRenderPrompt(params) {
  const {
    specifications = {},
    buildingType,
    projectType,
    buildingStyle,
    projectName = 'Building',
    mode = 'exterior',
    floor,
  } = params;

  const specs = specifications;
  const floors = Math.max(1, Number(specs.floors) || 1);
  const width = Number(specs.width) || 8;
  const depth = Number(specs.depth) || 6;
  const totalHeightM = floors * DESIGN_FLOOR_H;
  const materials = specs.materials || {};
  const geo = buildDesignGeometrySpec(specs, buildingStyle, buildingType || projectType);
  const rooms = summarizeRoomsForRender(specs.floorRooms || {});
  const detailedPlan = formatDetailedFloorPlan(specs.floorRooms || {}, width, depth);
  const typeLabel = buildingStyle === 'commercial'
    ? 'commercial/office building'
    : (buildingType || projectType || 'residential building');

  const designBlock = [
    `Project: ${projectName}`,
    `Building type: ${typeLabel}`,
    `Exact floors: ${floors} (must match — do not add or remove floors)`,
    `Total height: ${totalHeightM} meters (${DESIGN_FLOOR_H}m per floor)`,
    `Footprint: ${width} meters wide × ${depth} meters deep`,
    `Wall color: ${materials.wallColor || 'light grey'}`,
    `Accent: ${materials.accentColor || 'orange'}`,
    `Roof: ${materials.roofColor || 'dark grey'}`,
    `Stone/trim: ${materials.stoneColor || 'grey'}`,
    `Door style: ${specs.doorStyle || 'wood'}`,
    `Window style: ${specs.windowStyle || 'standard'}`,
    rooms.length ? `Room layout:\n${rooms.join('\n')}` : 'Room layout: standard rectangular plan',
    detailedPlan ? `Detailed 2D plan (must match exactly):\n${detailedPlan}` : '',
  ].filter(Boolean).join('\n');

  const system = mode === 'floorplan'
    ? `You write prompts for architectural visualization AI. Return ONLY valid JSON: { "prompt": "...", "negativePrompt": "..." }.
Describe an isometric/cutaway interior view of ONE floor matching the exact 2D blueprint room positions and labels.
Do NOT invent rooms not in the plan. No furniture unless implied by room type.`
    : `You write prompts for architectural photography AI image models.
Return ONLY valid JSON: { "prompt": "...", "negativePrompt": "..." }.
The prompt must describe ONE building matching the design exactly — ${geo.strictGeometryLine}.
Photorealistic exterior, professional real estate photo. Tall proportional tower if many floors on small footprint.
Do NOT invent features not in the design (no cars, pools, extra wings, wrong floor count or height).`;

  const floorRooms = specs.floorRooms || {};
  const floorKey = String(floor || 1);
  const floorOnly = floorRooms[floorKey] || floorRooms[floor] || [];
  const floorPlanBlock = mode === 'floorplan' && floorOnly.length
    ? `Floor ${floor} rooms only:\n${floorOnly.map((r) => `${r.label} ${Number(r.w || 0).toFixed(1)}m×${Number(r.h || 0).toFixed(1)}m`).join(', ')}`
    : '';

  const user = mode === 'floorplan'
    ? `Write an image prompt for floor ${floor || 1} interior matching this construction plan:\n\n${designBlock}\n${floorPlanBlock}`
    : `Write an image-generation prompt for this construction plan:\n\n${designBlock}`;

  const result = await callGroq([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], { temperature: 0.15, jsonMode: true, maxTokens: 800 });

  const parsed = parseJson(result.content);
  const fallbackPrompt = buildTextOnlyAccuratePrompt(geo, `Photorealistic ${floors}-story ${typeLabel}, ${width}m×${depth}m, ${materials.wallColor || 'light grey'} walls`);

  return {
    prompt: parsed?.prompt || fallbackPrompt,
    negativePrompt: parsed?.negativePrompt || 'wrong height, wrong floor count, extra floors, shorter building, wider building, cars, vehicles, people, crowds, extra buildings, swimming pool, cartoon, sketch',
    detailedPlan,
    geometrySpec: geo,
    mock: result.mock,
  };
}

function isXaiBillingError(message = '') {
  return /403|permission-denied|doesn't have any credits|no credits|licenses yet/i.test(message);
}

async function generateBuildingRender(params) {
  const {
    specifications = {},
    buildingType,
    projectType,
    buildingStyle,
    projectName = 'Building',
    referenceImage,
    referenceImages = [],
    mode = 'exterior',
    floor,
    aspectRatio = '16:9',
    resolution = '1k',
    preferredProvider = 'auto',
  } = params;

  const refs = referenceImages?.length
    ? referenceImages
    : referenceImage
      ? [referenceImage]
      : [];

  const promptResult = await generateRenderPrompt({
    specifications,
    buildingType,
    projectType,
    buildingStyle,
    projectName,
    mode,
    floor,
  });

  const geo = promptResult.geometrySpec || buildDesignGeometrySpec(
    specifications,
    buildingStyle,
    buildingType || projectType,
  );

  const exteriorAspect = mode === 'exterior'
    ? computeRenderAspectRatio(geo)
    : aspectRatio;

  const geometryPrompt = refs.length && mode === 'exterior'
    ? buildGeometryLockedPrompt(geo, {
      doorStyle: specifications.doorStyle,
      windowStyle: specifications.windowStyle,
    })
    : buildTextOnlyAccuratePrompt(geo, promptResult.prompt);

  const fullPrompt = buildStrictRenderPrompt({
    prompt: geometryPrompt,
    negativePrompt: promptResult.negativePrompt,
    mode,
    floor,
  });

  const imageRenderService = require('./imageRenderService');
  const render = await imageRenderService.generateWithProviders({
    fullPrompt,
    geometryPrompt,
    referenceImage: refs[0],
    referenceImages: refs,
    aspectRatio: exteriorAspect,
    resolution,
    specifications,
    buildingStyle,
    buildingType,
    mode,
    preferredProvider,
  });

  return {
    imageDataUri: render.imageDataUri,
    prompt: fullPrompt,
    geometryPrompt,
    geometrySpec: geo,
    negativePrompt: promptResult.negativePrompt,
    detailedPlan: promptResult.detailedPlan,
    usedReference: render.usedReference,
    mock: promptResult.mock,
    provider: render.provider,
    providerLabel: render.providerLabel,
    model: render.model,
    attempts: render.attempts,
    billingRequired: render.billingRequired,
    billingMessage: render.billingMessage,
    grokError: render.attempts?.find((a) => a.provider === 'grok')?.error && isXaiBillingError(render.attempts.find((a) => a.provider === 'grok').error)
      ? render.attempts.find((a) => a.provider === 'grok').error
      : null,
  };
}

async function analyzeProgress(params) {
  const { projectName, plannedProgress, actualProgress, tasks, issues } = params;
  const variance = actualProgress - plannedProgress;
  const prompt = `Analyze project progress. Return JSON with: overallAssessment, progressVariance (${variance}), scheduleStatus (on_track|at_risk|delayed), budgetImpact, taskAnalysis (array), recommendations (array), forecastedCompletion.
Project: ${projectName}, Planned: ${plannedProgress}%, Actual: ${actualProgress}%, Tasks: ${JSON.stringify(tasks || [])}, Issues: ${JSON.stringify(issues || [])}`;

  const result = await callGroq([
    { role: 'system', content: 'You are a construction project analyst. Return ONLY valid JSON.' },
    { role: 'user', content: prompt },
  ], { temperature: 0.2, jsonMode: true });

  const parsed = parseJson(result.content);
  return {
    analysis: parsed || {
      overallAssessment: variance >= 0 ? 'On track' : 'Behind schedule',
      progressVariance: variance,
      scheduleStatus: variance >= -5 ? 'on_track' : variance >= -15 ? 'at_risk' : 'delayed',
      recommendations: ['Increase resources on critical path', 'Review supplier lead times'],
    },
    mock: result.mock,
  };
}

/**
 * Compare contractor material request to plan + site usage (rule-based; works offline).
 */
function reviewMaterialRequest({
  projectName,
  materialName,
  quantity = 0,
  unit = '',
  plannedQty = 0,
  usedQty = 0,
  contractorNotes = '',
}) {
  const q = Number(quantity) || 0;
  const planned = Number(plannedQty) || 0;
  const used = Number(usedQty) || 0;
  const remaining = Math.max(0, planned - used);
  const afterRequest = remaining - q;
  const overPct = planned > 0 ? ((q - remaining) / planned) * 100 : 0;
  const tooMuch = q > remaining * 1.05 && remaining >= 0;

  let severity = 'ok';
  if (tooMuch && overPct > 25) severity = 'high';
  else if (tooMuch) severity = 'warn';

  const contractorMessage = tooMuch
    ? `You are requesting ${q} ${unit} but only ~${remaining.toFixed(1)} ${unit} remain on the plan for "${materialName}". Consider lowering the quantity to avoid over-ordering.`
    : `Request fits the plan: ~${Math.max(0, afterRequest).toFixed(1)} ${unit} would remain after approval.`;

  const pmMessage = `Contractor requested ${q} ${unit} of ${materialName} on ${projectName || 'project'}. `
    + `Plan: ${planned} ${unit}, used on site: ${used} ${unit}, remaining: ${remaining} ${unit}. `
    + (contractorNotes ? `Their note: "${contractorNotes.slice(0, 200)}". ` : '')
    + (tooMuch
      ? `AI flags possible over-request (${overPct.toFixed(0)}% above remaining) — verify before approving.`
      : 'AI: quantity aligns with remaining budget of materials.');

  return {
    severity,
    plannedQty: planned,
    usedQty: used,
    remainingQty: remaining,
    requestedQty: q,
    tooMuch,
    suggestedQty: tooMuch ? Math.max(0, Math.ceil(remaining)) : q,
    contractorMessage,
    pmMessage,
  };
}

module.exports = {
  chat,
  generateBuildingDesign,
  generateRenderPrompt,
  generateBuildingRender,
  estimateCost,
  predictRisks,
  generateSchedule,
  analyzeProgress,
  reviewMaterialRequest,
  callGroq,
  RWANDA_BENCHMARKS,
};
