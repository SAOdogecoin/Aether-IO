import React, { useRef, useEffect, useMemo } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Group, BufferGeometry, Mesh, SkinnedMesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { ENEMY_PATHS, ENEMY_ANIM_NAMES } from '../assetConfig';
import { EnemyData } from '../types';

// ─────────────────────────────────────────────────────────────
// Geometry extractor
// Returns the first BufferGeometry found inside a GLTF scene.
// Used to feed the InstancedMesh in EnemyManager with real model
// geometry instead of a plain box.
// ─────────────────────────────────────────────────────────────
export const useEnemyGeometry = (type: number): BufferGeometry | null => {
  const path = ENEMY_PATHS[type];
  const { scene } = useGLTF(path);
  return useMemo(() => {
    let geo: BufferGeometry | null = null;
    scene.traverse((child) => {
      if (!geo && (child as Mesh).isMesh) {
        geo = (child as Mesh).geometry.clone();
      }
    });
    return geo;
  }, [scene]);
};

// ─────────────────────────────────────────────────────────────
// Single animated enemy — rendered only for the N closest ones
// ─────────────────────────────────────────────────────────────
interface AnimatedEnemyProps {
  enemyData: EnemyData;
  playerPosition: { x: number; z: number };
}

const AnimatedEnemy: React.FC<AnimatedEnemyProps> = ({ enemyData }) => {
  const group = useRef<Group>(null);
  const path = ENEMY_PATHS[enemyData.type] ?? ENEMY_PATHS[0];
  const { scene, animations } = useGLTF(path);
  const { actions } = useAnimations(animations, group);
  const prevAnim = useRef('');
  const prevActive = useRef(false);

  useEffect(() => {
    if (!enemyData.active) return;
    const target = ENEMY_ANIM_NAMES.walk;
    if (target === prevAnim.current) return;
    prevAnim.current = target;
    Object.entries(actions).forEach(([n, a]) => { if (n !== target) a?.fadeOut(0.15); });
    actions[target]?.reset().fadeIn(0.15).play();
  }, [enemyData.active, actions]);

  useFrame(() => {
    if (!group.current) return;

    if (!enemyData.active) {
      group.current.visible = false;
      return;
    }
    group.current.visible = true;
    group.current.position.set(enemyData.position.x, 0, enemyData.position.z);
    group.current.scale.setScalar(enemyData.scale ?? 1);

    // Determine animation state
    let target = ENEMY_ANIM_NAMES.walk;
    if (enemyData.health <= 0) target = ENEMY_ANIM_NAMES.die;
    else if (enemyData.freezeTimer && enemyData.freezeTimer > 0) target = ENEMY_ANIM_NAMES.stun;

    if (target !== prevAnim.current) {
      prevAnim.current = target;
      Object.entries(actions).forEach(([n, a]) => { if (n !== target) a?.fadeOut(0.15); });
      actions[target]?.reset().fadeIn(0.15).play();
    }
  });

  return (
    <group ref={group}>
      <primitive object={scene.clone()} />
    </group>
  );
};

// ─────────────────────────────────────────────────────────────
// NearbyEnemies — renders full animated models for the closest
// MAX_VISIBLE enemies.  The rest are still handled by the
// InstancedMesh in EnemyManager (shape only, no skinning).
// ─────────────────────────────────────────────────────────────
const MAX_VISIBLE = 8;

interface NearbyEnemiesProps {
  enemiesDataRef: React.MutableRefObject<EnemyData[]>;
  playerPositionRef: React.MutableRefObject<{ x: number; z: number }>;
}

export const NearbyEnemies: React.FC<NearbyEnemiesProps> = ({
  enemiesDataRef,
  playerPositionRef,
}) => {
  // Stable slot array — we always render MAX_VISIBLE slots and swap which
  // enemy each slot is pointing at, to avoid React key churn.
  const slotsRef = useRef<EnemyData[]>(
    new Array(MAX_VISIBLE).fill(null).map(() => ({
      id: -1, active: false, type: 0,
      health: 0, maxHealth: 0,
      position: { x: 0, y: 0, z: 0 } as any,
      speed: 0, radius: 0, scale: 1,
      state: 'CHASE', stateTimer: 0, activeTimer: 0,
    } as EnemyData))
  );

  useFrame(() => {
    const pp = playerPositionRef.current;
    const active = enemiesDataRef.current.filter(e => e.active);

    // Sort by distance, pick closest MAX_VISIBLE
    active.sort((a, b) => {
      const da = (a.position.x - pp.x) ** 2 + (a.position.z - pp.z) ** 2;
      const db = (b.position.x - pp.x) ** 2 + (b.position.z - pp.z) ** 2;
      return da - db;
    });

    const nearest = active.slice(0, MAX_VISIBLE);

    // Mutate slots in-place so React doesn't re-mount children
    for (let i = 0; i < MAX_VISIBLE; i++) {
      const src = nearest[i];
      const slot = slotsRef.current[i];
      if (src) {
        Object.assign(slot, src);
      } else {
        slot.active = false;
      }
    }
  });

  return (
    <>
      {slotsRef.current.map((slot, i) => (
        <AnimatedEnemy key={i} enemyData={slot} playerPosition={playerPositionRef.current} />
      ))}
    </>
  );
};

// Preload all enemy GLBs
Object.values(ENEMY_PATHS).forEach((p) => {
  if (!p.toLowerCase().endsWith('.fbx')) useGLTF.preload(p);
});
