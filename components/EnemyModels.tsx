import React, { useRef, useEffect, useMemo } from 'react';
import { useGLTF, useAnimations, useTexture, Html } from '@react-three/drei';
import { Group, BufferGeometry, Mesh } from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useFrame } from '@react-three/fiber';
import { ENEMY_PATHS, ENEMY_TEXTURE, SKELETON_ANIM_RIGS, ASSET_FLAGS } from '../assetConfig';
import { EnemyData } from '../types';
import { MinionWeapons, WarriorWeapons, RogueWeapons, MageWeapons } from './SkeletonWeapons';
import { useGameStore } from '../store';

const EnemyHealthBar: React.FC<{ slot: EnemyData }> = ({ slot }) => {
  if (!slot.active || slot.health <= 0) return null;
  const pct = Math.max(0, Math.min(1, slot.health / slot.maxHealth));
  if (pct >= 1) return null;
  const isBoss = slot.type === 2;
  const barColor = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#facc15' : '#ef4444';
  return (
    <Html position={[0, isBoss ? 4.5 : 3.0, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div style={{ width: isBoss ? 80 : 52, height: 5, background: 'rgba(0,0,0,0.7)', borderRadius: 2, border: '1px solid rgba(0,0,0,0.8)', overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width 0.1s' }} />
      </div>
    </Html>
  );
};

// Preload unique skeleton variants + skeleton-specific animation rigs
[...new Set(Object.values(ENEMY_PATHS))].forEach(p => useGLTF.preload(p));
useGLTF.preload(SKELETON_ANIM_RIGS.movementBasic);
useGLTF.preload(SKELETON_ANIM_RIGS.general);

// ── Smart clip resolver ───────────────────────────────────────
function resolveClip(actions: Record<string, any>, ...hints: string[]): string {
  const keys = Object.keys(actions);
  for (const h of hints) { if (actions[h]) return h; }
  for (const h of hints) {
    const hit = keys.find(k => k.toLowerCase().includes(h.toLowerCase()));
    if (hit && actions[hit]) return hit;
  }
  return keys[0] ?? '';
}

// ── Geometry extractor (kept for potential InstancedMesh fallback) ─
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

// ── Per-variant wrappers (keeps hook count constant per component) ─
type PRef = React.MutableRefObject<{ x: number; z: number }>;

const SkeletonMinion:   React.FC<{ slot: EnemyData; ppRef: PRef }> = p => <SkeletonMesh {...p} skelType={0} />;
const SkeletonWarrior:  React.FC<{ slot: EnemyData; ppRef: PRef }> = p => <SkeletonMesh {...p} skelType={1} />;
const SkeletonRogue:    React.FC<{ slot: EnemyData; ppRef: PRef }> = p => <SkeletonMesh {...p} skelType={3} />;
const SkeletonMageMesh: React.FC<{ slot: EnemyData; ppRef: PRef }> = p => <SkeletonMesh {...p} skelType={5} />;

function SkeletonMesh({ slot, skelType, ppRef }: { slot: EnemyData; skelType: number; ppRef: PRef }) {
  const outerRef = useRef<Group>(null);
  const sceneRef = useRef<any>(null);

  const { scene: rawScene } = useGLTF(ENEMY_PATHS[skelType]);
  const { animations: moveAnims }    = useGLTF(SKELETON_ANIM_RIGS.movementBasic);
  const { animations: generalAnims } = useGLTF(SKELETON_ANIM_RIGS.general);
  const animations = useMemo(() => {
    const seen = new Set<string>();
    return [...moveAnims, ...generalAnims].filter(a => {
      if (seen.has(a.name)) return false;
      seen.add(a.name);
      return true;
    });
  }, [moveAnims, generalAnims]);

  const texture = useTexture(ENEMY_TEXTURE);
  const clone   = useMemo(() => skeletonClone(rawScene), [rawScene]);

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

  const { actions } = useAnimations(animations, sceneRef);

  const walkKey = useMemo(() => resolveClip(actions, 'Walk', 'Run', 'walk', 'run', 'Walking', 'Running', 'Move', 'Jog'), [actions]);
  const idleKey = useMemo(() => resolveClip(actions, 'Idle', 'Stand', 'idle', 'Breathe', 'Breathing', 'Relax'), [actions]);
  const dieKey  = useMemo(() => resolveClip(actions, 'Death', 'Die', 'death', 'die', 'Dead', 'Dying'), [actions]);
  const stunKey = useMemo(() => resolveClip(actions, 'Stun', 'Hit', 'Hurt', 'Flinch', 'stun', 'hurt'), [actions]);

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

    // Rotate to face the player
    const pp = ppRef.current;
    const dx = pp.x - slot.position.x;
    const dz = pp.z - slot.position.z;
    outerRef.current.rotation.y = Math.atan2(dx, dz);

    // Animation state
    let key = walkKey || idleKey;
    if (slot.health <= 0)                              key = dieKey  || key;
    else if (slot.freezeTimer && slot.freezeTimer > 0) key = stunKey || idleKey || walkKey;

    if (!key || key === prevKey.current) return;
    prevKey.current = key;

    Object.values(actions).forEach(a => a?.fadeOut(0.15));
    actions[key]?.reset().fadeIn(0.15).play();
  });

  return (
    <group ref={outerRef} visible={false}>
      <primitive ref={sceneRef} object={clone} />
      {ASSET_FLAGS.useWeapons && skelType === 0 && <MinionWeapons  clone={clone} />}
      {ASSET_FLAGS.useWeapons && skelType === 1 && <WarriorWeapons clone={clone} />}
      {ASSET_FLAGS.useWeapons && skelType === 3 && <RogueWeapons   clone={clone} />}
      {ASSET_FLAGS.useWeapons && skelType === 5 && <MageWeapons    clone={clone} />}
      <EnemyHealthBar slot={slot} />
    </group>
  );
}

// Routes enemy type → skeleton variant
function AnimatedEnemy({ slot, ppRef }: { slot: EnemyData; ppRef: PRef }) {
  const t = slot.type;
  if (t === 0)            return <SkeletonMinion  slot={slot} ppRef={ppRef} />;
  if (t === 1 || t === 2) return <SkeletonWarrior slot={slot} ppRef={ppRef} />;
  if (t === 3 || t === 4) return <SkeletonRogue   slot={slot} ppRef={ppRef} />;
  return                         <SkeletonMageMesh slot={slot} ppRef={ppRef} />;
}

// ── NearbyEnemies ─────────────────────────────────────────────
const MAX_VISIBLE = 16;

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
    const bossActive = useGameStore.getState().bossData.active;
    const active = enemiesDataRef.current.filter(e =>
      e.active && (!bossActive || e.type === 2)
    );
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
        <AnimatedEnemy key={i} slot={slot} ppRef={playerPositionRef} />
      ))}
    </>
  );
};
