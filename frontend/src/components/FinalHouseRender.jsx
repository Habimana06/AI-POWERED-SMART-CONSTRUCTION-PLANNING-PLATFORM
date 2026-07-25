import { useCallback, useRef, useState } from 'react';
import { Download, Home } from 'lucide-react';
import BuildingViewer from './BuildingViewer';

const EXTERIOR_ANGLES = [
  { id: 'front', label: 'Front', az: 0.75 },
  { id: 'back', label: 'Back', az: 0.75 + Math.PI },
  { id: 'left', label: 'Left', az: 0.75 - Math.PI / 2 },
  { id: 'right', label: 'Right', az: 0.75 + Math.PI / 2 },
];

function RenderPanel({ viewKey, angleId, label, height, designProps, az }) {
  return (
    <div className="rounded-xl overflow-hidden border border-steel-100 bg-white">
      <p className="text-[10px] font-semibold uppercase text-concrete px-2 py-1 bg-steel-50 border-b border-steel-100">{label}</p>
      <BuildingViewer
        key={viewKey}
        {...designProps}
        viewMode="exterior"
        activeFloor="all"
        showRoof
        cameraMode="orbit"
        freeLook={false}
        presentationMode
        controlsEnabled={false}
        initialAzimuth={az}
        className="w-full"
        style={{ minHeight: height, height }}
      />
    </div>
  );
}

/**
 * Accurate final images from the saved 3D design — NOT AI hallucination.
 */
export default function FinalHouseRender({
  floors = 1,
  width = 8,
  depth = 6,
  materials = {},
  doorStyle,
  windowStyle,
  buildingStyle,
  buildingType,
  placedItems = [],
  floorRooms = {},
  projectName = 'design',
  showAllAngles = true,
}) {
  const singleRef = useRef(null);
  const [angle, setAngle] = useState('front');
  const [flash, setFlash] = useState(false);

  const az = EXTERIOR_ANGLES.find((a) => a.id === angle)?.az ?? 0.75;
  const designProps = {
    floors,
    width,
    depth,
    materials,
    doorStyle,
    windowStyle,
    buildingStyle,
    buildingType,
    placedItems,
    floorRooms,
  };

  const captureCanvas = useCallback((ref) => {
    const canvas = ref?.current?.querySelector('canvas');
    if (!canvas) return null;
    try {
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Capture failed', err);
      return null;
    }
  }, []);

  const handleDownload = useCallback((ref, suffix) => {
    const url = captureCanvas(ref || singleRef);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}-${suffix}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setFlash(true);
    setTimeout(() => setFlash(false), 900);
  }, [captureCanvas, projectName]);

  const panelH = floors > 6 ? 420 : 480;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {!showAllAngles && EXTERIOR_ANGLES.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAngle(a.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              angle === a.id ? 'bg-primary text-white' : 'bg-steel-50 text-steel hover:bg-steel-100'
            }`}
          >
            {a.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleDownload(singleRef, `exterior-${angle}`)}
          className="btn-primary ml-auto !py-1.5 !px-3 text-xs"
        >
          <Download className="h-3.5 w-3.5" /> {flash ? 'Saved!' : 'Download Image'}
        </button>
      </div>

      {showAllAngles ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {EXTERIOR_ANGLES.map((a) => (
            <RenderPanel
              key={a.id}
              viewKey={`${floors}-${width}-${depth}-${placedItems.length}-${a.id}`}
              angleId={a.id}
              label={a.label}
              height={panelH}
              designProps={designProps}
              az={a.az}
            />
          ))}
        </div>
      ) : (
        <div ref={singleRef} className="w-full rounded-xl overflow-hidden border border-steel-100 bg-white" style={{ minHeight: panelH + 24 }}>
          <BuildingViewer
            key={`${angle}-${floors}-${placedItems.length}`}
            {...designProps}
            viewMode="exterior"
            activeFloor="all"
            showRoof
            cameraMode="orbit"
            freeLook={false}
            presentationMode
            controlsEnabled={false}
            initialAzimuth={az}
            className="w-full"
            style={{ minHeight: panelH, height: panelH }}
          />
        </div>
      )}

      <p className="text-[10px] text-concrete flex items-center gap-1.5">
        <Home className="h-3 w-3" />
        Rendered directly from your saved Building Editor design ({floors} floors, {width}m × {depth}m) — exact materials, rooms, and items. No AI guessing.
      </p>
    </div>
  );
}
