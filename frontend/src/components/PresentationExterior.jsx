import { useMemo } from 'react';
import { DOOR_STYLES } from '../utils/buildingAssets';
import {
  plasterMaterial, stoneMaterial, glassPhysicalProps,
} from '../utils/presentationMaterials';

const FLOOR_H = 3;
const FRAME = { color: '#1A252F', metalness: 0.72, roughness: 0.22 };

function GlassPane({ w, h, inset = 0.01, warm = true }) {
  return (
    <mesh position={[0, 0, inset]} castShadow receiveShadow>
      <boxGeometry args={[w, h, 0.025]} />
      <meshPhysicalMaterial
        {...glassPhysicalProps({
          color: '#7EC8E3',
          emissive: warm ? '#3d2a10' : '#1a3040',
          emissiveIntensity: warm ? 0.35 : 0.06,
        })}
      />
    </mesh>
  );
}

function RecessedWindowBay({ position, w, h, recess = 0.1 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0, -recess * 0.45]} receiveShadow>
        <boxGeometry args={[w + 0.12, h + 0.12, recess]} />
        <meshStandardMaterial color="#2C3E50" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0, -recess * 0.2]} castShadow>
        <boxGeometry args={[w + 0.08, h + 0.08, 0.05]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <GlassPane w={w} h={h} inset={-recess * 0.05} />
    </group>
  );
}

function MullionedCurtainWall({ width, height, centerY, z, cols, rows, accent }) {
  const panelW = width * 0.9;
  const panelH = height * 0.95;
  const cellW = panelW / cols;
  const cellH = panelH / Math.min(rows, 12);

  return (
    <group position={[0, centerY, z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[panelW, panelH, 0.028]} />
        <meshPhysicalMaterial {...glassPhysicalProps({ color: '#A8D8EA', emissiveIntensity: 0.08 })} envMapIntensity={1.2} />
      </mesh>
      {Array.from({ length: cols + 1 }).map((_, c) => (
        <mesh key={`v-${c}`} position={[-panelW / 2 + c * cellW, 0, 0.018]} castShadow>
          <boxGeometry args={[0.045, panelH, 0.032]} />
          <meshStandardMaterial {...FRAME} />
        </mesh>
      ))}
      {Array.from({ length: Math.min(rows, 12) + 1 }).map((_, r) => (
        <mesh key={`h-${r}`} position={[0, -panelH / 2 + r * cellH, 0.018]} castShadow>
          <boxGeometry args={[panelW, 0.035, 0.032]} />
          <meshStandardMaterial color={r % 5 === 0 ? accent : '#2C3E50'} metalness={0.3} roughness={0.38} />
        </mesh>
      ))}
    </group>
  );
}

function SideWindows({ floors, width, depth, podiumH, face }) {
  const recess = 0.12;
  const sideWins = useMemo(() => {
    const list = [];
    const cols = Math.max(2, Math.min(3, Math.floor(depth / 2.5)));
    const winW = Math.min(1.1, (depth * 0.7) / cols - 0.2);
    const winH = Math.min(1.25, FLOOR_H * 0.65);
    for (let f = 0; f < Math.ceil(floors / 2); f += 1) {
      const y = podiumH + 0.9 + f * FLOOR_H + FLOOR_H / 2;
      for (let c = 0; c < cols; c += 1) {
        const along = -depth / 2 + (c + 0.55) * (depth / cols);
        const pos = face === 'left'
          ? [-width / 2 + recess * 0.3, y, along]
          : [width / 2 - recess * 0.3, y, along];
        list.push({ key: `${face}-${f}-${c}`, pos, w: winW, h: winH });
      }
    }
    return list;
  }, [floors, width, depth, podiumH, face]);

  return sideWins.map((w) => (
    <RecessedWindowBay key={w.key} position={w.pos} w={w.w} h={w.h} recess={recess} />
  ));
}

function DesignDoor({ position, doorStyle = 'wood' }) {
  const style = DOOR_STYLES.find((s) => s.id === doorStyle) || DOOR_STYLES[0];
  const isGlass = doorStyle === 'glass';
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[2.0, 2.7, 0.1]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <mesh position={[0, 0, 0.06]} castShadow>
        <boxGeometry args={[1.7, 2.5, 0.05]} />
        <meshStandardMaterial
          color={isGlass ? '#87CEEB' : style.color}
          transparent={isGlass}
          opacity={isGlass ? 0.75 : 1}
          roughness={0.45}
          metalness={isGlass ? 0.2 : 0.05}
        />
      </mesh>
    </group>
  );
}

export function CommercialPresentation({ floors, width, depth, materials, accent: accentProp, facade }) {
  const totalH = floors * FLOOR_H;
  const podiumH = Math.min(FLOOR_H * 1.1, 3.2);
  const towerH = totalH - podiumH;
  const towerY = podiumH + towerH / 2;
  const stone = materials.stoneColor || '#7F8C8D';
  const wall = materials.wallColor || '#ECEFF1';
  const accent = accentProp || materials.accentColor || '#E67E22';
  const siding = '#4A5568';
  const cols = facade?.windows?.length
    ? Math.max(3, Math.min(8, Math.ceil(facade.windows.length / Math.max(floors, 1))))
    : Math.max(3, Math.min(6, Math.floor(width / 1.6)));
  const rows = Math.max(floors, 4);

  return (
    <group>
      <mesh position={[0, podiumH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 1, podiumH, depth + 1]} />
        <meshStandardMaterial {...stoneMaterial(stone)} />
      </mesh>
      <mesh position={[0, towerY, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, towerH, depth]} />
        <meshStandardMaterial {...plasterMaterial(wall)} />
      </mesh>
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={`col-${i}`} position={[sx * (width / 2 - 0.08), towerY, sz * (depth / 2 - 0.08)]} castShadow receiveShadow>
          <boxGeometry args={[0.28, towerH, 0.28]} />
          <meshStandardMaterial {...stoneMaterial(stone)} />
        </mesh>
      ))}
      <MullionedCurtainWall width={width} height={towerH} centerY={towerY} z={depth / 2 + 0.02} cols={cols} rows={rows} accent={accent} />
      <MullionedCurtainWall width={width} height={towerH} centerY={towerY} z={-(depth / 2 + 0.02)} cols={cols} rows={rows} accent={accent} />
      {[-1, 1].map((s) => (
        <mesh key={`side-${s}`} position={[s * (width / 2 - 0.04), towerY, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.08, towerH * 0.96, depth * 0.88]} />
          <meshStandardMaterial color={siding} roughness={0.78} metalness={0.08} />
        </mesh>
      ))}
      <SideWindows floors={floors} width={width} depth={depth} podiumH={podiumH} face="left" />
      <SideWindows floors={floors} width={width} depth={depth} podiumH={podiumH} face="right" />
      <DesignDoor position={[facade?.door?.x || 0, facade?.door?.y || 1.2, depth / 2 + 0.06]} doorStyle={facade?.door?.style} />
      <mesh position={[0, totalH + 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.5, 0.18, depth + 0.5]} />
        <meshStandardMaterial color="#ECF0F1" roughness={0.45} metalness={0.1} />
      </mesh>
    </group>
  );
}

function LitWindow({ position, w = 1.2, h = 1.5 }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[w + 0.1, h + 0.1, 0.06]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <GlassPane w={w} h={h} inset={0.02} />
    </group>
  );
}

export function ResidentialPresentation({
  floors, width, depth, materials, facade, doorStyle, windowStyle,
}) {
  const totalH = floors * FLOOR_H;
  const wall = materials.wallColor || '#F5F5F5';
  const stone = materials.stoneColor || '#7F8C8D';
  const accent = materials.accentColor || '#8B7355';
  const siding = '#5D6D7E';
  const wood = '#8B7355';

  const frontWindows = facade?.windows?.length
    ? facade.windows
    : Array.from({ length: floors }).flatMap((_, f) =>
      [-width * 0.25, 0, width * 0.25].map((x) => ({ x, y: 1.35 + f * FLOOR_H, w: 1.3, h: 1.6, floor: f + 1 }))
    );

  const doorPos = facade?.door || { x: 0, y: 1.35 };
  const showBalcony = facade?.hasBalcony && floors >= 2;

  return (
    <group>
      <mesh position={[0, totalH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, totalH, depth]} />
        <meshStandardMaterial {...plasterMaterial(wall)} />
      </mesh>
      <mesh position={[-width * 0.28, totalH * 0.45, depth / 2 - 0.02]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.38, totalH * 0.85, 0.1]} />
        <meshStandardMaterial {...stoneMaterial(stone)} />
      </mesh>
      <mesh position={[width * 0.22, totalH * 0.55, depth / 2 - 0.02]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.32, totalH * 0.7, 0.1]} />
        <meshStandardMaterial color={siding} roughness={0.82} metalness={0.04} />
      </mesh>
      <mesh position={[width * 0.38, FLOOR_H + 0.8, depth / 2 - 0.01]} castShadow>
        <boxGeometry args={[0.35, 2.4, 0.08]} />
        <meshStandardMaterial color="#3D4F5C" roughness={0.7} />
      </mesh>
      {showBalcony && (
        <group position={[width * 0.12, FLOOR_H + 0.55, depth / 2 + 0.4]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width * 0.5, 0.12, 1.4]} />
            <meshStandardMaterial {...plasterMaterial(wall)} />
          </mesh>
          <mesh position={[0, 0.35, 0.65]}>
            <boxGeometry args={[width * 0.48, 0.06, 0.08]} />
            <meshStandardMaterial color={FRAME.color} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.06, 0.65]}>
            <boxGeometry args={[width * 0.46, 0.08, 0.12]} />
            <meshStandardMaterial color={wood} roughness={0.55} />
          </mesh>
        </group>
      )}
      {frontWindows.map((w, i) => (
        <LitWindow key={`win-${i}`} position={[w.x, w.y, depth / 2 + 0.03]} w={w.w || 1.2} h={w.h || 1.5} />
      ))}
      <DesignDoor position={[doorPos.x, doorPos.y, depth / 2 + 0.05]} doorStyle={facade?.door?.style || doorStyle} />
      <mesh position={[0, totalH + 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.35, 0.16, depth + 0.35]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.55} />
      </mesh>
      <mesh position={[doorPos.x, doorPos.y + 0.05, depth / 2 + 0.02]} castShadow>
        <boxGeometry args={[2.4, 2.9, 0.06]} />
        <meshStandardMaterial color={accent} roughness={0.5} />
      </mesh>
      {[[-width * 0.35, 1.8], [width * 0.35, 1.8]].map(([x, y], i) => (
        <mesh key={`sconce-${i}`} position={[x, y, depth / 2 + 0.04]}>
          <boxGeometry args={[0.08, 0.5, 0.06]} />
          <meshStandardMaterial color="#F5DEB3" emissive="#FFAB40" emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

export { LitWindow, FLOOR_H as PRESENTATION_FLOOR_H };
