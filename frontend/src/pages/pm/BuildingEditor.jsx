import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, RotateCcw, Layers, Box } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI } from '../../services/api';
import { useProject } from '../../contexts/ProjectContext';
import FloorPlanEditor from '../../components/FloorPlanEditor';
import ExpandableBuildingViewer from '../../components/ExpandableBuildingViewer';
import EditorAIAssistant from '../../components/EditorAIAssistant';
import ProjectSelector from '../../components/ProjectSelector';
import { projectToDesignParams, parseDesignSpecifications, resolveBuildingStyle } from '../../utils/buildingAssets';
import { initFloorRooms } from '../../utils/roomLayouts';
import { getLockedProjectFields, metadataToDesignOverrides } from '../../utils/projectMetadata';

const DEFAULT_PARAMS = {
  floors: 2,
  width: 8,
  depth: 6,
  materials: { wallColor: '#D5DBDB', roofColor: '#2C3E50', accentColor: '#E67E22', stoneColor: '#7F8C8D' },
  doorStyle: 'wood',
  windowStyle: 'standard',
  placedItems: [],
  floorRooms: {},
  viewMode: 'exterior',
  activeFloor: 1,
  showRoof: true,
  workerSalaryTotal: 0,
  source: 'editor',
};

function scaleFloorRooms(floorRooms, oldW, oldD, newW, newD) {
  if (!floorRooms || oldW <= 0 || oldD <= 0) return floorRooms;
  const sx = newW / oldW;
  const sy = newD / oldD;
  const scaled = {};
  for (const [fl, rooms] of Object.entries(floorRooms)) {
    scaled[fl] = (rooms || []).map((r) => ({
      ...r,
      x: (r.x || 0) * sx,
      y: (r.y || 0) * sy,
      w: (r.w || 1) * sx,
      h: (r.h || 1) * sy,
    }));
  }
  return scaled;
}

export default function BuildingEditor() {
  const { activeProjectId, activeProject } = useProject();
  const queryClient = useQueryClient();
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [editorTab, setEditorTab] = useState('plan');
  const [selectedRoom, setSelectedRoom] = useState(null);

  const buildingType = activeProject?.buildingType || activeProject?.projectType;
  const projectType = activeProject?.projectType;

  const { data: designsData } = useQuery({
    queryKey: ['designs', activeProjectId],
    queryFn: () => projectsAPI.getDesigns(activeProjectId),
    enabled: !!activeProjectId,
  });

  useEffect(() => {
    if (!activeProject) return;
    const saved = designsData?.designs?.[0];
    const savedSpecs = parseDesignSpecifications(saved?.specifications);
    const fromProject = projectToDesignParams(activeProject);
    const floorRooms = savedSpecs?.floorRooms && Object.keys(savedSpecs.floorRooms).length
      ? savedSpecs.floorRooms
      : initFloorRooms(fromProject.width, fromProject.depth, fromProject.floors, buildingType);
    const locked = getLockedProjectFields(activeProject);
    const metaOverrides = metadataToDesignOverrides(activeProject);
    setParams({
      ...DEFAULT_PARAMS,
      ...fromProject,
      ...metaOverrides,
      ...(savedSpecs || {}),
      floors: savedSpecs?.floors ?? fromProject.floors,
      windowStyle: savedSpecs?.windowStyle ?? metaOverrides.windowStyle ?? fromProject.windowStyle,
      materials: savedSpecs?.materials ?? metaOverrides.materials ?? fromProject.materials,
      placedItems: [],
      floorRooms: savedSpecs?.floorRooms || floorRooms,
      activeFloor: savedSpecs?.activeFloor || 1,
      workerSalaryTotal: savedSpecs?.workerSalaryTotal ?? locked.workerSalaryTotal ?? 0,
      source: 'editor',
      creationMethod: metaOverrides.creationMethod,
      projectMetadata: metaOverrides.projectMetadata,
    });
  }, [activeProject, designsData, buildingType, projectType]);

  const saveMutation = useMutation({
    mutationFn: () => projectsAPI.saveDesign(activeProjectId, {
      name: `${activeProject?.name || 'Project'} — Building Plan`,
      designType: activeProject?.buildingType || 'custom',
      description: `${params.floors} floors, ${params.width}m × ${params.depth}m`,
      specifications: {
        ...params,
        placedItems: [],
        source: 'editor',
        creationMethod: params.creationMethod || 'manual',
        projectMetadata: params.projectMetadata,
        savedAt: new Date().toISOString(),
      },
      floorPlan: {
        width: params.width,
        depth: params.depth,
        placedItems: [],
        floors: params.floors,
        floorRooms: params.floorRooms,
      },
    }),
    onSuccess: () => {
      toast.success('Saved — Floor Plans & Full House Image now use this design');
      queryClient.invalidateQueries({ queryKey: ['designs', activeProjectId] });
      queryClient.invalidateQueries({ queryKey: ['floor-plans', activeProjectId] });
      queryClient.invalidateQueries({ queryKey: ['ai-building-render'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Save failed'),
  });

  const updateFootprint = useCallback((key, value) => {
    setParams((p) => {
      const oldW = p.width;
      const oldD = p.depth;
      const newW = key === 'width' ? value : p.width;
      const newD = key === 'depth' ? value : p.depth;
      return {
        ...p,
        [key]: value,
        floorRooms: scaleFloorRooms(p.floorRooms, oldW, oldD, newW, newD),
      };
    });
  }, []);

  const updateFloors = useCallback((floors) => {
    setParams((p) => {
      const next = Math.max(1, Math.min(20, floors));
      const floorRooms = { ...p.floorRooms };
      for (let f = 1; f <= next; f += 1) {
        const key = String(f);
        if (!floorRooms[key]?.length) {
          floorRooms[key] = initFloorRooms(p.width, p.depth, next, buildingType)[key]
            || initFloorRooms(p.width, p.depth, next, buildingType)[f]
            || [];
        }
      }
      return {
        ...p,
        floors: next,
        floorRooms,
        activeFloor: typeof p.activeFloor === 'number' && p.activeFloor > next ? next : p.activeFloor,
      };
    });
  }, [buildingType]);

  const resetLayout = () => {
    const fp = projectToDesignParams(activeProject);
    setParams({
      ...DEFAULT_PARAMS,
      ...fp,
      floorRooms: initFloorRooms(fp.width, fp.depth, fp.floors, buildingType),
      placedItems: [],
    });
    toast.success('New layout — adjust rooms and save');
  };

  const currentFloor = typeof params.activeFloor === 'number' ? params.activeFloor : 1;

  return (
    <div className="w-full space-y-4">
      <ProjectSelector className="mb-2" required />

      {!activeProjectId ? (
        <div className="card text-center py-16 text-concrete">Select or create a project to start editing</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px_280px]">
          <div className="space-y-3 min-w-0">
            <div className="card flex flex-wrap items-center gap-2 !py-3">
              <span className="text-sm font-semibold text-steel flex items-center gap-1 mr-1">
                <Layers className="h-4 w-4 text-primary" /> Floor
              </span>
              {Array.from({ length: Math.min(params.floors, 10) }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setParams({ ...params, activeFloor: i + 1 })}
                  className={`rounded-lg px-3 py-1.5 text-sm ${params.activeFloor === i + 1 ? 'bg-primary text-white' : 'bg-steel-50 text-steel'}`}
                >
                  L{i + 1}
                </button>
              ))}

              <div className="flex rounded-lg border border-steel-100 p-0.5 ml-2">
                <button
                  type="button"
                  onClick={() => setEditorTab('plan')}
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${editorTab === 'plan' ? 'bg-steel-800 text-white' : 'text-steel'}`}
                >
                  2D plan
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('cut3d')}
                  className={`rounded-md px-3 py-1 text-xs font-semibold inline-flex items-center gap-1 ${editorTab === 'cut3d' ? 'bg-steel-800 text-white' : 'text-steel'}`}
                >
                  <Box className="h-3 w-3" /> 3D cut floor
                </button>
              </div>

              <div className="ml-auto flex gap-2">
                <button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()} className="btn-primary">
                  <Save className="h-4 w-4" /> Save
                </button>
                <button type="button" onClick={resetLayout} className="btn-outline" title="Reset to new layout">
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="card">
              {editorTab === 'plan' ? (
                <>
                  <h3 className="font-semibold text-steel mb-2 text-sm">Edit Plan — Floor {currentFloor}</h3>
                  <FloorPlanEditor
                    width={params.width}
                    depth={params.depth}
                    floors={params.floors}
                    activeFloor={currentFloor}
                    buildingType={buildingType}
                    floorRooms={params.floorRooms}
                    onFloorRoomsChange={(floorRooms) => setParams((p) => ({ ...p, floorRooms }))}
                    onFootprintChange={(width, depth) => {
                      setParams((p) => ({
                        ...p,
                        width,
                        depth,
                        floorRooms: scaleFloorRooms(p.floorRooms, p.width, p.depth, width, depth),
                      }));
                    }}
                  />
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-steel mb-1 text-sm">
                    3D cutaway — floors 1–{currentFloor} (from your measurements)
                  </h3>
                  <p className="text-xs text-concrete mb-2">Front cut shows room layout per level. Switch floor tabs to stack up to that level.</p>
                  <ExpandableBuildingViewer
                    title={`3D cutaway — floors 1–${currentFloor}`}
                    viewerClassName="h-[min(480px,55vh)]"
                    showControlsHint
                    floors={params.floors}
                    width={params.width}
                    depth={params.depth}
                    materials={params.materials}
                    doorStyle={params.doorStyle}
                    windowStyle={params.windowStyle}
                    floorRooms={params.floorRooms}
                    buildingType={buildingType}
                    buildingStyle={resolveBuildingStyle(params, activeProject)}
                    viewMode="dollhouse"
                    activeFloor={currentFloor}
                    stackedCutaway
                    placedItems={[]}
                    showRoof={false}
                    selectedRoom={selectedRoom}
                    onRoomSelect={(room) => setSelectedRoom(room)}
                  />
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <EditorAIAssistant
              params={params}
              buildingType={buildingType}
              projectType={projectType}
              projectId={activeProjectId}
              onApply={(patch) => setParams((p) => ({ ...p, ...patch }))}
            />
          </div>

          <div className="space-y-3">
            <div className="card space-y-2 text-sm">
              <h3 className="font-semibold text-steel">Building Size</h3>
              <div>
                <label className="text-xs text-concrete">Floors: {params.floors}</label>
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={params.floors}
                  onChange={(e) => updateFloors(Number(e.target.value))}
                  className="w-full accent-primary h-1"
                />
              </div>
              {['width', 'depth'].map((key) => (
                <div key={key}>
                  <label className="text-xs text-concrete capitalize">{key}: {params[key]}m</label>
                  <input
                    type="range"
                    min={4}
                    max={24}
                    value={params[key]}
                    onChange={(e) => updateFootprint(key, Number(e.target.value))}
                    className="w-full accent-primary h-1"
                  />
                </div>
              ))}
              <p className="text-[10px] text-concrete">Resizing scales all rooms proportionally.</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-concrete">Wall</label>
                  <input
                    type="color"
                    value={params.materials.wallColor}
                    onChange={(e) => setParams({ ...params, materials: { ...params.materials, wallColor: e.target.value } })}
                    className="h-8 w-full rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs text-concrete">Accent</label>
                  <input
                    type="color"
                    value={params.materials.accentColor}
                    onChange={(e) => setParams({ ...params, materials: { ...params.materials, accentColor: e.target.value } })}
                    className="h-8 w-full rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs text-concrete">Roof</label>
                  <input
                    type="color"
                    value={params.materials.roofColor}
                    onChange={(e) => setParams({ ...params, materials: { ...params.materials, roofColor: e.target.value } })}
                    className="h-8 w-full rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs text-concrete">Stone</label>
                  <input
                    type="color"
                    value={params.materials.stoneColor}
                    onChange={(e) => setParams({ ...params, materials: { ...params.materials, stoneColor: e.target.value } })}
                    className="h-8 w-full rounded cursor-pointer"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-xs text-concrete">Door</label>
                  <select
                    className="input text-xs py-1"
                    value={params.doorStyle}
                    onChange={(e) => setParams({ ...params, doorStyle: e.target.value })}
                  >
                    <option value="wood">Wood</option>
                    <option value="glass">Glass</option>
                    <option value="metal">Metal</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-concrete">Windows</label>
                  <select
                    className="input text-xs py-1"
                    value={params.windowStyle}
                    onChange={(e) => setParams({ ...params, windowStyle: e.target.value })}
                  >
                    <option value="standard">Standard</option>
                    <option value="floor-to-ceiling">Floor-to-ceiling</option>
                    <option value="narrow">Narrow</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
