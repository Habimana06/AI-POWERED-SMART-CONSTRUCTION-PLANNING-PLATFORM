import { parseDesignSpecifications, resolveBuildingStyle } from './buildingAssets';
import { getSavedExteriorRender } from './designRenderKey';
import { getLockedProjectFields } from './projectMetadata';
import { buildCostSummary } from './designDocumentExport';

/** Build shared PDF/PPT payload from project + latest design (no floor-plan SVG). */
export function buildProjectExportContext(project, design) {
  const specs = parseDesignSpecifications(design?.specifications) || {};
  const lockedFields = getLockedProjectFields(project);
  const floors = Math.max(Number(specs.floors) || 0, Number(project?.floors) || 1);
  const width = specs.width || 8;
  const depth = specs.depth || 6;
  const placedItems = specs.placedItems || [];
  const floorRooms = specs.floorRooms || {};
  const roomCount = Object.values(floorRooms).flat().length;
  const buildingType = project?.buildingType || project?.building_type || project?.projectType;
  const buildingStyle = resolveBuildingStyle(specs, project);
  const savedAt = specs.savedAt || design?.updated_at || design?.created_at;
  const savedRender = getSavedExteriorRender(specs, savedAt);
  let houseImageUrl = savedRender?.url || null;
  if (houseImageUrl && !houseImageUrl.startsWith('http')) {
    houseImageUrl = `${window.location.origin}${houseImageUrl}`;
  }
  const budget = Number(project?.budget) || 0;
  const costData = buildCostSummary({
    width,
    depth,
    floors,
    areaSqft: project?.totalAreaSqft ?? project?.total_area_sqft,
    placedItems,
    buildingType,
    budget,
  });

  return {
    projectName: project?.name || 'Project',
    project,
    lockedFields,
    specs,
    width,
    depth,
    floors,
    roomCount,
    buildingStyle,
    houseImageUrl,
    costRows: costData.rows,
    costSummary: costData.summary,
    budget,
    location: project?.location || '',
    status: project?.status,
    progress: project?.progressPercentage ?? project?.progress_percentage,
    startDate: lockedFields.startDate,
    endDate: lockedFields.endDate,
    description: project?.description || lockedFields.requirements,
  };
}
