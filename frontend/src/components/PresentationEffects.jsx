import { EffectComposer, Bloom } from '@react-three/postprocessing';

/** Bloom only — SSAO removed (requires NormalPass, caused console warnings) */
export default function PresentationEffects({ enabled = true }) {
  if (!enabled) return null;
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        luminanceThreshold={0.82}
        luminanceSmoothing={0.35}
        intensity={0.28}
        mipmapBlur
      />
    </EffectComposer>
  );
}
