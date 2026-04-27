import React, { useRef, useEffect, useMemo } from 'react';
import { useGLTF, useAnimations, useTexture } from '@react-three/drei';
import { Group, LoopOnce, AnimationClip } from 'three';
import { CHARACTER_PATHS, CHARACTER_TEXTURES, HERO_RIGS, ASSET_FLAGS } from '../assetConfig';
import { WeaponAttachment } from './WeaponAttachment';

export type HeroType = 'ARCHER' | 'WIZARD' | 'BARBARIAN';

export interface PlayerModelProps {
  hero: HeroType;
  isMoving: boolean;
  isAttacking: boolean;
  isDashing: boolean;
  isDead: boolean;
  isLevelingUp: boolean;
  rageMode: boolean;
  modelScale?: number;
}

// Preload all character meshes + their rig packs
Object.values(CHARACTER_PATHS).forEach(p => useGLTF.preload(p));
Object.values(HERO_RIGS).flat().filter((v, i, a) => a.indexOf(v) === i).forEach(p => useGLTF.preload(p));

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

// ── Per-hero components (hook count must be constant per variant) ─
const ArcherModel:    React.FC<PlayerModelProps> = p => <HeroModel {...p} hero="ARCHER"    />;
const WizardModel:    React.FC<PlayerModelProps> = p => <HeroModel {...p} hero="WIZARD"    />;
const BarbarianModel: React.FC<PlayerModelProps> = p => <HeroModel {...p} hero="BARBARIAN" />;

function HeroModel({
  hero, isMoving, isAttacking, isDashing, isDead, isLevelingUp, rageMode, modelScale = 1,
}: PlayerModelProps) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF(CHARACTER_PATHS[hero]);
  const texture   = useTexture(CHARACTER_TEXTURES[hero]);

  // Load all animation rigs for this hero and merge clips (dedup by name)
  const rigPaths = HERO_RIGS[hero];
  const rig0 = useGLTF(rigPaths[0]);
  const rig1 = useGLTF(rigPaths[1]);
  const rig2 = useGLTF(rigPaths[2]);
  const rig3 = useGLTF(rigPaths[3] ?? rigPaths[0]);

  const animations = useMemo<AnimationClip[]>(() => {
    const seen = new Set<string>();
    return [...rig0.animations, ...rig1.animations, ...rig2.animations, ...rig3.animations]
      .filter(a => { if (seen.has(a.name)) return false; seen.add(a.name); return true; });
  }, [rig0.animations, rig1.animations, rig2.animations, rig3.animations]);

  const { actions } = useAnimations(animations, group);

  // Apply texture to all meshes in the character
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.map = texture;
        child.material.needsUpdate = true;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene, texture]);

  // Log available clips once in development
  useEffect(() => {
    if (import.meta.env.DEV && Object.keys(actions).length > 0) {
      console.log(`[${hero}] animation clips:`, Object.keys(actions));
    }
  }, [actions, hero]);

  // Auto-resolve clip keys — handles any naming convention
  const idleKey    = useMemo(() => resolveClip(actions, 'Idle', 'idle', 'Stand', 'Breathing', 'Relax'), [actions]);
  const runKey     = useMemo(() => resolveClip(actions, 'Run', 'Walk', 'run', 'walk', 'Running', 'Walking', 'Jog', 'Move'), [actions]);
  const attackKey  = useMemo(() => resolveClip(actions, 'Attack', 'attack', 'Slash', 'Strike', 'Shoot', 'Cast', 'Swing'), [actions]);
  const dashKey    = useMemo(() => resolveClip(actions, 'Dash', 'dash', 'Dodge', 'Roll', 'Evade', 'Sprint'), [actions]);
  const dieKey     = useMemo(() => resolveClip(actions, 'Death', 'Die', 'death', 'die', 'Dead', 'Dying'), [actions]);
  const levelUpKey = useMemo(() => resolveClip(actions, 'Victory', 'Win', 'Dance', 'Cheer', 'Celebrate', 'Level'), [actions]);
  const rageKey    = useMemo(() => resolveClip(actions, 'Rage', 'Roar', 'Berserk', 'rage', 'roar'), [actions]);

  // Start idle on mount
  useEffect(() => {
    if (idleKey && actions[idleKey]) actions[idleKey]?.play();
  }, [idleKey, actions]);

  const prevAnim = useRef('');

  useEffect(() => {
    let key = idleKey;
    if (isDead)            key = dieKey     || idleKey;
    else if (isDashing)    key = dashKey    || runKey;
    else if (isAttacking)  key = attackKey  || idleKey;
    else if (isLevelingUp) key = levelUpKey || idleKey;
    else if (rageMode)     key = rageKey    || idleKey;
    else if (isMoving)     key = runKey     || idleKey;

    if (!key || key === prevAnim.current) return;
    prevAnim.current = key;

    Object.entries(actions).forEach(([n, a]) => { if (n !== key) a?.fadeOut(0.2); });

    const action = actions[key];
    if (!action) return;

    if (key === dieKey || key === dashKey) {
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    action.reset().fadeIn(0.2).play();
  }, [
    isMoving, isAttacking, isDashing, isDead, isLevelingUp, rageMode,
    actions, idleKey, runKey, attackKey, dashKey, dieKey, levelUpKey, rageKey,
  ]);

  return (
    <group ref={group} scale={[modelScale, modelScale, modelScale]}>
      <primitive object={scene} />
      {ASSET_FLAGS.useWeapons && (
        <WeaponAttachment hero={hero} characterScene={scene} />
      )}
    </group>
  );
}

// ── Public component ──────────────────────────────────────────
export const PlayerModel: React.FC<PlayerModelProps> = (props) => {
  if (props.hero === 'ARCHER')  return <ArcherModel    {...props} />;
  if (props.hero === 'WIZARD')  return <WizardModel    {...props} />;
  return                               <BarbarianModel {...props} />;
};
