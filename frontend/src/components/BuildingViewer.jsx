import { Suspense, useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Sky } from '@react-three/drei';
import { DOOR_STYLES, WINDOW_STYLES } from '../utils/buildingAssets';
import { getWallLines, wallLineTo3D } from '../utils/roomLayouts';
import { FurnitureRenderer } from './FurnitureModels';
import SceneEnvironment from './SceneEnvironment';
import DollhouseFloors from './DollhouseFloors';
import { CommercialPresentation, ResidentialPresentation } from './PresentationExterior';
import { PresentationLighting, PresentationDollhouseSite } from './PresentationScene';
import { deriveFacadeFromDesign } from '../utils/facadeFromDesign';
import { plasterMaterial } from '../utils/presentationMaterials';

const FLOOR_H = 3;
const HALF_WALL_H = 1.2;

function CameraRig({
  targetY, distance, cameraMode = 'orbit', width, depth, activeFloor, floors,
  initialAzimuth = 0.75, freeLook = false, orbitEnabled = true,
  presentationMode = false, isDollhouse = false, controlsEnabled = true,
  referenceCaptureMode = false, stackedCutaway = false,
}) {
  const controlsRef = useRef();
  const { camera } = useThree();

  const floorY = typeof activeFloor === 'number'
    ? (activeFloor - 1) * FLOOR_H + FLOOR_H * 0.35
    : targetY;

  const baseSpan = Math.max(width, depth, 6);
  const isoDistance = baseSpan * (typeof activeFloor === 'number' ? 2.4 : 2.8);

  useEffect(() => {
    const stackFloors = stackedCutaway && typeof activeFloor === 'number' ? activeFloor : floors;
    const buildingH = stackFloors * FLOOR_H;
    const lookY = stackedCutaway && typeof activeFloor === 'number' ? buildingH * 0.5 : buildingH * 0.5;
    if (referenceCaptureMode) {
      const az = initialAzimuth ?? 0;
      const fovRad = ((camera.fov || 38) * Math.PI) / 180;
      const halfH = buildingH / 2;
      const halfW = Math.max(width, depth) / 2;
      const aspect = camera.aspect || 1;
      const distForHeight = halfH / Math.tan(fovRad / 2);
      const distForWidth = halfW / (Math.tan(fovRad / 2) * aspect);
      const dist = Math.max(distForHeight, distForWidth) * (stackedCutaway ? 1.05 : 1.12) + Math.max(width, depth) * (stackedCutaway ? 0.12 : 0.25);
      camera.position.set(
        Math.sin(az) * dist,
        lookY,
        Math.cos(az) * dist,
      );
      camera.lookAt(0, lookY, 0);
    } else if (presentationMode && isDollhouse) {
      const iso = Math.max(width, depth) * 2.55;
      const fy = typeof activeFloor === 'number' ? (activeFloor - 1) * FLOOR_H : 0;
      camera.position.set(iso * 0.92, fy + iso * 0.78, iso * 0.92);
      camera.lookAt(0, fy + 0.55, 0);
    } else if (presentationMode) {
      const az = initialAzimuth ?? 0.62;
      camera.position.set(
        Math.sin(az) * distance * 0.88,
        targetY + distance * 0.36,
        Math.cos(az) * distance * 0.88,
      );
      camera.lookAt(0, targetY, 0);
    } else if (!freeLook && (cameraMode === 'isometric' || cameraMode === 'dollhouse')) {
      camera.position.set(isoDistance * 0.72, floorY + isoDistance * 0.58, isoDistance * 0.72);
      camera.lookAt(0, floorY, 0);
    } else {
      camera.position.set(
        Math.sin(initialAzimuth) * distance * 0.75,
        targetY + distance * 0.35,
        Math.cos(initialAzimuth) * distance * 0.75
      );
      camera.lookAt(0, floorY || targetY, 0);
    }
    camera.near = 0.1;
    camera.far = Math.max(400, floors * FLOOR_H * 8);
    camera.updateProjectionMatrix();
  }, [camera, targetY, distance, cameraMode, floorY, isoDistance, floors, initialAzimuth, freeLook, presentationMode, isDollhouse, width, depth, activeFloor, referenceCaptureMode, stackedCutaway]);

  const canRotate = freeLook || cameraMode === 'orbit';
  const minDist = baseSpan * 1.2;
  const maxDist = baseSpan * 8;

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={orbitEnabled && controlsEnabled}
      target={[0, floorY || targetY, 0]}
      enablePan
      enableZoom
      enableRotate={canRotate}
      autoRotate={false}
      minDistance={minDist}
      maxDistance={maxDist}
      minPolarAngle={freeLook ? 0.05 : 0.15}
      maxPolarAngle={freeLook ? Math.PI * 0.48 : Math.PI / 2.05}
      makeDefault
    />
  );
}

function FloorClickPlane({ floorY, onFloorClick, enabled }) {
  if (!enabled || !onFloorClick) return null;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, floorY + 0.04, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onFloorClick({ x: e.point.x, z: e.point.z });
      }}
    >
      <planeGeometry args={[80, 80]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

function WebGLGuard() {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (e) => { e.preventDefault(); };
    canvas.addEventListener('webglcontextlost', onLost, false);
    return () => canvas.removeEventListener('webglcontextlost', onLost);
  }, [gl]);
  return null;
}

function GridWindow({ position, w = 1.4, h = 1.6, styleId, onSelect, selected }) {
  const style = WINDOW_STYLES.find((s) => s.id === styleId) || WINDOW_STYLES[0];
  return (
    <group
      position={position}
      onClick={(e) => { e.stopPropagation(); onSelect?.('window', styleId); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
    >
      <mesh>
        <boxGeometry args={[w + 0.15, h + 0.15, 0.08]} />
        <meshStandardMaterial color="#2C3E50" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[w, h, 0.04]} />
        <meshStandardMaterial color={style.color} transparent opacity={0.65} metalness={0.9} roughness={0.05} emissive={selected ? '#3498DB' : '#000'} emissiveIntensity={selected ? 0.2 : 0} />
      </mesh>
    </group>
  );
}

function ModernDoor({ position, styleId, onSelect, selected }) {
  const style = DOOR_STYLES.find((s) => s.id === styleId) || DOOR_STYLES[0];
  const isGlass = styleId === 'glass';
  return (
    <group
      position={position}
      onClick={(e) => { e.stopPropagation(); onSelect?.('door', styleId); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
    >
      <mesh>
        <boxGeometry args={[1.8, 2.6, 0.12]} />
        <meshStandardMaterial color="#2C3E50" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.08]}>
        <boxGeometry args={[1.5, 2.4, 0.06]} />
        <meshStandardMaterial color={isGlass ? '#87CEEB' : style.color} transparent={isGlass} opacity={isGlass ? 0.7 : 1} emissive={selected ? '#E67E22' : '#000'} emissiveIntensity={selected ? 0.15 : 0} roughness={0.5} />
      </mesh>
    </group>
  );
}

function DollhouseWalls({ width, depth, floorIndex, buildingType, floors, floorRooms = {}, presentationMode = false, fullHeightWalls = false }) {
  const floorY = (floorIndex - 1) * FLOOR_H;
  const wallH = presentationMode ? FLOOR_H * 0.88 : (fullHeightWalls ? FLOOR_H * 0.92 : HALF_WALL_H);
  const lines = getWallLines(width, depth, floorIndex, buildingType, floors, floorRooms);
  const wallMat = presentationMode
    ? plasterMaterial('#FFFFFF')
    : { color: '#FFFFFF', roughness: 0.75, metalness: 0.02 };
  const capMat = { color: '#2C3E50', roughness: 0.35, metalness: 0.15 };

  return (
    <group>
      {lines.map((line, i) => {
        const w = wallLineTo3D(line, width, depth, floorY, wallH);
        return (
          <group key={i}>
            <mesh position={w.position} castShadow receiveShadow>
              <boxGeometry args={w.size} />
              <meshStandardMaterial {...wallMat} />
            </mesh>
            <mesh position={[w.position[0], floorY + wallH + 0.02, w.position[2]]} castShadow>
              <boxGeometry args={[w.size[0], 0.06, w.size[2]]} />
              <meshStandardMaterial {...capMat} />
            </mesh>
          </group>
        );
      })}
      {/* Perimeter half walls (open top view) */}
      {[
        { pos: [0, floorY + wallH / 2, -depth / 2 + 0.06], size: [width, wallH, 0.12] },
        { pos: [-width / 2 + 0.06, floorY + wallH / 2, 0], size: [0.12, wallH, depth] },
        { pos: [width / 2 - 0.06, floorY + wallH / 2, 0], size: [0.12, wallH, depth] },
      ].map((w, i) => (
        <group key={`perim-${i}`}>
          <mesh position={w.pos} castShadow receiveShadow>
            <boxGeometry args={w.size} />
            <meshStandardMaterial {...wallMat} />
          </mesh>
          <mesh position={[w.pos[0], floorY + wallH + 0.02, w.pos[2]]}>
            <boxGeometry args={[w.size[0], 0.06, w.size[2]]} />
            <meshStandardMaterial {...capMat} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function InteriorWalls({ width, depth, floors, cutaway, activeFloor, dollhouse }) {
  if (dollhouse || !cutaway) return null;
  const wallMat = { color: '#FAFAFA', roughness: 0.9 };
  const bathMat = { color: '#9B59B6', roughness: 0.85 };
  const walls = [];
  for (let f = 0; f < floors; f++) {
    if (activeFloor !== 'all' && activeFloor !== f + 1) continue;
    const y = f * FLOOR_H + FLOOR_H / 2;
    walls.push(
      <mesh key={`div-${f}`} position={[0, y, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, FLOOR_H - 0.2, depth * 0.55]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>,
      <mesh key={`div2-${f}`} position={[-width * 0.12, y, depth * 0.12]} castShadow>
        <boxGeometry args={[width * 0.45, FLOOR_H - 0.2, 0.12]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>,
      <mesh key={`bath-${f}`} position={[width * 0.22, y, depth * 0.22]} receiveShadow>
        <boxGeometry args={[width * 0.28, FLOOR_H - 0.3, 0.08]} />
        <meshStandardMaterial {...bathMat} />
      </mesh>
    );
  }
  return <group>{walls}</group>;
}

function WoodFloorSlab({ width, depth, y }) {
  return (
    <group position={[0, y, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[width - 0.2, 0.08, depth - 0.2]} />
        <meshStandardMaterial color="#D7CCC8" roughness={0.65} />
      </mesh>
      {Array.from({ length: Math.floor(depth * 2) }).map((_, i) => (
        <mesh key={i} position={[0, 0.045, -depth / 2 + 0.3 + i * 0.45]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width - 0.35, 0.04]} />
          <meshStandardMaterial color="#BCAAA4" roughness={0.8} transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function Landscaping({ width, depth, visible = true }) {
  if (!visible) return null;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, depth / 2 + 4]} receiveShadow>
        <planeGeometry args={[width + 14, 10]} />
        <meshStandardMaterial color="#27AE60" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[width + 20, depth + 16]} />
        <meshStandardMaterial color="#58D68D" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, depth / 2 + 2.5]} receiveShadow>
        <planeGeometry args={[3.5, 5]} />
        <meshStandardMaterial color="#95A5A6" roughness={0.8} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (width / 2 + 0.4), 0.35, 0]} castShadow>
          <boxGeometry args={[0.5, 0.7, depth + 1]} />
          <meshStandardMaterial color="#1E8449" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function ResidentialHouse({
  floors, width, depth, materials, doorStyle, windowStyle, placedItems,
  showRoof, viewMode, activeFloor, selectedElement, onSelectElement,
  buildingType, onMoveItem, cameraMode, onDragStart, onDragEnd, presentationMode, floorRooms = {}, facade,
  stackedCutaway = false, selectedRoom = null, onRoomSelect,
}) {
  const totalH = floors * FLOOR_H;
  const isDollhouse = viewMode === 'dollhouse' && typeof activeFloor === 'number';
  const cutaway = viewMode === 'cutaway' || viewMode === 'interior' || isDollhouse;
  const hideRoof = !showRoof || cutaway || (activeFloor !== 'all' && activeFloor !== 'roof');
  const hideExterior = isDollhouse;
  const wall = materials.wallColor || '#F5F5F5';
  const accent = materials.accentColor || '#8B7355';
  const stone = materials.stoneColor || '#7F8C8D';
  const wallRough = presentationMode ? 0.55 : 0.75;
  const wallMetal = presentationMode ? 0.05 : 0;

  const windows = useMemo(() => {
    if (hideExterior) return [];
    const list = [];
    for (let f = 0; f < Math.min(floors, 3); f++) {
      if (activeFloor !== 'all' && activeFloor !== f + 1 && activeFloor !== 'roof') continue;
      [[-width * 0.28, 1.2 + f * FLOOR_H], [0, 1.2 + f * FLOOR_H], [width * 0.28, 1.2 + f * FLOOR_H]].forEach(([x, y], i) => {
        list.push({ key: `f-${f}-${i}`, pos: [x, y, depth / 2 + 0.06] });
      });
    }
    return list;
  }, [floors, width, depth, activeFloor, hideExterior]);

  const visibleItems = placedItems.filter((item) => {
    if (item.zone === 'exterior') return activeFloor === 'all' || activeFloor === 'roof';
    if (activeFloor === 'all') return item.zone !== 'exterior';
    if (activeFloor === 'roof') return false;
    return item.floor === activeFloor || !item.floor;
  });

  const floorIndices = isDollhouse
    ? [activeFloor]
    : Array.from({ length: floors }, (_, i) => i + 1).filter((f) => activeFloor === 'all' || activeFloor === f);

  return (
    <group>
      {!cutaway && !isDollhouse && presentationMode ? (
        <>
          <SceneEnvironment width={width} depth={depth} stoneColor={stone} accentColor={accent} floors={floors} />
          <ResidentialPresentation
            floors={floors}
            width={width}
            depth={depth}
            materials={materials}
            facade={facade}
            doorStyle={doorStyle}
            windowStyle={windowStyle}
          />
          {placedItems.filter((i) => i.zone === 'exterior').map((item, idx) => (
            <FurnitureRenderer key={item.uid || `ext-${idx}`} item={item} presentationMode />
          ))}
        </>
      ) : !cutaway && (
        <group>
          <mesh position={[0, totalH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, totalH, depth]} />
            <meshStandardMaterial color={wall} roughness={wallRough} metalness={wallMetal} />
          </mesh>
          {presentationMode && (
            <>
              <mesh position={[-width * 0.22, totalH * 0.55, depth / 2 + 0.02]} castShadow>
                <boxGeometry args={[width * 0.35, totalH * 0.45, 0.06]} />
                <meshStandardMaterial color={stone} roughness={0.95} />
              </mesh>
              <mesh position={[width * 0.22, totalH * 0.55, depth / 2 + 0.02]} castShadow>
                <boxGeometry args={[width * 0.35, totalH * 0.45, 0.06]} />
                <meshStandardMaterial color="#5D6D7E" roughness={0.85} />
              </mesh>
            </>
          )}
        </group>
      )}
      {cutaway && !hideExterior && (
        <>
          <mesh position={[0, totalH / 2, -depth / 2 + 0.06]} castShadow receiveShadow>
            <boxGeometry args={[width, totalH, 0.12]} />
            <meshStandardMaterial color={wall} roughness={0.75} />
          </mesh>
          <mesh position={[-width / 2 + 0.06, totalH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.12, totalH, depth]} />
            <meshStandardMaterial color={wall} roughness={0.75} />
          </mesh>
          <mesh position={[width / 2 - 0.06, totalH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.12, totalH, depth]} />
            <meshStandardMaterial color={wall} roughness={0.75} />
          </mesh>
        </>
      )}

      {!hideExterior && (
        <>
          <mesh position={[-width * 0.22, totalH * 0.55, depth / 2 + 0.04]} castShadow>
            <boxGeometry args={[width * 0.35, totalH * 0.45, 0.1]} />
            <meshStandardMaterial color={stone} roughness={0.95} />
          </mesh>
          <mesh position={[0, 1.5, depth / 2 + 0.03]} castShadow>
            <boxGeometry args={[2.4, 3.2, 0.08]} />
            <meshStandardMaterial color={accent} roughness={0.5} />
          </mesh>
        </>
      )}

      {!isDollhouse && floorIndices.map((f) => (
        <WoodFloorSlab key={f} width={width} depth={depth} y={(f - 1) * FLOOR_H + 0.02} />
      ))}

      {isDollhouse && (
        <>
          {presentationMode && <PresentationDollhouseSite width={width} depth={depth} />}
          {(stackedCutaway && typeof activeFloor === 'number'
            ? Array.from({ length: activeFloor }, (_, i) => i + 1)
            : [activeFloor]
          ).map((f) => (
            <group key={`res-stack-${f}`}>
              <DollhouseFloors
                width={width}
                depth={depth}
                floorIndex={f}
                buildingType={buildingType}
                floors={floors}
                floorY={(f - 1) * FLOOR_H}
                floorRooms={floorRooms}
                presentationMode={presentationMode}
                selectedRoomId={selectedRoom?.floor === f ? selectedRoom.id : null}
                onRoomClick={onRoomSelect ? (room) => onRoomSelect({ ...room, floor: f }) : undefined}
              />
              <DollhouseWalls
                width={width}
                depth={depth}
                floorIndex={f}
                buildingType={buildingType}
                floors={floors}
                floorRooms={floorRooms}
                presentationMode={presentationMode}
                fullHeightWalls={stackedCutaway}
              />
            </group>
          ))}
        </>
      )}

      <InteriorWalls width={width} depth={depth} floors={floors} cutaway={cutaway} activeFloor={activeFloor} dollhouse={isDollhouse} />

      {!presentationMode && !hideRoof && !isDollhouse && (
        <group>
          <mesh position={[0, totalH + 0.08, 0]} castShadow>
            <boxGeometry args={[width + 0.4, 0.2, depth + 0.4]} />
            <meshStandardMaterial color="#FAFAFA" roughness={0.6} />
          </mesh>
          <mesh position={[0, totalH + 0.35, 0]}>
            <boxGeometry args={[width + 0.2, 0.35, depth + 0.2]} />
            <meshStandardMaterial color="#FAFAFA" roughness={0.5} />
          </mesh>
          <mesh position={[-width * 0.3, totalH + 0.55, depth / 2 + 0.1]}>
            <boxGeometry args={[width * 0.35, 0.08, 0.6]} />
            <meshStandardMaterial color={accent} roughness={0.6} />
          </mesh>
        </group>
      )}

      {!presentationMode && windows.map((w) => (
        <GridWindow key={w.key} position={w.pos} styleId={windowStyle} onSelect={onSelectElement} selected={selectedElement?.type === 'window'} />
      ))}

      {!presentationMode && !hideExterior && (
        <ModernDoor position={[0, 1.35, depth / 2 + (cutaway ? 0 : 0.1)]} styleId={doorStyle} onSelect={onSelectElement} selected={selectedElement?.type === 'door'} />
      )}

      {visibleItems.map((item, i) => (
        <FurnitureRenderer
          key={item.uid || `${item.id}-${i}`}
          item={item}
          selected={selectedElement?.uid === item.uid}
          onSelect={onSelectElement}
          onMove={onMoveItem}
          draggable={!!onMoveItem}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          presentationMode={presentationMode}
        />
      ))}

      <Landscaping width={width} depth={depth} visible={!presentationMode && !isDollhouse && cameraMode !== 'isometric'} />

      {!isDollhouse && (
        <mesh position={[0, -0.15, 0]} receiveShadow>
          <boxGeometry args={[width + 0.8, 0.3, depth + 0.8]} />
          <meshStandardMaterial color="#7F8C8D" roughness={0.95} />
        </mesh>
      )}
    </group>
  );
}

function CommercialTower({
  floors, width, depth, materials, doorStyle, windowStyle, placedItems,
  showRoof, viewMode, activeFloor, selectedElement, onSelectElement,
  buildingType, onMoveItem, cameraMode, onDragStart, onDragEnd, presentationMode, floorRooms = {}, facade,
  stackedCutaway = false, selectedRoom = null, onRoomSelect,
}) {
  const totalH = floors * FLOOR_H;
  const isDollhouse = viewMode === 'dollhouse' && typeof activeFloor === 'number';
  const wall = materials.wallColor || '#D5DBDB';
  const roof = materials.roofColor || '#2C3E50';
  const accent = materials.accentColor || '#E67E22';
  const cutaway = viewMode === 'cutaway' || viewMode === 'interior' || isDollhouse;
  const hideRoof = !showRoof || cutaway || isDollhouse;

  const visibleFloors = isDollhouse ? 1 : floors;
  const floorY = isDollhouse ? (activeFloor - 1) * FLOOR_H : 0;
  const segmentH = isDollhouse ? FLOOR_H : totalH;
  const segmentCenterY = isDollhouse ? floorY + FLOOR_H / 2 : totalH / 2;

  const windows = useMemo(() => {
    if (isDollhouse) {
      const f = activeFloor - 1;
      return Array.from({ length: 4 }, (_, c) => ({
        key: `${f}-${c}`,
        pos: [-width * 0.3 + c * (width * 0.2), floorY + 1.4, depth / 2 + 0.05],
      }));
    }
    const list = [];
    for (let f = 0; f < floors; f++) {
      if (activeFloor !== 'all' && activeFloor !== f + 1) continue;
      for (let c = 0; c < 4; c++) {
        list.push({ key: `${f}-${c}`, pos: [-width * 0.3 + c * (width * 0.2), 1.4 + f * FLOOR_H, depth / 2 + 0.05] });
      }
    }
    return list;
  }, [floors, width, depth, activeFloor, isDollhouse, floorY]);

  const visibleItems = placedItems.filter((item) => {
    if (item.zone === 'exterior') return activeFloor === 'all' || activeFloor === 'roof';
    if (activeFloor === 'all') return item.zone !== 'exterior';
    if (typeof activeFloor === 'number') return item.floor === activeFloor || !item.floor;
    return true;
  });

  return (
    <group>
      {!isDollhouse && presentationMode ? (
        <>
          <SceneEnvironment
            width={width}
            depth={depth}
            stoneColor={materials.stoneColor}
            accentColor={accent}
            floors={floors}
          />
          <CommercialPresentation
            floors={floors}
            width={width}
            depth={depth}
            materials={materials}
            accent={accent}
            facade={facade}
          />
          {placedItems.filter((i) => i.zone === 'exterior').map((item, idx) => (
            <FurnitureRenderer key={item.uid || `ext-${idx}`} item={item} presentationMode />
          ))}
        </>
      ) : !isDollhouse ? (
        <>
          <mesh position={[0, totalH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, totalH, depth]} />
            <meshStandardMaterial color={wall} roughness={0.6} metalness={0.15} />
          </mesh>
          <mesh position={[0, totalH - 0.4, depth / 2 + 0.02]} castShadow>
            <boxGeometry args={[width + 0.15, 0.7, 0.08]} />
            <meshStandardMaterial color={accent} roughness={0.35} metalness={0.3} />
          </mesh>
        </>
      ) : null}
      {isDollhouse && (
        <>
          {presentationMode && <PresentationDollhouseSite width={width} depth={depth} />}
          {(stackedCutaway && typeof activeFloor === 'number'
            ? Array.from({ length: activeFloor }, (_, i) => i + 1)
            : [activeFloor]
          ).map((f) => {
            const fy = (f - 1) * FLOOR_H;
            return (
              <group key={`stack-${f}`}>
                <DollhouseFloors
                  width={width}
                  depth={depth}
                  floorIndex={f}
                  buildingType={buildingType}
                  floors={floors}
                  floorY={fy}
                  floorRooms={floorRooms}
                  presentationMode={presentationMode}
                  selectedRoomId={selectedRoom?.floor === f ? selectedRoom.id : null}
                  onRoomClick={onRoomSelect ? (room) => onRoomSelect({ ...room, floor: f }) : undefined}
                />
                <DollhouseWalls
                  width={width}
                  depth={depth}
                  floorIndex={f}
                  buildingType={buildingType}
                  floors={floors}
                  floorRooms={floorRooms}
                  presentationMode={presentationMode}
                  fullHeightWalls={stackedCutaway}
                />
              </group>
            );
          })}
          {stackedCutaway && typeof activeFloor === 'number' && (
            <>
              <mesh position={[0, activeFloor * FLOOR_H + 0.02, 0]} castShadow>
                <boxGeometry args={[width + 0.08, 0.06, depth + 0.08]} />
                <meshStandardMaterial color={materials.roofColor || '#2C3E50'} roughness={0.5} />
              </mesh>
              <mesh position={[-width / 2 - 0.06, (activeFloor * FLOOR_H) / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.12, activeFloor * FLOOR_H, depth + 0.12]} />
                <meshStandardMaterial color={wall} roughness={0.65} />
              </mesh>
              <mesh position={[width / 2 + 0.06, (activeFloor * FLOOR_H) / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.12, activeFloor * FLOOR_H, depth + 0.12]} />
                <meshStandardMaterial color={wall} roughness={0.65} />
              </mesh>
              <mesh position={[0, (activeFloor * FLOOR_H) / 2, -depth / 2 - 0.06]} castShadow receiveShadow>
                <boxGeometry args={[width + 0.12, activeFloor * FLOOR_H, 0.12]} />
                <meshStandardMaterial color={wall} roughness={0.65} />
              </mesh>
            </>
          )}
        </>
      )}
      {!presentationMode && !hideRoof && !isDollhouse && (
        <>
          <mesh position={[0, totalH + 0.25, 0]} castShadow>
            <boxGeometry args={[width + 0.5, 0.35, depth + 0.5]} />
            <meshStandardMaterial color={roof} metalness={0.25} roughness={0.45} />
          </mesh>
          <mesh position={[0, totalH + 0.55, 0]}>
            <boxGeometry args={[width + 0.25, 0.25, depth + 0.25]} />
            <meshStandardMaterial color={accent} metalness={0.4} roughness={0.3} />
          </mesh>
        </>
      )}
      {!presentationMode && cutaway && !isDollhouse && Array.from({ length: floors }).map((_, f) => {
        if (activeFloor !== 'all' && activeFloor !== f + 1) return null;
        return (
          <mesh key={f} position={[0, f * FLOOR_H + 0.03, 0]} receiveShadow>
            <boxGeometry args={[width - 0.2, 0.08, depth - 0.2]} />
            <meshStandardMaterial color="#ECF0F1" roughness={0.8} />
          </mesh>
        );
      })}
      {!presentationMode && windows.map((w) => (
        <GridWindow key={w.key} position={w.pos} w={1.1} h={1.4} styleId={windowStyle || 'curtain'} onSelect={onSelectElement} selected={selectedElement?.type === 'window'} />
      ))}
      {!presentationMode && !isDollhouse && (
        <ModernDoor position={[0, 1.3, depth / 2 + 0.08]} styleId={doorStyle} onSelect={onSelectElement} selected={selectedElement?.type === 'door'} />
      )}
      {visibleItems.map((item, i) => (
        <FurnitureRenderer
          key={item.uid || i}
          item={item}
          selected={selectedElement?.uid === item.uid}
          onSelect={onSelectElement}
          onMove={onMoveItem}
          draggable={!!onMoveItem}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          presentationMode={presentationMode}
        />
      ))}
      {!presentationMode && !isDollhouse && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color="#58D68D" roughness={0.95} />
        </mesh>
      )}
    </group>
  );
}

export default function BuildingViewer({
  floors = 5, width = 8, depth = 6, materials = {},
  doorStyle = 'wood', windowStyle = 'standard', placedItems = [],
  showRoof = true, viewMode = 'exterior', activeFloor = 'all',
  buildingStyle = 'auto', buildingType = 'office',
  selectedElement = null, onSelectElement, onMoveItem,
  cameraMode = 'orbit', className = '', style = {}, initialAzimuth,
  freeLook = false, presentationMode = false, referenceCaptureMode = false, fitFraming = false, showControlsHint = false, controlsEnabled = true, onFloorClick, floorRooms = {},
  stackedCutaway = false, selectedRoom = null, onRoomSelect,
}) {
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const handleDragStart = useCallback(() => setOrbitEnabled(false), []);
  const handleDragEnd = useCallback(() => setOrbitEnabled(true), []);
  const displayFloors = floors;
  const isResidential = buildingStyle === 'residential';
  const isDollhouse = viewMode === 'dollhouse' && typeof activeFloor === 'number';
  const facade = useMemo(() => deriveFacadeFromDesign({
    width, depth, floors: displayFloors, floorRooms, doorStyle, windowStyle, placedItems,
  }), [width, depth, displayFloors, floorRooms, doorStyle, windowStyle, placedItems]);
  const targetY = isDollhouse
    ? (activeFloor - 1) * FLOOR_H + FLOOR_H * 0.35
    : presentationMode
      ? displayFloors * FLOOR_H * 0.45
      : displayFloors * FLOOR_H * 0.45;
  const buildingSpan = Math.max(width, depth, 6);
  const stackFloors = stackedCutaway && typeof activeFloor === 'number' ? activeFloor : displayFloors;
  const buildingH = stackFloors * FLOOR_H;
  const fitScale = stackedCutaway ? 0.95 : 3.4;
  const rawDistance = Math.max(buildingSpan, buildingH * 0.85) * (presentationMode ? 2.6 : fitFraming ? fitScale : 2.8);
  const distance = fitFraming || referenceCaptureMode
    ? Math.max(
      rawDistance,
      buildingH * (stackedCutaway ? 0.35 : 1.35),
      buildingSpan * (stackedCutaway ? 0.85 : 3.2),
    )
    : Math.min(rawDistance, isDollhouse ? 42 : presentationMode ? Math.max(85, buildingH * 1.2) : Math.max(75, buildingH * 1.05));
  const useFitCamera = fitFraming || referenceCaptureMode;
  const effectiveCamera = isDollhouse && !freeLook ? 'dollhouse' : cameraMode;
  const camFov = referenceCaptureMode ? 26 : (presentationMode ? 36 : fitFraming ? 38 : 42);
  const camFar = Math.max(500, displayFloors * FLOOR_H * 10);
  const bgGradient = presentationMode
    ? 'linear-gradient(180deg, #87CEEB 0%, #C5E8FF 55%, #E8F6FF 100%)'
    : 'linear-gradient(180deg, #87CEEB 0%, #E8F6FF 45%, #D5EFD5 100%)';

  return (
    <div className={`three-canvas overflow-hidden rounded-xl relative ${className}`} style={{ height: '100%', minHeight: fitFraming ? 320 : 480, background: bgGradient, ...style }}>
      {showControlsHint && (
        <div className="absolute top-3 left-3 z-10 rounded-lg bg-black/50 px-3 py-1.5 text-xs text-white pointer-events-none max-w-[240px]">
          Drag to orbit · Scroll to zoom · Click a room to highlight inside
        </div>
      )}
      <Canvas shadows dpr={presentationMode || referenceCaptureMode ? [1, 2.5] : [1, 1.5]} camera={{ fov: camFov, near: 0.1, far: camFar }} gl={{ preserveDrawingBuffer: true, powerPreference: 'high-performance', antialias: true }}>
        <Suspense fallback={null}>
          <WebGLGuard />
          {presentationMode ? (
            <PresentationLighting
              isInterior={isDollhouse}
              buildingHeight={displayFloors * FLOOR_H}
              buildingSpan={Math.max(width, depth)}
            />
          ) : (
            <>
              <Sky sunPosition={[100, 40, 100]} turbidity={2} rayleigh={1.5} />
              <ambientLight intensity={0.55} />
              <hemisphereLight intensity={0.4} groundColor="#58D68D" color="#FFF8E7" />
              <directionalLight position={[15, 25, 12]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-far={80} />
              <directionalLight position={[-10, 15, -8]} intensity={0.3} color="#E8F4FD" />
            </>
          )}
          {(viewMode === 'interior' || isDollhouse) && !presentationMode && (
            <pointLight position={[0, targetY, 0]} intensity={0.85} color="#FFF8E1" distance={25} />
          )}
          {(viewMode === 'interior' || isDollhouse) && !presentationMode && (
            <pointLight position={[width * 0.3, targetY + 1.5, depth * 0.2]} intensity={0.4} color="#FFF5E6" distance={18} />
          )}

          {isDollhouse && typeof activeFloor === 'number' && (
            <FloorClickPlane
              floorY={(activeFloor - 1) * FLOOR_H}
              onFloorClick={onFloorClick}
              enabled={!!onFloorClick}
            />
          )}

          {isResidential ? (
            <ResidentialHouse
              floors={displayFloors} width={width} depth={depth} materials={materials}
              doorStyle={doorStyle} windowStyle={windowStyle} placedItems={placedItems}
              showRoof={showRoof} viewMode={viewMode} activeFloor={activeFloor}
              selectedElement={selectedElement} onSelectElement={onSelectElement}
              buildingType={buildingType} onMoveItem={onMoveItem} cameraMode={effectiveCamera}
              onDragStart={handleDragStart} onDragEnd={handleDragEnd} presentationMode={presentationMode}
              floorRooms={floorRooms} facade={facade} stackedCutaway={stackedCutaway}
              selectedRoom={selectedRoom} onRoomSelect={onRoomSelect}
            />
          ) : (
            <CommercialTower
              floors={displayFloors} width={width} depth={depth} materials={materials}
              doorStyle={doorStyle} windowStyle={windowStyle} placedItems={placedItems}
              showRoof={showRoof} viewMode={viewMode} activeFloor={activeFloor}
              selectedElement={selectedElement} onSelectElement={onSelectElement}
              buildingType={buildingType} onMoveItem={onMoveItem} cameraMode={effectiveCamera}
              onDragStart={handleDragStart} onDragEnd={handleDragEnd} presentationMode={presentationMode}
              floorRooms={floorRooms} facade={facade} stackedCutaway={stackedCutaway}
              selectedRoom={selectedRoom} onRoomSelect={onRoomSelect}
            />
          )}

          <ContactShadows
            position={[0, 0.02, 0]}
            opacity={presentationMode ? 0.75 : 0.4}
            scale={presentationMode ? Math.max(width, depth) * 1.8 : 30}
            blur={presentationMode ? 2.8 : 2.5}
            far={presentationMode ? Math.max(20, displayFloors * FLOOR_H * 0.6) : 20}
          />
          {!presentationMode && (effectiveCamera === 'orbit' || freeLook) && <Environment preset="sunset" />}
          <CameraRig
            targetY={targetY}
            distance={distance}
            cameraMode={effectiveCamera}
            width={width}
            depth={depth}
            activeFloor={activeFloor}
            floors={displayFloors}
            initialAzimuth={initialAzimuth ?? 0.75}
            freeLook={freeLook}
            orbitEnabled={orbitEnabled}
            presentationMode={presentationMode}
            referenceCaptureMode={referenceCaptureMode || useFitCamera}
            isDollhouse={isDollhouse}
            controlsEnabled={controlsEnabled}
            stackedCutaway={stackedCutaway}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
