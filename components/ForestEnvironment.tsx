import React, { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { BufferGeometry, InstancedMesh, Material, Mesh, Object3D } from 'three';
import { ENV_PATHS } from '../assetConfig';
import { useGameStore } from '../store';
import { ARENA_SIZE } from '../constants';

// Preload all environment assets
Object.values(ENV_PATHS).forEach(p => useGLTF.preload(p));

function extractGeo(scene: any): BufferGeometry | null {
  let geo: BufferGeometry | null = null;
  scene.traverse((c: any) => { if (!geo && c.isMesh) geo = (c as Mesh).geometry; });
  return geo;
}

function extractMat(scene: any): Material | null {
  let mat: Material | null = null;
  scene.traverse((c: any) => { if (!mat && c.isMesh) mat = (c as Mesh).material as Material; });
  return mat;
}

// Seeded LCG so positions are stable across renders
function makeRand(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0xffffffff; };
}

interface Transform { x: number; z: number; scale: number; }

// Renders one GLTF geometry as an InstancedMesh
function GltfBatch({
  geo, mat, transforms, castShadow = false, receiveShadow = false,
}: {
  geo: BufferGeometry; mat: Material;
  transforms: Transform[];
  castShadow?: boolean; receiveShadow?: boolean;
}) {
  const ref   = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    transforms.forEach(({ x, z, scale }, i) => {
      dummy.position.set(x, 0, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [transforms, dummy]);

  if (!transforms.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, transforms.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  );
}

// Splits a flat array into N buckets by index % N
function splitByVariant<T>(arr: T[], n: number): T[][] {
  const out: T[][] = Array.from({ length: n }, () => []);
  arr.forEach((item, i) => out[i % n].push(item));
  return out;
}

export const ForestEnvironment: React.FC = () => {
  const obstacles = useGameStore(state => state.obstacles);

  // ── Fixed GLTF hook calls (must not change count) ────────────
  const { scene: sTree1 }    = useGLTF(ENV_PATHS.tree1);
  const { scene: sTree2 }    = useGLTF(ENV_PATHS.tree2);
  const { scene: sTree3 }    = useGLTF(ENV_PATHS.tree3);
  const { scene: sTreeBare1 }= useGLTF(ENV_PATHS.treeBare1);
  const { scene: sTreeBare2 }= useGLTF(ENV_PATHS.treeBare2);
  const { scene: sRock1 }    = useGLTF(ENV_PATHS.rock1);
  const { scene: sRock2 }    = useGLTF(ENV_PATHS.rock2);
  const { scene: sBush1 }    = useGLTF(ENV_PATHS.bush1);
  const { scene: sBush2 }    = useGLTF(ENV_PATHS.bush2);
  const { scene: sBush3 }    = useGLTF(ENV_PATHS.bush3);
  const { scene: sGrass1 }   = useGLTF(ENV_PATHS.grass1);
  const { scene: sGrass2 }   = useGLTF(ENV_PATHS.grass2);

  // Geometry / material extraction (memoized per scene)
  const gTree1     = useMemo(() => extractGeo(sTree1),    [sTree1]);
  const gTree2     = useMemo(() => extractGeo(sTree2),    [sTree2]);
  const gTree3     = useMemo(() => extractGeo(sTree3),    [sTree3]);
  const gTreeBare1 = useMemo(() => extractGeo(sTreeBare1),[sTreeBare1]);
  const gTreeBare2 = useMemo(() => extractGeo(sTreeBare2),[sTreeBare2]);
  const gRock1     = useMemo(() => extractGeo(sRock1),    [sRock1]);
  const gRock2     = useMemo(() => extractGeo(sRock2),    [sRock2]);
  const gBush1     = useMemo(() => extractGeo(sBush1),    [sBush1]);
  const gBush2     = useMemo(() => extractGeo(sBush2),    [sBush2]);
  const gBush3     = useMemo(() => extractGeo(sBush3),    [sBush3]);
  const gGrass1    = useMemo(() => extractGeo(sGrass1),   [sGrass1]);
  const gGrass2    = useMemo(() => extractGeo(sGrass2),   [sGrass2]);

  const mTree1     = useMemo(() => extractMat(sTree1),    [sTree1]);
  const mTree2     = useMemo(() => extractMat(sTree2),    [sTree2]);
  const mTree3     = useMemo(() => extractMat(sTree3),    [sTree3]);
  const mTreeBare1 = useMemo(() => extractMat(sTreeBare1),[sTreeBare1]);
  const mTreeBare2 = useMemo(() => extractMat(sTreeBare2),[sTreeBare2]);
  const mRock1     = useMemo(() => extractMat(sRock1),    [sRock1]);
  const mRock2     = useMemo(() => extractMat(sRock2),    [sRock2]);
  const mBush1     = useMemo(() => extractMat(sBush1),    [sBush1]);
  const mBush2     = useMemo(() => extractMat(sBush2),    [sBush2]);
  const mBush3     = useMemo(() => extractMat(sBush3),    [sBush3]);
  const mGrass1    = useMemo(() => extractMat(sGrass1),   [sGrass1]);
  const mGrass2    = useMemo(() => extractMat(sGrass2),   [sGrass2]);

  // ── Obstacle-placed trees & rocks ────────────────────────────
  const treesObs = useMemo(() => obstacles.filter(o => o.type === 'TREE'), [obstacles]);
  const rocksObs = useMemo(() => obstacles.filter(o => o.type === 'ROCK'), [obstacles]);

  // Split obstacle trees across 3 variants, rocks across 2
  const [treeV1, treeV2, treeV3] = useMemo(
    () => splitByVariant(treesObs.map(t => ({ x: t.position.x, z: t.position.z, scale: t.scale ?? 1 })), 3),
    [treesObs],
  );
  const [rockV1, rockV2] = useMemo(
    () => splitByVariant(rocksObs.map(r => ({ x: r.position.x, z: r.position.z, scale: (r.scale ?? 1) * 0.8 })), 2),
    [rocksObs],
  );

  // ── Boundary ring (replaces the 300 procedural cones) ────────
  const [boundV1, boundV2, boundV3, boundV4, boundV5] = useMemo(() => {
    const rand = makeRand(42);
    const count = 240;
    const R = ARENA_SIZE / 2;
    const raw: Transform[] = Array.from({ length: count }, (_, i) => {
      const angle  = (i / count) * Math.PI * 2;
      const deg    = (angle * 180 / Math.PI + 360) % 360;
      let r        = R * 0.87;
      if (Math.abs(deg -  45) < 30) r += 22;
      if (Math.abs(deg - 160) < 30) r += 22;
      if (Math.abs(deg - 280) < 30) r += 22;
      r += (rand() - 0.5) * 10;
      return { x: Math.cos(angle) * r, z: Math.sin(angle) * r, scale: 1.3 + rand() * 1.8 };
    });
    return splitByVariant(raw, 5);
  }, []);

  // ── Scattered bushes ─────────────────────────────────────────
  const [bushV1, bushV2, bushV3] = useMemo(() => {
    const rand = makeRand(99);
    const half = ARENA_SIZE * 0.45;
    const raw  = Array.from({ length: 72 }, () => ({
      x: (rand() - 0.5) * half * 2,
      z: (rand() - 0.5) * half * 2,
      scale: 0.6 + rand() * 0.9,
    }));
    return splitByVariant(raw, 3);
  }, []);

  // ── Scattered grass ───────────────────────────────────────────
  const [grassV1, grassV2] = useMemo(() => {
    const rand = makeRand(77);
    const half = ARENA_SIZE * 0.48;
    const raw  = Array.from({ length: 100 }, () => ({
      x: (rand() - 0.5) * half * 2,
      z: (rand() - 0.5) * half * 2,
      scale: 0.5 + rand() * 0.7,
    }));
    return splitByVariant(raw, 2);
  }, []);

  // ── Ground patches ────────────────────────────────────────────
  const groundPatches = useMemo(() => {
    const rand = makeRand(55);
    return Array.from({ length: 24 }, (_, i) => ({
      key: i,
      size:  10 + rand() * 30,
      x: (rand() - 0.5) * ARENA_SIZE,
      z: (rand() - 0.5) * ARENA_SIZE,
    }));
  }, []);

  // ── Render ────────────────────────────────────────────────────
  return (
    <group>
      {/* Decorative ground patches */}
      {groundPatches.map(p => (
        <mesh key={p.key} rotation={[-Math.PI / 2, 0, 0]} position={[p.x, -0.005, p.z]}>
          <circleGeometry args={[p.size, 16]} />
          <meshStandardMaterial color="#3d4e22" opacity={0.5} transparent depthWrite={false} />
        </mesh>
      ))}

      {/* Dark void ring at map boundary */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 0]}>
        <ringGeometry args={[ARENA_SIZE / 2 + 20, ARENA_SIZE / 2 + 100, 64]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Interior trees */}
      {gTree1 && mTree1 && <GltfBatch geo={gTree1} mat={mTree1} transforms={treeV1} castShadow receiveShadow />}
      {gTree2 && mTree2 && <GltfBatch geo={gTree2} mat={mTree2} transforms={treeV2} castShadow receiveShadow />}
      {gTree3 && mTree3 && <GltfBatch geo={gTree3} mat={mTree3} transforms={treeV3} castShadow receiveShadow />}

      {/* Boundary trees — 5 variants across 240 positions */}
      {gTree1    && mTree1    && <GltfBatch geo={gTree1}    mat={mTree1}    transforms={boundV1} castShadow />}
      {gTree2    && mTree2    && <GltfBatch geo={gTree2}    mat={mTree2}    transforms={boundV2} castShadow />}
      {gTree3    && mTree3    && <GltfBatch geo={gTree3}    mat={mTree3}    transforms={boundV3} castShadow />}
      {gTreeBare1 && mTreeBare1 && <GltfBatch geo={gTreeBare1} mat={mTreeBare1} transforms={boundV4} castShadow />}
      {gTreeBare2 && mTreeBare2 && <GltfBatch geo={gTreeBare2} mat={mTreeBare2} transforms={boundV5} castShadow />}

      {/* Rocks */}
      {gRock1 && mRock1 && <GltfBatch geo={gRock1} mat={mRock1} transforms={rockV1} castShadow receiveShadow />}
      {gRock2 && mRock2 && <GltfBatch geo={gRock2} mat={mRock2} transforms={rockV2} castShadow receiveShadow />}

      {/* Scattered bushes */}
      {gBush1 && mBush1 && <GltfBatch geo={gBush1} mat={mBush1} transforms={bushV1} castShadow />}
      {gBush2 && mBush2 && <GltfBatch geo={gBush2} mat={mBush2} transforms={bushV2} castShadow />}
      {gBush3 && mBush3 && <GltfBatch geo={gBush3} mat={mBush3} transforms={bushV3} castShadow />}

      {/* Scattered grass */}
      {gGrass1 && mGrass1 && <GltfBatch geo={gGrass1} mat={mGrass1} transforms={grassV1} />}
      {gGrass2 && mGrass2 && <GltfBatch geo={gGrass2} mat={mGrass2} transforms={grassV2} />}
    </group>
  );
};
