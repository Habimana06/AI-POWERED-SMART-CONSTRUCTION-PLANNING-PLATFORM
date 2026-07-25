import { useEffect, useMemo, useRef } from 'react';
import BuildingViewer from './BuildingViewer';
import { resolveBuildingStyle } from '../utils/buildingAssets';
import { captureHeightForFloors } from '../utils/designSpec';

const CAPTURE_WIDTH = 640;

const CAPTURE_ANGLES = [
  { id: 'front', azimuth: 0, label: 'front elevation' },
  { id: 'iso', azimuth: 0.62, label: 'three-quarter view' },
];

function CapturePanel({ specs, buildingType, buildingStyle, azimuth, panelH, onReady }) {
  const containerRef = useRef(null);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    const floors = specs.floors || 1;
    const delay = 1800 + Math.min(floors, 15) * 180;

    const attempt = () => {
      if (doneRef.current) return;
      const canvas = containerRef.current?.querySelector('canvas');
      if (!canvas || canvas.width < 10) return;
      try {
        const dataUri = canvas.toDataURL('image/jpeg', 0.78);
        if (dataUri?.length > 2000) {
          doneRef.current = true;
          onReady(dataUri);
        }
      } catch {
        onReady(null);
      }
    };

    const t1 = setTimeout(attempt, delay);
    const t2 = setTimeout(attempt, delay + 1500);
    const t3 = setTimeout(() => { if (!doneRef.current) onReady(null); }, delay + 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [specs, azimuth, onReady, panelH]);

  const style = buildingStyle || resolveBuildingStyle(specs, { buildingType });

  return (
    <div
      ref={containerRef}
      className="fixed -left-[9999px] top-0 pointer-events-none opacity-0 overflow-hidden"
      style={{ width: CAPTURE_WIDTH, height: panelH }}
      aria-hidden
    >
      <BuildingViewer
        floors={specs.floors || 1}
        width={specs.width || 8}
        depth={specs.depth || 6}
        materials={specs.materials || {}}
        doorStyle={specs.doorStyle}
        windowStyle={specs.windowStyle}
        buildingStyle={style}
        buildingType={buildingType}
        floorRooms={specs.floorRooms || {}}
        placedItems={[]}
        viewMode="exterior"
        activeFloor="all"
        showRoof
        cameraMode="orbit"
        freeLook={false}
        presentationMode
        referenceCaptureMode
        controlsEnabled={false}
        initialAzimuth={azimuth}
        className="w-full h-full"
        style={{ width: CAPTURE_WIDTH, height: panelH }}
      />
    </div>
  );
}

/**
 * Captures front + 3/4 elevation references for geometry-locked AI conversion.
 */
export default function DesignReferenceCapture({
  specs = {},
  buildingType,
  buildingStyle,
  onCapture,
}) {
  const panelH = useMemo(() => captureHeightForFloors(specs.floors || 1), [specs.floors]);
  const resultsRef = useRef({ front: null, iso: null });
  const reportedRef = useRef(false);

  const handleAngle = (id) => (dataUri) => {
    resultsRef.current[id] = dataUri;
    const { front, iso } = resultsRef.current;
    if (reportedRef.current) return;
    if (front !== undefined && iso !== undefined) {
      reportedRef.current = true;
      onCapture?.({
        front: front || null,
        iso: iso || null,
        primary: front || iso || null,
        images: [front, iso].filter(Boolean),
      });
    }
  };

  useEffect(() => {
    resultsRef.current = { front: undefined, iso: undefined };
    reportedRef.current = false;
  }, [specs, buildingType, buildingStyle]);

  return (
    <>
      {CAPTURE_ANGLES.map(({ id, azimuth }) => (
        <CapturePanel
          key={id}
          specs={specs}
          buildingType={buildingType}
          buildingStyle={buildingStyle}
          azimuth={azimuth}
          panelH={panelH}
          onReady={handleAngle(id)}
        />
      ))}
    </>
  );
}
