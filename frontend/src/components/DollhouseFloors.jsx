import { useMemo } from 'react';
import { getRoomsForFloor } from '../utils/roomLayouts';
import { tileTexture, woodGrainTexture } from '../utils/presentationMaterials';

const FLOOR_COLORS = {
  bedroom: '#8D6E63',
  kitchen: '#B0BEC5',
  bath: '#D7CCC8',
  wash: '#D7CCC8',
  toilet: '#D7CCC8',
  living: '#ECEFF1',
  drawing: '#ECEFF1',
  lobby: '#E8DDD4',
  open: '#ECF0F1',
  meeting: '#CFD8DC',
  terrace: '#A5D6A7',
  balcony: '#BCAAA4',
  default: '#D7CCC8',
};

function roomColor(roomId) {
  const id = roomId.toLowerCase();
  if (id.includes('bed')) return FLOOR_COLORS.bedroom;
  if (id.includes('kitchen') || id.includes('cafe') || id.includes('pantry')) return FLOOR_COLORS.kitchen;
  if (id.includes('bath') || id.includes('wash') || id.includes('toilet') || id.includes('services')) return FLOOR_COLORS.bath;
  if (id.includes('drawing') || id.includes('living')) return FLOOR_COLORS.living;
  if (id.includes('lobby')) return FLOOR_COLORS.lobby;
  if (id.includes('open') || id.includes('focus') || id.includes('collab')) return FLOOR_COLORS.open;
  if (id.includes('meeting') || id.includes('board')) return FLOOR_COLORS.meeting;
  if (id.includes('terrace') || id.includes('balcony')) return FLOOR_COLORS.terrace;
  return FLOOR_COLORS.default;
}

/** Room-zone floor tiles for dollhouse interior view */
export default function DollhouseFloors({
  width, depth, floorIndex, buildingType, floors, floorY, floorRooms = {}, presentationMode = false,
  onRoomClick, selectedRoomId = null,
}) {
  const rooms = useMemo(() => (
    getRoomsForFloor(width, depth, floorIndex, buildingType, floors, floorRooms)
  ), [width, depth, floorIndex, buildingType, floors, floorRooms]);

  const wFt = width * 3.281;
  const dFt = depth * 3.281;

  return (
    <group position={[0, floorY + 0.03, 0]}>
      {rooms.map((room) => {
        const cx = ((room.x + room.w / 2) / wFt - 0.5) * width;
        const cz = ((room.y + room.h / 2) / dFt - 0.5) * depth;
        const rw = (room.w / wFt) * width - 0.08;
        const rd = (room.h / dFt) * depth - 0.08;
        const color = roomColor(room.id);
        const isWood = color === FLOOR_COLORS.bedroom || color === FLOOR_COLORS.balcony;
        const floorMat = presentationMode
          ? (isWood
            ? { map: woodGrainTexture(color), color: '#ffffff', roughness: 0.58, metalness: 0.02 }
            : { map: tileTexture(color), color: '#ffffff', roughness: 0.42, metalness: 0.04 })
          : { color, roughness: isWood ? 0.55 : 0.35, metalness: isWood ? 0 : 0.05 };
        const isSelected = selectedRoomId === room.id;
        return (
          <group key={room.id} position={[cx, 0, cz]}>
            <mesh
              receiveShadow
              castShadow={presentationMode}
              onClick={(e) => {
                if (!onRoomClick) return;
                e.stopPropagation();
                onRoomClick({ id: room.id, label: room.label || room.id });
              }}
              onPointerOver={(e) => { if (onRoomClick) e.stopPropagation(); document.body.style.cursor = onRoomClick ? 'pointer' : 'auto'; }}
              onPointerOut={() => { document.body.style.cursor = 'auto'; }}
            >
              <boxGeometry args={[rw, 0.06, rd]} />
              <meshStandardMaterial
                {...floorMat}
                emissive={isSelected ? '#E67E22' : '#000000'}
                emissiveIntensity={isSelected ? 0.35 : 0}
              />
            </mesh>
            {isSelected && (
              <mesh position={[0, 0.12, 0]}>
                <boxGeometry args={[rw + 0.06, 0.02, rd + 0.06]} />
                <meshStandardMaterial color="#E67E22" transparent opacity={0.55} />
              </mesh>
            )}
            {isWood && Array.from({ length: Math.floor(rd * 2.5) }).map((_, i) => (
              <mesh key={i} position={[0, 0.04, -rd / 2 + 0.15 + i * 0.38]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[rw - 0.1, 0.025]} />
                <meshStandardMaterial color="#6D4C41" roughness={0.7} transparent opacity={0.25} />
              </mesh>
            ))}
            {!isWood && color === FLOOR_COLORS.living && (
              <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[rw * 0.7, rd * 0.5]} />
                <meshStandardMaterial color="#FAFAFA" roughness={0.95} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
