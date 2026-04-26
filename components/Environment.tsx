
import React, { useMemo, Suspense } from 'react';
import { Instance, Instances } from '@react-three/drei';
import { ARENA_SIZE, COLORS } from '../constants';
import { useGameStore } from '../store';
import { ASSET_FLAGS } from '../assetConfig';
import { ForestEnvironment } from './ForestEnvironment';

export const Environment: React.FC = React.memo(() => {
  const obstacles = useGameStore(state => state.obstacles);

  // Memoize obstacle filtering and processing
  const { trees, rocks, house, fences } = useMemo(() => {
      const trees = obstacles.filter(o => o.type === 'TREE');
      const rocks = obstacles.filter(o => o.type === 'ROCK');
      const house = obstacles.find(o => o.type === 'HOUSE');
      const fences = obstacles.filter(o => o.type === 'FENCE');
      return { trees, rocks, house, fences };
  }, [obstacles]);

  // Memoize boundary trees to prevent regeneration
  const boundaryTrees = useMemo(() => {
      const coreRadius = ARENA_SIZE / 2;
      const arr = [];
      const count = 300; // Increased count for larger map
      
      // Irregular Boundary Generation
      // Instead of one circle, we generate points on the perimeter of the combined shape
      // Simplified: Raycast out from center 360 degrees, find distance to "edge" defined in store generation logic
      
      for(let i=0; i<count; i++) {
          const angle = (i / count) * Math.PI * 2;
          // Matching the shape logic in generateObstacles roughly
          // Core + 3 lobes
          let r = coreRadius * 0.8;
          
          // Add lobe variance
          // Lobe 1: 45 deg, Lobe 2: 160 deg, Lobe 3: 280 deg
          const angDeg = (angle * 180 / Math.PI + 360) % 360;
          
          if (Math.abs(angDeg - 45) < 30) r += 30;
          if (Math.abs(angDeg - 160) < 30) r += 30;
          if (Math.abs(angDeg - 280) < 30) r += 30;
          
          // Add noise
          r += (Math.random() - 0.5) * 5;

          arr.push({
              position: [Math.cos(angle) * r, 0, Math.sin(angle) * r] as [number, number, number],
              scale: 1.5 + Math.random()
          });
      }
      return arr;
  }, []);

  // Memoize ground decals
  const groundPatches = useMemo(() => {
      return [...Array(20)].map((_, i) => ({
          key: `patch-${i}`,
          size: 10 + Math.random() * 30,
          position: [(Math.random()-0.5)*ARENA_SIZE, -0.05, (Math.random()-0.5)*ARENA_SIZE] as [number, number, number]
      }));
  }, []);

  // Generate stable random rotations for rocks
  const rockRotations = useMemo(() => {
      return rocks.map(() => [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number]);
  }, [rocks]);

  if (ASSET_FLAGS.useForestMap) {
    return (
      <Suspense fallback={null}>
        <ForestEnvironment />
      </Suspense>
    );
  }

  return (
    <group>
      {/* Ground Decals / Patches */}
      {groundPatches.map((patch) => (
        <mesh key={patch.key} rotation={[-Math.PI/2, 0, 0]} position={patch.position}>
            <circleGeometry args={[patch.size, 16]} />
            <meshStandardMaterial color={COLORS.groundDark} opacity={0.5} transparent depthWrite={false} />
        </mesh>
      ))}

      {/* Dark Void Ring to indicate map edge - Scaled up */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.09, 0]}>
          <ringGeometry args={[ARENA_SIZE/2 + 20, ARENA_SIZE/2 + 100, 64]} />
          <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Boundary Trees */}
      <Instances range={boundaryTrees.length}>
        <cylinderGeometry args={[0.3, 0.6, 6, 8]} />
        <meshStandardMaterial color="#3f2e18" />
        {boundaryTrees.map((t, i) => (
            <group key={`bound-${i}`} position={t.position} scale={[t.scale, t.scale, t.scale]}>
                <Instance />
                <mesh position={[0, 3, 0]}>
                    <coneGeometry args={[2, 5, 8]} />
                    <meshStandardMaterial color="#0f3d0f" />
                </mesh>
            </group>
        ))}
      </Instances>

      {/* Trees */}
      <Instances range={trees.length}>
        <cylinderGeometry args={[0.2, 0.5, 4, 8]} />
        <meshStandardMaterial color={COLORS.wood} />
        {trees.map((t) => (
            <group key={t.id} position={t.position} scale={[t.scale || 1, t.scale || 1, t.scale || 1]}>
                <Instance />
                {/* Foliage */}
                <mesh position={[0, 2, 0]}>
                    <coneGeometry args={[1.5, 4, 8]} />
                    <meshStandardMaterial color={COLORS.tree} />
                </mesh>
            </group>
        ))}
      </Instances>

      {/* Rocks */}
      <Instances range={rocks.length}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={COLORS.rock} />
        {rocks.map((r, i) => (
            <Instance key={r.id} position={r.position} scale={[r.scale || 1, r.scale || 1, r.scale || 1]} rotation={rockRotations[i]} />
        ))}
      </Instances>

      {/* Water / Lake */}
      <mesh position={[40, 0.1, -40]} rotation={[-Math.PI/2, 0, 0]}>
         <circleGeometry args={[25, 32]} />
         <meshStandardMaterial color={COLORS.water} roughness={0.1} metalness={0.1} transparent opacity={0.6} />
      </mesh>
      
      {/* House */}
      {house && (
          <group position={house.position} rotation={[0, 0.5, 0]}>
             <mesh position={[0, 2, 0]} castShadow>
                 <boxGeometry args={[6, 4, 6]} />
                 <meshStandardMaterial color={COLORS.wood} />
             </mesh>
             <mesh position={[0, 5, 0]}>
                 <coneGeometry args={[4.5, 3, 4]} />
                 <meshStandardMaterial color="#6b2f0a" />
             </mesh>
             <mesh position={[0, 1.5, 3.1]}>
                 <boxGeometry args={[1.5, 3, 0.2]} />
                 <meshStandardMaterial color="#475569" />
             </mesh>
          </group>
      )}

      {/* Fences */}
      <Instances range={fences.length}>
        <boxGeometry args={[2, 1, 0.2]} />
        <meshStandardMaterial color={COLORS.wood} />
        {fences.map((f) => (
            <Instance key={f.id} position={[f.position.x, 0.5, f.position.z]} />
        ))}
      </Instances>
    </group>
  );
});
