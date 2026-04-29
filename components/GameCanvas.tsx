import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { World } from './World';
import { COLORS } from '../constants';

export const GameCanvas: React.FC = () => {
  return (
    <Canvas
      dpr={[1, 2]}
      shadows
      camera={{ position: [0, 40, 24], fov: 40 }}
      gl={{ antialias: false }}
    >
      <color attach="background" args={[COLORS.background]} />
      <fog attach="fog" args={[COLORS.background, 30, 90]} />
      
      <Suspense fallback={null}>
        <World />
      </Suspense>

      <EffectComposer enableNormalPass={false}>
        {/* Adjusted Bloom for daylight visibility */}
        <Bloom 
          luminanceThreshold={0.9} 
          luminanceSmoothing={0.5} 
          intensity={0.4} 
        />
        <Vignette eskil={false} offset={0.1} darkness={0.4} />
      </EffectComposer>
    </Canvas>
  );
};