import { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Map, Home, PenTool, ArrowRight } from 'lucide-react';
import { projectsAPI } from '../../services/api';
import { useProject } from '../../contexts/ProjectContext';
import { parseDesignSpecifications, resolveBuildingStyle } from '../../utils/buildingAssets';
import FloorPlanViewer from '../../components/FloorPlanViewer';
import AIHouseRender from '../../components/AIHouseRender';
import PresentationDownloadBar from '../../components/PresentationDownloadBar';
import ProjectSelector from '../../components/ProjectSelector';
import PageHeader, { EmptyState } from '../../components/PageHeader';
import { getSavedExteriorRender } from '../../utils/designRenderKey';
import {
  buildCostSummary,
  exportFloorPlanPdf,
  exportFloorPlanPpt,
  exportFullHousePdf,
  exportFullHousePpt,
  exportFullProjectReportPdf,
  svgToPngDataUrl,
} from '../../utils/designDocumentExport';
import { getLockedProjectFields } from '../../utils/projectMetadata';

const OUTPUT_VIEWS = [
  { id: 'floor-plan', label: 'Professional Plan', icon: Map },
  { id: 'exterior', label: 'Full House Image', icon: Home },
];

export default function BlueprintViewer() {
  const { activeProjectId, activeProject } = useProject();
  const floorPlanRef = useRef(null);
  const [planFloor, setPlanFloor] = useState(1);
  const [outputView, setOutputView] = useState('floor-plan');

  const lockedFields = getLockedProjectFields(activeProject);

  const { data: designsData, isLoading } = useQuery({
    queryKey: ['designs', activeProjectId],
    queryFn: () => projectsAPI.getDesigns(activeProjectId),
    enabled: !!activeProjectId,
  });

  const latestDesign = designsData?.designs?.[0];
  const specs = parseDesignSpecifications(latestDesign?.specifications) || {};
  const floors = Math.max(specs.floors || 0, activeProject?.floors || 1);
  const width = specs.width || 8;
  const depth = specs.depth || 6;
  const placedItems = specs.placedItems || [];
  const floorRooms = specs.floorRooms || {};
  const buildingType = activeProject?.buildingType || activeProject?.projectType;
  const materials = specs.materials || {};
  const buildingStyle = resolveBuildingStyle(specs, activeProject);
  const savedAt = specs.savedAt || latestDesign?.updated_at || latestDesign?.created_at;
  const roomCount = Object.values(floorRooms).flat().length;

  const costData = useMemo(() => buildCostSummary({
    width, depth, floors,
    areaSqft: activeProject?.totalAreaSqft,
    placedItems,
    buildingType,
    budget: activeProject?.budget,
  }), [width, depth, floors, activeProject?.totalAreaSqft, placedItems, buildingType, activeProject?.budget]);

  const savedRender = getSavedExteriorRender(specs, savedAt);
  const resolveHouseImageUrl = () => {
    if (savedRender?.url) {
      return savedRender.url.startsWith('http') ? savedRender.url : `${window.location.origin}${savedRender.url}`;
    }
    const img = document.querySelector('[data-house-render]');
    return img?.src || null;
  };

  const floorPlanExportBase = () => ({
    svgEl: floorPlanRef.current,
    projectName: activeProject?.name,
    activeFloor: planFloor,
    width,
    depth,
    floors,
    roomCount,
  });

  const fullHouseExportBase = () => ({
    role: 'pm',
    projectName: activeProject?.name,
    houseImageUrl: resolveHouseImageUrl(),
    width,
    depth,
    floors,
    roomCount,
    buildingStyle,
    costRows: costData.rows,
    costSummary: costData.summary,
    budget: activeProject?.budget || 0,
    location: activeProject?.location,
    lockedFields,
    status: activeProject?.status,
    progress: activeProject?.progressPercentage ?? activeProject?.progress_percentage,
    description: activeProject?.description || lockedFields.requirements,
    startDate: lockedFields.startDate,
    endDate: lockedFields.endDate,
  });

  const fullReportBase = () => ({
    ...fullHouseExportBase(),
    svgEl: floorPlanRef.current,
    activeFloor: planFloor,
  });

  return (
    <div>
      <PageHeader
        title="Design Output"
        subtitle="Professional floor plan and full-house render from your saved Building Editor design. Cost details live under Cost Estimation."
      />
      <ProjectSelector className="mb-4" required />

      {!activeProjectId ? (
        <EmptyState title="Select a Project" description="Choose a project to view its design output" />
      ) : isLoading ? (
        <div className="card h-96 animate-pulse bg-steel-50" />
      ) : !latestDesign ? (
        <div className="card text-center py-16">
          <Map className="h-12 w-12 text-concrete mx-auto mb-4" />
          <p className="text-steel font-medium">No saved design yet</p>
          <p className="text-sm text-concrete mt-2 mb-6">Save your design in Building Editor first.</p>
          <Link to="/pm/building-editor" className="btn-primary inline-flex items-center gap-2">
            <PenTool className="h-4 w-4" /> Open Building Editor
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
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
            <Link
              to="/pm/building-editor"
              className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium bg-steel-800 text-white hover:bg-steel-700"
            >
              <PenTool className="h-3.5 w-3.5" /> Edit plan <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <PresentationDownloadBar
            pdfLabel="Download Full Project Report (PDF)"
            pptLabel="Download Presentation PPT"
            onExportPdf={() => exportFullProjectReportPdf(fullReportBase())}
            onExportPpt={async () => {
              let floorPlanPng = null;
              try {
                if (floorPlanRef.current) floorPlanPng = await svgToPngDataUrl(floorPlanRef.current);
              } catch { /* plan optional */ }
              await exportFullHousePpt({ ...fullHouseExportBase(), floorPlanPng });
            }}
          />

          {outputView === 'floor-plan' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center bg-white rounded-xl border border-steel-100 p-3">
                <span className="text-sm font-bold text-steel uppercase tracking-wide mr-1">Select level:</span>
                {Array.from({ length: Math.min(floors, 15) }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPlanFloor(i + 1)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                      planFloor === i + 1
                        ? 'bg-primary text-white shadow-md scale-105'
                        : 'bg-steel-50 text-steel hover:bg-steel-100'
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
                projectName={activeProject?.name}
              />

              <PresentationDownloadBar
                pdfLabel="Download Floor Plan PDF"
                pptLabel="Download Floor Plan PPT"
                onExportPdf={() => exportFloorPlanPdf(floorPlanExportBase())}
                onExportPpt={() => exportFloorPlanPpt(floorPlanExportBase())}
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Footprint', value: `${width}m × ${depth}m` },
                  { label: 'Total floors', value: floors },
                  { label: 'Rooms (all levels)', value: roomCount },
                  { label: 'Building height', value: `${floors * 3}m` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-steel-100 bg-white p-3 text-center">
                    <p className="text-xs font-semibold text-concrete uppercase">{label}</p>
                    <p className="text-lg font-bold text-steel mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {outputView === 'exterior' && (
          <div className="card w-full !p-4">
                <h3 className="text-sm font-semibold text-steel mb-1 flex items-center gap-2">
                  <Home className="h-3.5 w-3.5 text-primary" /> Full House — AI Realistic Render
                </h3>
                <p className="text-[10px] text-concrete mb-3">
                  {floors}-floor {buildingStyle === 'commercial' ? 'commercial building' : 'building'} · {width}m × {depth}m ·
                  {' '}{floors * 3}m total height · {roomCount} rooms — AI render locked to your exact 3D design
                  {savedAt ? ` · saved ${new Date(savedAt).toLocaleString()}` : ''}.
                </p>
                <PresentationDownloadBar
                  className="mb-4"
                  pdfLabel="Download Presentation PDF"
                  pptLabel="Download Presentation PPT"
                  onExportPdf={() => exportFullHousePdf(fullHouseExportBase())}
                  onExportPpt={async () => {
                    let floorPlanPng = null;
                    try {
                      if (floorPlanRef.current) floorPlanPng = await svgToPngDataUrl(floorPlanRef.current);
                    } catch { /* optional */ }
                    await exportFullHousePpt({ ...fullHouseExportBase(), floorPlanPng });
                  }}
                />
                <AIHouseRender
                  specs={specs}
                  projectName={activeProject?.name}
                  buildingType={buildingType}
                  projectType={activeProject?.projectType}
                  buildingStyle={buildingStyle}
                  mode="exterior"
                  savedAt={savedAt}
                  projectId={activeProjectId}
                  designId={latestDesign.id}
                />

            <p className="text-[10px] text-concrete mt-4">
              Saved design: {latestDesign.name} · {new Date(latestDesign.created_at || latestDesign.createdAt).toLocaleDateString()}
            </p>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
