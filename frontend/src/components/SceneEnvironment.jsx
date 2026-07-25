/** Trees, grass, perimeter — compact site for presentation output only */

function RealisticTree({ position, scale = 1, variant = 0 }) {
  const greens = ['#1B5E20', '#2E7D32', '#388E3C', '#33691E'];
  const green = greens[variant % greens.length];
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.07 * scale, 0.13 * scale, 1.1 * scale, 7]} />
        <meshStandardMaterial color="#4E342E" roughness={0.92} />
      </mesh>
      {[0, 0.32, 0.58].map((lift, i) => (
        <mesh key={i} position={[0, (1.05 + lift) * scale, 0]} castShadow receiveShadow>
          <coneGeometry args={[(0.52 - i * 0.1) * scale, (0.65 - i * 0.05) * scale, 10]} />
          <meshStandardMaterial color={i === 0 ? green : '#43A047'} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Bush({ position, color = '#2E7D32', scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.32, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.88} />
      </mesh>
      <mesh position={[0.15, 0.08, 0.1]} castShadow>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#388E3C" roughness={0.9} />
      </mesh>
    </group>
  );
}

function FlowerBed({ position, length = 3 }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[length, 0.45]} />
        <meshStandardMaterial color="#4E342E" roughness={0.95} />
      </mesh>
      {Array.from({ length: Math.floor(length * 2.5) }).map((_, i) => (
        <mesh key={i} position={[-length / 2 + 0.25 + i * 0.38, 0.12, (i % 2) * 0.08]}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#E91E63' : '#FF80AB'} />
        </mesh>
      ))}
    </group>
  );
}

function PerimeterWall({ width, depth, stoneColor = '#7F8C8D', accentColor = '#5D4037' }) {
  const frontZ = depth / 2 + 2.2;
  const wallW = width + 4;
  return (
    <group>
      <mesh position={[0, 0.45, frontZ]} castShadow receiveShadow>
        <boxGeometry args={[wallW, 0.9, 0.18]} />
        <meshStandardMaterial color="#5D6D7E" roughness={0.75} />
      </mesh>
      <mesh position={[-wallW * 0.22, 0.45, frontZ + 0.02]} castShadow>
        <boxGeometry args={[wallW * 0.26, 0.9, 0.06]} />
        <meshStandardMaterial color={stoneColor} roughness={0.95} />
      </mesh>
      <mesh position={[wallW * 0.22, 0.45, frontZ + 0.02]} castShadow>
        <boxGeometry args={[wallW * 0.26, 0.9, 0.06]} />
        <meshStandardMaterial color={stoneColor} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.52, frontZ + 0.05]} castShadow>
        <boxGeometry args={[1.8, 0.75, 0.05]} />
        <meshStandardMaterial color={accentColor} roughness={0.65} />
      </mesh>
      <FlowerBed position={[-wallW * 0.3, 0, frontZ + 0.35]} length={wallW * 0.22} />
      <FlowerBed position={[wallW * 0.3, 0, frontZ + 0.35]} length={wallW * 0.22} />
    </group>
  );
}

/** Compact landscaped plot — sized to building footprint, not oversized */
export default function SceneEnvironment({ width = 8, depth = 6, stoneColor, accentColor, floors = 10 }) {
  const plotW = width + 5;
  const plotD = depth + 5;
  const lawnW = width + 10;
  const lawnD = depth + 8;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[lawnW, lawnD]} />
        <meshStandardMaterial color="#4CAF70" roughness={0.94} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[plotW, plotD]} />
        <meshStandardMaterial color="#66BB6A" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, depth / 2 + 1.8]} receiveShadow>
        <planeGeometry args={[2.8, 3.5]} />
        <meshStandardMaterial color="#B0BEC5" roughness={0.82} />
      </mesh>

      <PerimeterWall width={width} depth={depth} stoneColor={stoneColor} accentColor={accentColor} />

      <RealisticTree position={[-width / 2 - 1.8, 0, -depth / 2 - 0.8]} scale={0.85} variant={0} />
      <RealisticTree position={[width / 2 + 1.6, 0, -depth / 2 - 0.6]} scale={0.75} variant={1} />
      <RealisticTree position={[-width / 2 - 1.4, 0, depth / 2 + 0.9]} scale={0.7} variant={2} />
      <RealisticTree position={[width / 2 + 1.5, 0, depth / 2 + 0.7]} scale={0.8} variant={3} />

      <Bush position={[-width / 2 - 0.5, 0.15, depth / 2 + 0.3]} scale={0.85} />
      <Bush position={[width / 2 + 0.45, 0.12, depth / 2 + 0.5]} color="#1B5E20" scale={0.75} />
    </group>
  );
}

export { RealisticTree as Tree, Bush, FlowerBed, PerimeterWall };
