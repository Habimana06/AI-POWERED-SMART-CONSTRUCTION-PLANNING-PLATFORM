/** Map locked create-project metadata into 3D editor + render parameters */
export function metadataToDesignOverrides(project) {
  const meta = parseProjectMetadata(project);
  const locked = {
    requirements: meta.requirements || project?.description || '',
    roofType: meta.roofType || meta.topType || 'flat',
    facadeType: meta.facadeType || 'glass_curtain',
    windowStyle: meta.windowStyle || 'standard',
    totalWindows: meta.totalWindows,
    parkingLevels: meta.parkingLevels,
    createdVia: meta.createdVia || 'manual',
    aiPrompt: meta.aiPrompt || '',
  };

  let windowStyle = locked.windowStyle;
  if (locked.facadeType === 'glass_curtain') windowStyle = 'curtain';
  else if (locked.facadeType === 'brick' || locked.facadeType === 'stone') windowStyle = 'standard';

  const isResidential = project?.projectType === 'residential'
    || project?.buildingType === 'residential'
    || /resident|house|home|villa/.test(String(project?.buildingType || '').toLowerCase());

  const materials = {
    wallColor: locked.facadeType === 'brick' ? '#A0522D' : isResidential ? '#F5F5F5' : '#D5DBDB',
    roofColor: locked.roofType === 'green' ? '#27AE60' : locked.roofType === 'metal' ? '#566573' : '#FAFAFA',
    accentColor: isResidential ? '#8B7355' : '#E67E22',
    stoneColor: locked.facadeType === 'stone' ? '#95A5A6' : '#7F8C8D',
  };

  return {
    windowStyle,
    doorStyle: isResidential ? 'glass' : 'glass',
    materials,
    buildingStyle: isResidential ? 'residential' : 'commercial',
    projectMetadata: locked,
    creationMethod: locked.createdVia === 'prompt' ? 'prompt' : 'manual',
  };
}

/** Parse locked project specs from create-project (used by cost, risk, monitoring). */
export function parseProjectMetadata(project) {
  if (!project) return {};
  let meta = project.metadata;
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta); } catch { meta = {}; }
  }
  return meta && typeof meta === 'object' ? meta : {};
}

export function getLockedProjectFields(project) {
  const meta = parseProjectMetadata(project);
  return {
    name: project?.name,
    description: project?.description,
    projectType: project?.projectType || project?.project_type,
    buildingType: project?.buildingType || project?.building_type,
    totalAreaSqft: project?.totalAreaSqft ?? project?.total_area_sqft,
    floors: project?.floors,
    budget: project?.budget,
    location: project?.location,
    startDate: project?.startDate || project?.start_date,
    endDate: project?.endDate || project?.end_date,
    priority: project?.priority,
    requirements: meta.requirements || project?.description || '',
    roofType: meta.roofType || 'flat',
    topType: meta.topType || meta.roofType || 'flat',
    totalWindows: meta.totalWindows ?? null,
    facadeType: meta.facadeType || 'glass',
    parkingLevels: meta.parkingLevels ?? 0,
    windowStyle: meta.windowStyle || 'standard',
    workerSalaryTotal: meta.workerSalaryTotal ?? meta.workerSalary ?? 0,
    createdVia: meta.createdVia || 'manual',
    aiPrompt: meta.aiPrompt || '',
  };
}
