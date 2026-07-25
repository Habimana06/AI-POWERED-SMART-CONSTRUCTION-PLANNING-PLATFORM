import { useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { furnitureMaterialProps } from '../utils/presentationMaterials';

function Selectable({
  children, onSelect, selected, type, id, uid, onMove, draggable,
  floorY = 0, onDragStart, onDragEnd, hitSize = [1.2, 0.8, 1.2],
}) {
  const { camera, gl } = useThree();
  const dragging = useRef(false);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const intersection = useMemo(() => new THREE.Vector3(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);

  const projectMove = useCallback((clientX, clientY) => {
    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    plane.constant = -floorY;
    if (raycaster.ray.intersectPlane(plane, intersection)) {
      onMove?.(uid, { x: intersection.x, z: intersection.z });
    }
  }, [camera, gl, floorY, intersection, onMove, plane, pointer, raycaster, uid]);

  const handlePointerDown = (e) => {
    if (!draggable || !onMove) return;
    e.stopPropagation();
    dragging.current = true;
    onDragStart?.();
    onSelect?.(type, id, uid);
    document.body.style.cursor = 'grabbing';

    const onWindowMove = (ev) => {
      if (!dragging.current) return;
      projectMove(ev.clientX, ev.clientY);
    };
    const onWindowUp = () => {
      dragging.current = false;
      onDragEnd?.();
      document.body.style.cursor = 'default';
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', onWindowUp);
    };
    window.addEventListener('pointermove', onWindowMove);
    window.addEventListener('pointerup', onWindowUp);
  };

  return (
    <group
      onPointerDown={handlePointerDown}
      onClick={(e) => { e.stopPropagation(); onSelect?.(type, id, uid); }}
      onPointerOver={(e) => { e.stopPropagation(); if (!dragging.current) document.body.style.cursor = draggable ? 'grab' : 'pointer'; }}
      onPointerOut={() => { if (!dragging.current) document.body.style.cursor = 'default'; }}
    >
      {draggable && (
        <mesh visible={false}>
          <boxGeometry args={hitSize} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
      {children}
    </group>
  );
}

function SelectionOutline({ hitSize, visible }) {
  if (!visible) return null;
  return (
    <mesh>
      <boxGeometry args={hitSize} />
      <meshBasicMaterial color="#E67E22" wireframe transparent opacity={0.9} />
    </mesh>
  );
}

function ModelWrapper({ item, selected, onSelect, onMove, draggable, onDragStart, onDragEnd, hitSize, children }) {
  const h = item.h || 0.5;
  const rot = item.rotationY || 0;
  return (
    <Selectable
      selected={selected}
      onSelect={onSelect}
      type="furniture"
      id={item.id}
      uid={item.uid}
      onMove={onMove}
      draggable={draggable}
      floorY={item.y || 0}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      hitSize={hitSize}
    >
      <group position={[item.x || 0, (item.y || 0) + h / 2, item.z || 0]} rotation={[0, rot, 0]}>
        <SelectionOutline hitSize={hitSize} visible={selected} />
        {children}
      </group>
    </Selectable>
  );
}

export function BedModel(props) {
  const { item } = props;
  const { w = 1.6, d = 2, h = 0.5, color = '#5DADE2' } = item;
  const bedding = item.id?.includes('king') ? '#ECF0F1' : '#C0392B';
  const accent = item.id?.includes('king') ? '#1A5276' : '#1C2833';
  return (
    <ModelWrapper {...props} hitSize={[w + 0.3, 1, d + 0.3]}>
      <mesh castShadow receiveShadow position={[0, -h / 2 + h * 0.25, 0]}>
        <boxGeometry args={[w, h * 0.5, d]} />
        <meshStandardMaterial color="#5D4037" roughness={0.75} />
      </mesh>
      <mesh castShadow position={[0, -h / 2 + h * 0.55, 0]}>
        <boxGeometry args={[w - 0.08, h * 0.35, d - 0.1]} />
        <meshStandardMaterial color={bedding} roughness={0.88} />
      </mesh>
      <mesh castShadow position={[0, h * 0.1, -d / 2 + 0.12]}>
        <boxGeometry args={[w, h * 0.75, 0.12]} />
        <meshStandardMaterial color="#ECF0F1" roughness={0.5} />
      </mesh>
      {[-w * 0.32, w * 0.32].map((x) => (
        <mesh key={x} castShadow position={[x, h * 0.15, -d / 2 + 0.22]}>
          <boxGeometry args={[0.35, 0.25, 0.35]} />
          <meshStandardMaterial color={accent} roughness={0.7} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -h / 2 + 0.02, 0]} receiveShadow>
        <planeGeometry args={[w + 0.4, d + 0.4]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.95} />
      </mesh>
    </ModelWrapper>
  );
}

export function SofaModel(props) {
  const color = props.item?.color || '#E67E22';
  return (
    <ModelWrapper {...props} hitSize={[2.5, 1, 1.2]}>
      <mesh castShadow position={[0, -0.15, 0]}>
        <boxGeometry args={[2.2, 0.4, 0.85]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0, 0.1, -0.32]}>
        <boxGeometry args={[2.2, 0.5, 0.18]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} castShadow position={[x, 0.05, 0]}>
          <boxGeometry args={[0.18, 0.45, 0.82]} />
          <meshStandardMaterial color={color} roughness={0.82} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.12, 0.38]}>
        <boxGeometry args={[2.0, 0.08, 0.12]} />
        <meshStandardMaterial color="#D35400" roughness={0.75} />
      </mesh>
    </ModelWrapper>
  );
}

export function ArmchairModel(props) {
  const color = props.item?.color || '#E67E22';
  return (
    <ModelWrapper {...props} hitSize={[1, 1, 1]}>
      <mesh castShadow position={[0, -0.12, 0]}>
        <boxGeometry args={[0.75, 0.35, 0.75]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0, 0.08, -0.28]}>
        <boxGeometry args={[0.75, 0.45, 0.14]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      <mesh castShadow position={[-0.28, 0.05, 0]}>
        <boxGeometry args={[0.12, 0.4, 0.7]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0.28, 0.05, 0]}>
        <boxGeometry args={[0.12, 0.4, 0.7]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
    </ModelWrapper>
  );
}

export function RugModel(props) {
  const { item } = props;
  const w = item.w || 2.5;
  const d = item.d || 1.8;
  return (
    <ModelWrapper {...props} hitSize={[w, 0.1, d]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={item.color || '#FAFAFA'} roughness={0.98} />
      </mesh>
    </ModelWrapper>
  );
}

export function TVModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[1.8, 1.5, 0.6]}>
      <mesh castShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[1.6, 0.9, 0.08]} />
        <meshStandardMaterial color="#1C2833" metalness={0.3} roughness={0.2} />
      </mesh>
    </ModelWrapper>
  );
}

export function KitchenModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[1, 1.2, 0.8]}>
      <mesh castShadow position={[0, -0.1, 0]}>
        <boxGeometry args={[0.85, 0.85, 0.65]} />
        <meshStandardMaterial color="#2C3E50" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh castShadow position={[0, 0.05, 0.28]}>
        <boxGeometry args={[0.5, 0.06, 0.12]} />
        <meshStandardMaterial color="#1C2833" metalness={0.7} roughness={0.2} />
      </mesh>
      {[-0.15, 0, 0.15].map((x) => (
        <mesh key={x} castShadow position={[x, 0.12, 0.28]}>
          <cylinderGeometry args={[0.06, 0.06, 0.04, 12]} />
          <meshStandardMaterial color="#566573" metalness={0.8} />
        </mesh>
      ))}
    </ModelWrapper>
  );
}

export function FridgeModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[0.85, 2, 0.85]}>
      <mesh castShadow>
        <boxGeometry args={[0.72, 1.85, 0.68]} />
        <meshStandardMaterial color="#ECF0F1" roughness={0.25} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.45, 0.35]}>
        <boxGeometry args={[0.68, 0.75, 0.04]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.35, 0.35]}>
        <boxGeometry args={[0.68, 0.65, 0.04]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.2} />
      </mesh>
      <mesh position={[0.28, 0.45, 0.38]}>
        <boxGeometry args={[0.04, 0.12, 0.02]} />
        <meshStandardMaterial color="#BDC3C7" metalness={0.6} />
      </mesh>
      <mesh position={[0.28, -0.35, 0.38]}>
        <boxGeometry args={[0.04, 0.12, 0.02]} />
        <meshStandardMaterial color="#BDC3C7" metalness={0.6} />
      </mesh>
    </ModelWrapper>
  );
}

export function ToiletModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[0.65, 0.9, 0.85]}>
      <mesh castShadow position={[0, -0.15, 0]}>
        <boxGeometry args={[0.42, 0.35, 0.55]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.35} />
      </mesh>
      <mesh castShadow position={[0, 0.05, -0.05]}>
        <boxGeometry args={[0.38, 0.08, 0.42]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.25, -0.22]}>
        <boxGeometry args={[0.35, 0.45, 0.12]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.35} />
      </mesh>
      <mesh castShadow position={[0, 0.42, -0.22]}>
        <boxGeometry args={[0.38, 0.06, 0.14]} />
        <meshStandardMaterial color="#ECF0F1" roughness={0.25} />
      </mesh>
    </ModelWrapper>
  );
}

export function SinkModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[0.75, 1, 0.6]}>
      <mesh castShadow position={[0, -0.2, 0]}>
        <boxGeometry args={[0.65, 0.75, 0.48]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[0.55, 0.06, 0.38]} />
        <meshStandardMaterial color="#BDC3C7" roughness={0.2} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.35, 0.12, 0.25]} />
        <meshStandardMaterial color="#95A5A6" roughness={0.15} metalness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 0.35, -0.15]}>
        <cylinderGeometry args={[0.025, 0.025, 0.25, 8]} />
        <meshStandardMaterial color="#BDC3C7" metalness={0.85} roughness={0.15} />
      </mesh>
    </ModelWrapper>
  );
}

export function BathtubModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[1.8, 0.7, 0.9]}>
      <mesh castShadow position={[0, -0.05, 0]}>
        <boxGeometry args={[1.55, 0.45, 0.72]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[1.35, 0.25, 0.58]} />
        <meshStandardMaterial color="#D5DBDB" roughness={0.2} metalness={0.1} />
      </mesh>
    </ModelWrapper>
  );
}

export function WardrobeModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[1.4, 2.2, 0.7]}>
      <mesh castShadow>
        <boxGeometry args={[1.2, 2, 0.55]} />
        <meshStandardMaterial color="#AED6F1" roughness={0.3} />
      </mesh>
    </ModelWrapper>
  );
}

export function LightModel(props) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.intensity = 0.6 + Math.sin(clock.elapsedTime * 2) * 0.1;
  });
  return (
    <ModelWrapper {...props} hitSize={[0.8, 0.8, 0.8]}>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#FFD700" emissive="#F1C40F" emissiveIntensity={0.8} />
      </mesh>
      <pointLight ref={ref} position={[0, 1.5, 0]} intensity={0.8} distance={8} color="#FFF8E1" />
    </ModelWrapper>
  );
}

export function ChairModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[0.8, 1.2, 0.8]}>
      <mesh castShadow position={[0, -0.15, 0]}>
        <boxGeometry args={[0.5, 0.08, 0.5]} />
        <meshStandardMaterial color="#34495E" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.2, -0.15]}>
        <boxGeometry args={[0.48, 0.5, 0.08]} />
        <meshStandardMaterial color="#2C3E50" roughness={0.6} />
      </mesh>
    </ModelWrapper>
  );
}

export function DeskModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[1.6, 1, 0.9]}>
      <mesh castShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[1.4, 0.06, 0.7]} />
        <meshStandardMaterial color="#8B4513" roughness={0.65} />
      </mesh>
      {[[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, -0.3, z]}>
          <boxGeometry args={[0.06, 0.6, 0.06]} />
          <meshStandardMaterial color="#5D4037" roughness={0.8} />
        </mesh>
      ))}
    </ModelWrapper>
  );
}

export function DiningTableModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[2.2, 1, 1.4]}>
      <mesh castShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[1.8, 0.08, 1]} />
        <meshStandardMaterial color="#5D4037" roughness={0.55} />
      </mesh>
      {[[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35], [0, -0.55], [0, 0.55]].map(([x, z], i) => (
        <group key={i} position={[x, -0.2, z]}>
          <mesh castShadow>
            <boxGeometry args={[0.08, 0.5, 0.08]} />
            <meshStandardMaterial color="#6E2C00" roughness={0.75} />
          </mesh>
          {i < 4 && (
            <mesh castShadow position={[0, 0.35, 0]}>
              <boxGeometry args={[0.42, 0.08, 0.42]} />
              <meshStandardMaterial color="#2C3E50" roughness={0.65} />
            </mesh>
          )}
        </group>
      ))}
    </ModelWrapper>
  );
}

export function CoffeeTableModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[1.4, 0.6, 1]}>
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[1.2, 0.08, 0.7]} />
        <meshStandardMaterial color="#8B4513" roughness={0.6} />
      </mesh>
    </ModelWrapper>
  );
}

export function PlantModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[0.7, 1.4, 0.7]}>
      <mesh castShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.45, 8]} />
        <meshStandardMaterial color="#795548" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.35, 10, 10]} />
        <meshStandardMaterial color="#27AE60" roughness={0.88} />
      </mesh>
      <mesh castShadow position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.28, 10, 10]} />
        <meshStandardMaterial color="#2ECC71" roughness={0.85} />
      </mesh>
    </ModelWrapper>
  );
}

export function GenericFurniture(props) {
  const { item, presentationMode = false } = props;
  const w = item.w || 1;
  const h = item.h || 0.5;
  const d = item.d || 1;
  const mat = furnitureMaterialProps(item, presentationMode);
  return (
    <ModelWrapper {...props} hitSize={[w + 0.2, h + 0.2, d + 0.2]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial {...mat} />
      </mesh>
    </ModelWrapper>
  );
}

export function FurnitureRenderer({
  item, selected, onSelect, onMove, draggable, onDragStart, onDragEnd, presentationMode = false,
}) {
  const id = item.meshType || item.id || '';
  const props = {
    item, selected, onSelect, onMove, draggable, onDragStart, onDragEnd, presentationMode,
  };
  if (id.includes('bed')) return <BedModel {...props} />;
  if (id === 'sofa') return <SofaModel {...props} />;
  if (id === 'armchair') return <ArmchairModel {...props} />;
  if (id === 'rug') return <RugModel {...props} />;
  if (id === 'tv') return <TVModel {...props} />;
  if (id === 'stove') return <KitchenModel {...props} />;
  if (id === 'fridge') return <FridgeModel {...props} />;
  if (id === 'toilet') return <ToiletModel {...props} />;
  if (id === 'sink') return <SinkModel {...props} />;
  if (id === 'bathtub') return <BathtubModel {...props} />;
  if (id === 'wardrobe') return <WardrobeModel {...props} />;
  if (id.includes('light')) return <LightModel {...props} />;
  if (id === 'chair') return <ChairModel {...props} />;
  if (id === 'desk') return <DeskModel {...props} />;
  if (id === 'table-dining') return <DiningTableModel {...props} />;
  if (id === 'coffee-table') return <CoffeeTableModel {...props} />;
  if (id === 'plant') return <PlantModel {...props} />;
  if (id === 'car') return <CarModel {...props} />;
  if (id === 'pool') return <PoolModel {...props} />;
  if (id === 'cctv') return <CctvModel {...props} />;
  if (id === 'corrugated-roof') return <CorrugatedRoofModel {...props} />;
  if (id === 'gate') return <GateModel {...props} />;
  if (id === 'solar-panel') return <SolarPanelModel {...props} />;
  if (id === 'tree-large') return <PlantModel {...props} />;
  return <GenericFurniture {...props} />;
}

export function CarModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[2, 1.5, 4.2]}>
      <mesh castShadow position={[0, -0.2, 0]}>
        <boxGeometry args={[1.8, 0.6, 3.8]} />
        <meshStandardMaterial color="#3498DB" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.15, 0]}>
        <boxGeometry args={[1.5, 0.5, 2]} />
        <meshStandardMaterial color="#85C1E9" roughness={0.2} metalness={0.5} transparent opacity={0.85} />
      </mesh>
    </ModelWrapper>
  );
}

export function PoolModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[4.2, 0.5, 3.2]}>
      <mesh castShadow position={[0, -0.1, 0]}>
        <boxGeometry args={[4, 0.25, 3]} />
        <meshStandardMaterial color="#3498DB" roughness={0.15} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[3.6, 0.05, 2.6]} />
        <meshStandardMaterial color="#5DADE2" roughness={0.05} metalness={0.4} transparent opacity={0.8} />
      </mesh>
    </ModelWrapper>
  );
}

export function CctvModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[0.6, 0.6, 0.6]}>
      <mesh castShadow position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.5, 8]} />
        <meshStandardMaterial color="#566573" metalness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.55, 0.1]}>
        <boxGeometry args={[0.15, 0.12, 0.25]} />
        <meshStandardMaterial color="#2C3E50" metalness={0.5} />
      </mesh>
    </ModelWrapper>
  );
}

export function CorrugatedRoofModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[3.2, 0.3, 2.2]}>
      <mesh castShadow rotation={[0, 0, 0]}>
        <boxGeometry args={[3, 0.12, 2]} />
        <meshStandardMaterial color="#7F8C8D" roughness={0.85} />
      </mesh>
    </ModelWrapper>
  );
}

export function GateModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[2.8, 2.2, 0.4]}>
      <mesh castShadow>
        <boxGeometry args={[2.4, 2, 0.15]} />
        <meshStandardMaterial color="#5D4037" roughness={0.7} />
      </mesh>
    </ModelWrapper>
  );
}

export function SolarPanelModel(props) {
  return (
    <ModelWrapper {...props} hitSize={[3.2, 0.2, 2.2]}>
      <mesh castShadow rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[3, 0.08, 2]} />
        <meshStandardMaterial color="#1C2833" roughness={0.3} metalness={0.4} />
      </mesh>
    </ModelWrapper>
  );
}
