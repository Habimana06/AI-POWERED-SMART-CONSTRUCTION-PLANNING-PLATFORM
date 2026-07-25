import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Environment, AccumulativeShadows, RandomizedLight, SoftShadows, Sky } from '@react-three/drei';
import * as THREE from 'three';
import PresentationEffects from './PresentationEffects';
import { Tree } from './SceneEnvironment';

/** ACES tone mapping + soft PCF shadows */
export function PresentationRendererSetup() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.08;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);
  return null;
}

/** Presentation-only lighting — Floor Plans output, NOT editor */
export function PresentationLighting({
  isInterior = false,
  buildingHeight = 20,
  buildingSpan = 16,
}) {
  const shadowSize = Math.max(buildingSpan * 1.8, buildingHeight * 0.9, 22);

  return (
    <>
      <PresentationRendererSetup />
      <Sky
        distance={450000}
        sunPosition={[100, 42, 80]}
        turbidity={1.2}
        rayleigh={0.8}
        mieCoefficient={0.004}
        mieDirectionalG={0.78}
      />
      <SoftShadows size={8} samples={10} focus={0.45} />
      <ambientLight intensity={0.32} />
      <hemisphereLight intensity={0.28} groundColor="#3d7a4a" color="#FFF8E7" />
      <directionalLight
        position={[shadowSize * 0.45, buildingHeight + shadowSize * 0.35, shadowSize * 0.3]}
        intensity={1.25}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={shadowSize * 2.5}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-shadowSize * 0.25, buildingHeight * 0.5, -shadowSize * 0.2]} intensity={0.35} color="#D6EAF8" />
      {!isInterior && (
        <directionalLight position={[0, buildingHeight * 0.25, -shadowSize * 0.45]} intensity={0.15} color="#FFE4B5" />
      )}
      {isInterior && (
        <pointLight position={[0, buildingHeight * 0.35, 0]} intensity={0.55} color="#FFF5E6" distance={buildingSpan * 2.5} />
      )}
      <Environment preset="city" background={false} />
      {!isInterior && (
        <AccumulativeShadows
          temporal
          frames={60}
          color="#2d5a35"
          colorBlend={0.5}
          alphaTest={0.85}
          opacity={0.75}
          scale={Math.max(buildingSpan * 1.4, 18)}
          position={[0, 0.02, 0]}
        >
          <RandomizedLight
            amount={4}
            radius={buildingSpan * 0.6}
            intensity={0.95}
            ambient={0.3}
            position={[shadowSize * 0.35, buildingHeight + 6, shadowSize * 0.2]}
            bias={0.001}
          />
        </AccumulativeShadows>
      )}
      <PresentationEffects enabled />
    </>
  );
}

/** Compact grass + trees for interior dollhouse presentation */
export function PresentationDollhouseSite({ width = 8, depth = 6 }) {
  const pad = 3.5;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[width + pad * 2, depth + pad * 2]} />
        <meshStandardMaterial color="#58D68D" roughness={0.92} />
      </mesh>
      <Tree position={[-width / 2 - 1.2, 0, -depth / 2 - 0.8]} scale={0.55} variant={0} />
      <Tree position={[width / 2 + 1, 0, depth / 2 + 0.6]} scale={0.5} variant={2} />
    </group>
  );
}
