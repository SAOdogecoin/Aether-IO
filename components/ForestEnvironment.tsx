import React, { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { MAP_PATHS } from '../assetConfig';

// Preload so the scene is ready before the player enters the game
useGLTF.preload(MAP_PATHS.forest);

export const ForestEnvironment: React.FC = () => {
  const { scene } = useGLTF(MAP_PATHS.forest);

  useEffect(() => {
    // Enable shadows on every mesh in the loaded scene
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  // The forest GLB is expected to be centered at the origin and sized to cover
  // the arena.  Adjust position / scale here once you see it in-game.
  return <primitive object={scene} position={[0, 0, 0]} />;
};
