import { useState } from 'react';
import BuildingViewer from './BuildingViewer';

const ANGLES = [
  { id: 'front', label: 'Front', floor: 'all', roof: true },
  { id: 'back', label: 'Back', floor: 'all', roof: true },
  { id: 'left', label: 'Left Side', floor: 'all', roof: true },
  { id: 'right', label: 'Right Side', floor: 'all', roof: true },
  { id: 'rooftop', label: 'Rooftop', floor: 'roof', roof: true },
  { id: 'aerial', label: 'Aerial', floor: 'all', roof: true },
];

const ANGLE_AZIMUTH = {
  front: 0.75,
  back: 0.75 + Math.PI,
  left: 0.75 - Math.PI / 2,
  right: 0.75 + Math.PI / 2,
  aerial: 0.5,
  rooftop: 0.4,
};

/** Interactive 3D exterior viewer with orbit camera and angle presets */
export default function ExteriorSceneViewer({
  floors, width, depth, materials, doorStyle, windowStyle, buildingStyle, buildingType, placedItems, floorRooms = {},
}) {
  const [angle, setAngle] = useState('front');
  const preset = ANGLES.find((a) => a.id === angle) || ANGLES[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {ANGLES.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAngle(a.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              angle === a.id ? 'bg-primary text-white' : 'bg-steel-50 text-steel hover:bg-steel-100'
            }`}
          >
            {a.label}
          </button>
        ))}
        <span className="text-xs text-concrete self-center ml-2">
          Drag to rotate · Scroll to zoom · <strong>{floors} floors</strong>
        </span>
      </div>
      <div className="w-full rounded-xl overflow-hidden border border-steel-100" style={{ minHeight: 520 }}>
        <BuildingViewer
          key={`exterior-${angle}-${floors}`}
          floors={floors}
          width={width}
          depth={depth}
          materials={materials}
          doorStyle={doorStyle}
          windowStyle={windowStyle}
          buildingStyle={buildingStyle}
          buildingType={buildingType}
          placedItems={placedItems}
          floorRooms={floorRooms}
          viewMode="exterior"
          activeFloor={preset.floor}
          showRoof={preset.roof}
          cameraMode="orbit"
          freeLook
          presentationMode
          initialAzimuth={ANGLE_AZIMUTH[angle] ?? 0.75}
          className="w-full"
          style={{ minHeight: 620, height: 620 }}
        />
      </div>
    </div>
  );
}
