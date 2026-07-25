import { useRef, useMemo, useState } from 'react';
import { Map, Home } from 'lucide-react';
import { parseDesignSpecifications, resolveBuildingStyle } from '../utils/buildingAssets';
import FloorPlanViewer from './FloorPlanViewer';
import AIHouseRender from './AIHouseRender';
import PresentationDownloadBar from './PresentationDownloadBar';
import {
  buildCostSummary,
  exportFloorPlanPdf,
  exportFullHousePdf,
} from '../utils/designDocumentExport';
import { getSavedExteriorRender } from '../utils/designRenderKey';

const OUTPUT_VIEWS = [
  { id: 'floor-plan', label: 'Floor plan', icon: Map },
  { id: 'exterior', label: 'Full house', icon: Home },
];

function DesignOutputsBody({ project, design, readOnly, showDownloads }) {
  const floorPlanRef = useRef(null);
  const [planFloor, setPlanFloor] = useState(1);
  const [outputView, setOutputView] = useState('floor-plan');

  const specs = parseDesignSpecifications(design.specifications) || {};
  const floors = Math.max(specs.floors || 0, project?.floors || 1);
  const width = specs.width || 8;
  const depth = specs.depth || 6;
  const floorRooms = specs.floorRooms || {};
  const buildingType = project?.buildingType || project?.projectType;
  const buildingStyle = resolveBuildingStyle(specs, project);
  const savedAt = specs.savedAt || design.updated_at || design.updatedAt || design.created_at || design.createdAt;
  const roomCount = Object.values(floorRooms).flat().length;
  const projectId = project?.id;
  const designId = design.id;

  const costData = useMemo(
    () =>
      buildCostSummary({
        width,
        depth,
        floors,
        areaSqft: project?.totalAreaSqft,
        placedItems: specs.placedItems || [],
        buildingType,
        budget: project?.budget,
      }),
    [width, depth, floors, project?.totalAreaSqft, specs.placedItems, buildingType, project?.budget],
  );

  const savedRender = getSavedExteriorRender(specs, savedAt);

  const floorPlanExportBase = () => ({
    svgEl: floorPlanRef.current,
    projectName: project?.name,
    activeFloor: planFloor,
    width,
    depth,
    floors,
    roomCount,
  });

  const fullHouseExportBase = () => {
    let houseImageUrl = savedRender?.url || null;
    if (houseImageUrl && !houseImageUrl.startsWith('http')) {
      houseImageUrl = `${window.location.origin}${houseImageUrl}`;
    }
    if (!houseImageUrl) {
      const img = document.querySelector('[data-house-render]');
      houseImageUrl = img?.src || null;
    }
    return {
      projectName: project?.name,
      houseImageUrl,
      width,
      depth,
      floors,
      roomCount,
      buildingStyle,
      costRows: costData.rows,
      costSummary: costData.summary,
      budget: project?.budget || 0,
      location: project?.location,
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {OUTPUT_VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setOutputView(id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              outputView === id ? 'bg-primary text-white shadow-md' : 'bg-white border border-steel-100 text-steel hover:border-primary'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
        {readOnly && (
          <span className="text-[11px] text-concrete ml-auto">View only — same as PM design output</span>
        )}
      </div>

      {outputView === 'floor-plan' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center bg-white rounded-xl border border-steel-100 p-3">
            <span className="text-sm font-bold text-steel uppercase tracking-wide mr-1">Level:</span>
            {Array.from({ length: Math.min(floors, 15) }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPlanFloor(i + 1)}
                className={`rounded-xl px-3 py-1.5 text-sm font-bold transition-all ${
                  planFloor === i + 1 ? 'bg-primary text-white' : 'bg-steel-50 text-steel hover:bg-steel-100'
                }`}
              >
                L{i + 1}
              </button>
            ))}
          </div>

          <FloorPlanViewer
            ref={floorPlanRef}
            width={width}
            depth={depth}
            floors={floors}
            activeFloor={planFloor}
            buildingType={buildingType}
            floorRooms={floorRooms}
            projectName={project?.name}
          />

          {showDownloads && (
            <PresentationDownloadBar
              pdfLabel="Download floor plan PDF"
              onExportPdf={() => exportFloorPlanPdf(floorPlanExportBase())}
            />
          )}
        </div>
      )}

      {outputView === 'exterior' && (
        <div className="card w-full !p-4">
          <h3 className="text-sm font-semibold text-steel mb-2 flex items-center gap-2">
            <Home className="h-3.5 w-3.5 text-primary" /> Full house render
          </h3>
          {showDownloads && (
            <PresentationDownloadBar
              className="mb-4"
              pdfLabel="Download full house PDF"
              onExportPdf={() => exportFullHousePdf(fullHouseExportBase())}
            />
          )}
          <AIHouseRender
            specs={specs}
            projectName={project?.name}
            buildingType={buildingType}
            projectType={project?.projectType}
            buildingStyle={buildingStyle}
            mode="exterior"
            savedAt={savedAt}
            projectId={projectId}
            designId={designId}
          />
          <p className="text-[10px] text-concrete mt-3">
            {design.name}
            {savedAt ? ` · updated ${new Date(savedAt).toLocaleString()}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Read-only floor plan + full-house render from saved building design (PM / admin / contractor).
 */
export default function ProjectDesignOutputs({
  project,
  design,
  readOnly = true,
  showDownloads = true,
  className = '',
}) {
  if (!design) {
    return (
      <div className={`card text-center py-10 ${className}`}>
        <Map className="h-10 w-10 text-concrete mx-auto mb-3" />
        <p className="text-steel font-medium">No saved floor plan yet</p>
        <p className="text-sm text-concrete mt-1">The project manager can save a design in Building Editor.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <DesignOutputsBody project={project} design={design} readOnly={readOnly} showDownloads={showDownloads} />
    </div>
  );
}
