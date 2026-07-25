function parseProjectMetadata(project) {
  if (!project) return {};
  let meta = project.metadata;
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta); } catch { meta = {}; }
  }
  return meta && typeof meta === 'object' ? meta : {};
}

function applyMetadataToDesignSpecs(specs, projectRow) {
  const meta = parseProjectMetadata(projectRow);
  const facadeType = meta.facadeType || 'glass_curtain';
  let windowStyle = meta.windowStyle || specs.windowStyle || 'standard';
  if (facadeType === 'glass_curtain') windowStyle = 'curtain';
  const isRes = projectRow?.project_type === 'residential' || projectRow?.building_type === 'residential';

  return {
    ...specs,
    windowStyle,
    doorStyle: specs.doorStyle || (isRes ? 'glass' : 'glass'),
    projectMetadata: {
      requirements: meta.requirements || '',
      facadeType,
      roofType: meta.roofType || meta.topType || 'flat',
      createdVia: meta.createdVia || (meta.aiPrompt ? 'prompt' : 'manual'),
      aiPrompt: meta.aiPrompt || '',
    },
    creationMethod: meta.createdVia || (meta.aiPrompt ? 'prompt' : 'manual'),
  };
}

module.exports = { parseProjectMetadata, applyMetadataToDesignSpecs };
