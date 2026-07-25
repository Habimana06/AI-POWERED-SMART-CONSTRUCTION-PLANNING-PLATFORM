import FloorPlanViewer from './FloorPlanViewer';
import { FURNITURE_CATALOG } from '../utils/buildingAssets';

/**
 * Per-floor interior layout view (2D furnished plan — not 3D)
 */
export default function InteriorFloorPreview({
  width, depth, floors, placedItems = [], activeFloor = 1, buildingType,
}) {
  const floorItems = placedItems.filter((item) => item.floor === activeFloor || (!item.floor && activeFloor === 1));
  const catalogNames = Object.fromEntries(FURNITURE_CATALOG.map((a) => [a.id, a.name]));

  return (
    <div className="space-y-4">
      <FloorPlanViewer
        width={width}
        depth={depth}
        floors={floors}
        placedItems={placedItems}
        activeFloor={activeFloor}
        buildingType={buildingType}
      />
      <div className="card">
        <h4 className="font-semibold text-steel mb-3">Interior Items — Floor {activeFloor}</h4>
        {floorItems.length === 0 ? (
          <p className="text-sm text-concrete">No furniture placed on this floor yet. Add items in Building Editor.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-steel-100 text-left text-concrete text-xs uppercase">
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Position (X, Z)</th>
                </tr>
              </thead>
              <tbody>
                {floorItems.map((item) => {
                  const cat = FURNITURE_CATALOG.find((c) => c.id === item.id);
                  return (
                    <tr key={item.uid || item.id} className="border-b border-steel-50">
                      <td className="py-2 pr-4 font-medium text-steel">{item.name || catalogNames[item.id] || item.id}</td>
                      <td className="py-2 pr-4 capitalize text-concrete">{cat?.category || '—'}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{((item.x || 0).toFixed(1))}m, {((item.z || 0).toFixed(1))}m</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
