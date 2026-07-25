const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { query } = require('../config/database');
const env = require('../config/env');
const aiService = require('./aiService');

const DESIGN_FLOOR_H = 3;

function designRenderKey(specs, savedAt) {
  const payload = JSON.stringify({
    w: specs.width,
    d: specs.depth,
    f: specs.floors,
    m: specs.materials,
    r: specs.floorRooms,
    door: specs.doorStyle,
    win: specs.windowStyle,
    at: savedAt || specs.savedAt,
  });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

function parseSpecs(row) {
  try {
    return typeof row.specifications === 'string'
      ? JSON.parse(row.specifications)
      : row.specifications || {};
  } catch {
    return {};
  }
}

async function persistRender(projectId, designId, specs, imageDataUri, designKey, provider) {
  const match = imageDataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const buffer = Buffer.from(match[2], 'base64');
  const ext = match[1].includes('png') ? '.png' : '.jpg';
  const relDir = path.join('projects', projectId);
  const absDir = path.join(process.cwd(), env.uploadDir, relDir);
  fs.mkdirSync(absDir, { recursive: true });
  const filename = `exterior-${designId}${ext}`;
  fs.writeFileSync(path.join(absDir, filename), buffer);
  const publicUrl = `/uploads/${relDir.replace(/\\/g, '/')}/${filename}`;

  specs.aiRenders = specs.aiRenders || {};
  specs.aiRenders.exterior = {
    url: publicUrl,
    designKey,
    provider: provider || 'flux',
    generatedAt: new Date().toISOString(),
    promptStored: true,
  };

  await query(
    'UPDATE building_designs SET specifications = $1 WHERE id = $2 AND project_id = $3',
    [JSON.stringify(specs), designId, projectId],
  );

  return specs.aiRenders.exterior;
}

/**
 * Server-side full-house render from saved design + floor plan (prompt built in backend only).
 */
async function generateExteriorForDesign(projectId, designId, options = {}) {
  const designResult = await query(
    `SELECT bd.*, p.name AS project_name, p.project_type, p.building_type, p.metadata AS project_metadata
     FROM building_designs bd JOIN projects p ON p.id = bd.project_id
     WHERE bd.id = $1 AND bd.project_id = $2`,
    [designId, projectId],
  );
  if (!designResult.rows.length) {
    return { skipped: true, reason: 'not_found' };
  }

  const row = designResult.rows[0];
  const specs = parseSpecs(row);
  let buildingStyle;
  try {
    const meta = typeof row.project_metadata === 'string' ? JSON.parse(row.project_metadata) : row.project_metadata;
    buildingStyle = meta?.buildingStyle;
  } catch {
    buildingStyle = undefined;
  }
  const savedAt = row.updated_at || row.created_at;
  const key = designRenderKey(specs, savedAt);

  const existing = specs.aiRenders?.exterior;
  if (existing?.url && existing.designKey === key && !options.force) {
    return { skipped: true, reason: 'already_saved', render: existing };
  }

  specs.renderPromptExport = specs.renderPromptExport || {};
  const promptResult = await aiService.generateRenderPrompt({
    specifications: specs,
    buildingType: row.building_type,
    projectType: row.project_type,
    buildingStyle,
    projectName: row.project_name || row.name,
    mode: 'exterior',
  });

  specs.renderPromptExport.exterior = {
    prompt: promptResult.prompt,
    negativePrompt: promptResult.negativePrompt,
    detailedPlan: promptResult.detailedPlan,
    geometry: promptResult.geometrySpec,
    updatedAt: new Date().toISOString(),
  };

  await query(
    'UPDATE building_designs SET specifications = $1 WHERE id = $2',
    [JSON.stringify(specs), designId],
  );

  const render = await aiService.generateBuildingRender({
    specifications: specs,
    buildingType: row.building_type,
    projectType: row.project_type,
    buildingStyle,
    projectName: row.project_name || row.name,
    mode: 'exterior',
    aspectRatio: '16:9',
    resolution: '1k',
    preferredProvider: options.preferredProvider || 'pollinations-flux',
  });

  if (!render?.imageDataUri) {
    return { error: 'generation_failed' };
  }

  const saved = await persistRender(
    projectId,
    designId,
    specs,
    render.imageDataUri,
    key,
    render.providerLabel || 'ai',
  );

  return { render: saved, designKey: key };
}

function scheduleExteriorRender(projectId, designId) {
  setImmediate(() => {
    generateExteriorForDesign(projectId, designId).catch((err) => {
      console.error('Background exterior render failed:', err.message);
    });
  });
}

module.exports = {
  generateExteriorForDesign,
  scheduleExteriorRender,
  designRenderKey,
  DESIGN_FLOOR_H,
};
