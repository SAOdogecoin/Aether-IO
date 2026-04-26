import React, { useRef, useEffect, useMemo } from 'react';
import { useGLTF, useAnimations, useTexture } from '@react-three/drei';
import { Group, BufferGeometry, Mesh } from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useFrame } from '@react-three/fiber';
import { ENEMY_PATHS, ENEMY_TEXTURE, ANIM_RIGS } from '../assetConfig';
import { EnemyData } from '../types';

// Preload unique skeleton variants + the movement rig
[...new Set(Object.values(ENEMY_PATHS))].forEach(p => useGLTF.preload(p));
useGLTF.preload(ANIM_RIGS.movementBasic);

// ── Smart clip resolver ───────────────────────────────────────
// Tries exact name → case-insensitive substring → first clip.
// You never need to configure clip names manually.
function resolveClip(actions: Record<string, any>, ...hints: string[]): string {
  const keys = Object.keys(actions);
  for (const h of hints) { if (actions[h]) return h; }
  for (const h of hints) {
    const hit = keys.find(k => k.toLowerCase().includes(h.toLowerCase()));
    if (hit && actions[hit]) return hit;
  }
  return keys[0] ?? '';
}

// ── Geometry extractor (used by InstancedMesh in EnemyManager) ─
export const useEnemyGeometry = (type: number): BufferGeometry | null => {
  const { scene } = useGLTF(ENEMY_PATHS[type] ?? ENEMY_PATHS[0]);
  return useMemo(() => {
    let geo: BufferGeometry | null = null;
    scene.traverse(child => {
      if (!geo && (child as Mesh).isMesh) geo = (child as Mesh).geometry.clone();
    });
    return geo;
  }, [scene]);
};

// ── Single animated skeleton ──────────────────────────────────
// One wrapper per variant keeps React hook counts stable across renders.
const SkeletonMinion:   React.FC<{ slot: EnemyData }> = p => <SkeletonMesh {...p} skelType={0} />;
const SkeletonWarrior:  React.FC<{ slot: EnemyData }> = p => <SkeletonMesh {...p} skelType={1} />;
const SkeletonRogue:    React.FC<{ slot: EnemyData }> = p => <SkeletonMesh {...p} skelType={3} />;
const SkeletonMageMesh: React.FC<{ slot: EnemyData }> = p => <SkeletonMesh {...p} skelType={5} />;

function SkeletonMesh({ slot, skelType }: { slot: EnemyData; skelType: number }) {
  const outerRef = useRef<Group>(null);
  const sceneRef = useRef<any>(null);       // primitive ref for AnimationMixer root

  const { scene: rawScene } = useGLTF(ENEMY_PATHS[skelType]);
  const { animations }      = useGLTF(ANIM_RIGS.movementBasic);   // walk/idle clips
  const texture             = useTexture(ENEMY_TEXTURE);

  // SkeletonUtils.clone() properly duplicates skinned meshes & bone hierarchies.
  // Regular .clone() breaks animation bindings — this is the correct approach.
  const clone = useMemo(() => skeletonClone(rawScene), [rawScene]);

  useEffect(() => {
    clone.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.map = texture;
        child.material.needsUpdate = true;
        child.castShadow = true;
      }
    });
  }, [clone, texture]);

  // Bind animations to the cloned scene root (sceneRef = <primitive> node)
  const { actions } = useAnimations(animations, sceneRef);

  // Auto-discover clip names — works regardless of naming convention
  const walkKey  = useMemo(() => resolveClip(actions, 'Walk', 'Run', 'walk', 'run', 'Walking', 'Running', 'Move', 'Jog'), [actions]);
  const idleKey  = useMemo(() => resolveClip(actions, 'Idle', 'Stand', 'idle', 'Breathe', 'Breathing', 'Relax'), [actions]);
  const dieKey   = useMemo(() => resolveClip(actions, 'Death', 'Die', 'death', 'die', 'Dead', 'Dying'), [actions]);
  const stunKey  = useMemo(() => resolveClip(actions, 'Stun', 'Hit', 'Hurt', 'Flinch', 'stun', 'hurt'), [actions]);

  // Log available clips once in development so you can verify names
  useEffect(() => {
    if (import.meta.env.DEV && Object.keys(actions).length > 0) {
      console.log(`[Enemy skeleton ${skelType}] clips:`, Object.keys(actions));
    }
    const startKey = walkKey || idleKey;
    if (startKey && actions[startKey]) actions[startKey]?.play();
  }, [actions, walkKey, idleKey, skelType]);

  const prevKey = useRef('');

  useFrame(() => {
    if (!outerRef.current) return;

    if (!slot.active) {
      outerRef.current.visible = false;
      return;
    }

    outerRef.current.visible = true;
    outerRef.current.position.set(slot.position.x, 0, slot.position.z);
    outerRef.current.scale.setScalar(slot.scale ?? 1);

    let key = walkKey || idleKey;
    if (slot.health <= 0)                               key = dieKey  || key;
    else if (slot.freezeTimer && slot.freezeTimer > 0)  key = stunKey || idleKey || walkKey;

    if (!key || key === prevKey.current) return;
    prevKey.current = key;

    Object.values(actions).forEach(a => a?.fadeOut(0.15));
    actions[key]?.reset().fadeIn(0.15).play();
  });

  return (
    <group ref={outerRef} visible={false}>
      <primitive ref={sceneRef} object={clone} />
    </group>
  );
}

// Routes enemy type to the correct skeleton variant
function AnimatedEnemy({ slot }: { slot: EnemyData }) {
  const t = slot.type;
  if (t === 0)            return <SkeletonMinion  slot={slot} />;
  if (t === 1 || t === 2) return <SkeletonWarrior slot={slot} />;
  if (t === 3 || t === 4) return <SkeletonRogue   slot={slot} />;
  return                         <SkeletonMageMesh slot={slot} />;
}

// ── NearbyEnemies ─────────────────────────────────────────────
const MAX_VISIBLE = 8;

interface NearbyEnemiesProps {
  enemiesDataRef: React.MutableRefObject<EnemyData[]>;
  playerPositionRef: React.MutableRefObject<{ x: number; z: number }>;
}

export const NearbyEnemies: React.FC<NearbyEnemiesProps> = ({
  enemiesDataRef,
  playerPositionRef,
}) => {
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
    active.sort((a, b) =>
      ((a.position.x - pp.x) ** 2 + (a.position.z - pp.z) ** 2) -
      ((b.position.x - pp.x) ** 2 + (b.position.z - pp.z) ** 2)
    );
    for (let i = 0; i < MAX_VISIBLE; i++) {
      const src = active[i];
      if (src) Object.assign(slotsRef.current[i], src);
      else slotsRef.current[i].active = false;
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
