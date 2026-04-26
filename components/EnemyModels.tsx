import React, { useRef, useEffect, useMemo } from 'react';
import { useGLTF, useAnimations, useTexture } from '@react-three/drei';
import { Group, BufferGeometry, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { ENEMY_PATHS, ENEMY_TEXTURE, ENEMY_ANIM_NAMES } from '../assetConfig';
import { EnemyData } from '../types';

// Preload all four skeleton variants up front
Object.values(ENEMY_PATHS)
  .filter((v, i, a) => a.indexOf(v) === i)   // deduplicate
  .forEach((p) => useGLTF.preload(p));

// ── Geometry extractor ────────────────────────────────────────
// Returns the first BufferGeometry found in an enemy GLB.
// Used to feed the existing InstancedMesh with real model shape.
export const useEnemyGeometry = (type: number): BufferGeometry | null => {
  const path = ENEMY_PATHS[type] ?? ENEMY_PATHS[0];
  const { scene } = useGLTF(path);
  return useMemo(() => {
    let geo: BufferGeometry | null = null;
    scene.traverse((child) => {
      if (!geo && (child as Mesh).isMesh) geo = (child as Mesh).geometry.clone();
    });
    return geo;
  }, [scene]);
};

// ── Single animated skeleton ──────────────────────────────────
interface AnimatedEnemyProps {
  slot: EnemyData;
}

// One component per skeleton variant keeps hook counts stable.
const SkeletonMinion:   React.FC<AnimatedEnemyProps> = (p) => <SkeletonMesh {...p} type={0} />;
const SkeletonWarrior:  React.FC<AnimatedEnemyProps> = (p) => <SkeletonMesh {...p} type={1} />;
const SkeletonRogue:    React.FC<AnimatedEnemyProps> = (p) => <SkeletonMesh {...p} type={3} />;
const SkeletonMageMesh: React.FC<AnimatedEnemyProps> = (p) => <SkeletonMesh {...p} type={5} />;

function SkeletonMesh({ slot, type }: AnimatedEnemyProps & { type: number }) {
  const group = useRef<Group>(null);
  const path = ENEMY_PATHS[type];
  const { scene } = useGLTF(path);
  const texture = useTexture(ENEMY_TEXTURE);
  const { animations } = useGLTF(path);
  const { actions } = useAnimations(animations, group);
  const prevAnim = useRef('');

  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.material.map = texture;
        child.material.needsUpdate = true;
        child.castShadow = true;
      }
    });
  }, [scene, texture]);

  useFrame(() => {
    if (!group.current) return;

    if (!slot.active) {
      group.current.visible = false;
      return;
    }

    group.current.visible = true;
    group.current.position.set(slot.position.x, 0, slot.position.z);
    group.current.scale.setScalar(slot.scale ?? 1);

    let target = ENEMY_ANIM_NAMES.walk;
    if (slot.health <= 0) target = ENEMY_ANIM_NAMES.die;
    else if (slot.freezeTimer && slot.freezeTimer > 0) target = ENEMY_ANIM_NAMES.stun;

    // Fall back to first available clip name if the expected name doesn't exist
    const key = actions[target] ? target : Object.keys(actions)[0] ?? '';
    if (!key || key === prevAnim.current) return;
    prevAnim.current = key;

    Object.entries(actions).forEach(([n, a]) => { if (n !== key) a?.fadeOut(0.15); });
    actions[key]?.reset().fadeIn(0.15).play();
  });

  return (
    <group ref={group} visible={false}>
      <primitive object={scene.clone()} />
    </group>
  );
}

// ── Skeleton router — picks correct variant from enemy type ───
function AnimatedEnemy({ slot }: AnimatedEnemyProps) {
  const t = slot.type;
  if (t === 0)            return <SkeletonMinion  slot={slot} />;
  if (t === 1 || t === 2) return <SkeletonWarrior slot={slot} />;
  if (t === 3 || t === 4) return <SkeletonRogue   slot={slot} />;
  return                         <SkeletonMageMesh slot={slot} />;
}

// ── NearbyEnemies — full animated models for the 8 closest ───
const MAX_VISIBLE = 8;

interface NearbyEnemiesProps {
  enemiesDataRef: React.MutableRefObject<EnemyData[]>;
  playerPositionRef: React.MutableRefObject<{ x: number; z: number }>;
}

export const NearbyEnemies: React.FC<NearbyEnemiesProps> = ({
  enemiesDataRef,
  playerPositionRef,
}) => {
  // Stable slot objects — mutated in-place so React doesn't remount children
  const slotsRef = useRef<EnemyData[]>(
    Array.from({ length: MAX_VISIBLE }, (_, id) => ({
      id, active: false, type: 0,
      health: 0, maxHealth: 0,
      position: { x: 0, y: 0, z: 0 } as any,
      speed: 0, radius: 0, scale: 1,
      state: 'CHASE', stateTimer: 0, activeTimer: 0,
    } as EnemyData))
  );

  useFrame(() => {
    const pp = playerPositionRef.current;
    const active = enemiesDataRef.current.filter(e => e.active);

    active.sort((a, b) => {
      const da = (a.position.x - pp.x) ** 2 + (a.position.z - pp.z) ** 2;
      const db = (b.position.x - pp.x) ** 2 + (b.position.z - pp.z) ** 2;
      return da - db;
    });

    for (let i = 0; i < MAX_VISIBLE; i++) {
      const src = active[i];
      const slot = slotsRef.current[i];
      if (src) Object.assign(slot, src);
      else slot.active = false;
    }
  });

  return (
    <>
      {slotsRef.current.map((slot, i) => (
        <AnimatedEnemy key={i} slot={slot} />
      ))}
    </>
  );
};
