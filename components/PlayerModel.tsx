import React, { useRef, useEffect, useMemo } from 'react';
import { useGLTF, useAnimations, useTexture } from '@react-three/drei';
import { Group, LoopOnce, AnimationClip } from 'three';
import {
  CHARACTER_PATHS,
  CHARACTER_TEXTURES,
  HERO_RIGS,
  PLAYER_ANIM_NAMES,
} from '../assetConfig';

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

// Preloads all character GLBs + rig packs so there's no pop-in
Object.entries(CHARACTER_PATHS).forEach(([, p]) => useGLTF.preload(p));
Object.values(HERO_RIGS).flat().forEach((p) => useGLTF.preload(p));

// ── Per-hero inner component ──────────────────────────────────
// Must be separate components so hook call counts stay consistent.

const ArcherModel: React.FC<PlayerModelProps> = (props) => <HeroModel {...props} hero="ARCHER" />;
const WizardModel: React.FC<PlayerModelProps> = (props) => <HeroModel {...props} hero="WIZARD" />;
const BarbarianModel: React.FC<PlayerModelProps> = (props) => <HeroModel {...props} hero="BARBARIAN" />;

function HeroModel({
  hero, isMoving, isAttacking, isDashing, isDead, isLevelingUp, rageMode, modelScale = 1,
}: PlayerModelProps) {
  const group = useRef<Group>(null);

  // Load the character mesh
  const { scene } = useGLTF(CHARACTER_PATHS[hero]);
  const texture = useTexture(CHARACTER_TEXTURES[hero]);

  // Load all animation rigs for this hero and merge their clips
  const rigPaths = HERO_RIGS[hero];
  const rig0 = useGLTF(rigPaths[0]);
  const rig1 = useGLTF(rigPaths[1]);
  const rig2 = useGLTF(rigPaths[2]);
  const rig3 = useGLTF(rigPaths[3] ?? rigPaths[0]); // fallback to first if fewer rigs

  const animations = useMemo<AnimationClip[]>(() => {
    const seen = new Set<string>();
    const clips: AnimationClip[] = [];
    for (const a of [...rig0.animations, ...rig1.animations, ...rig2.animations, ...rig3.animations]) {
      if (!seen.has(a.name)) { seen.add(a.name); clips.push(a); }
    }
    return clips;
  }, [rig0.animations, rig1.animations, rig2.animations, rig3.animations]);

  const { actions } = useAnimations(animations, group);

  // Apply texture to all meshes in the character scene
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.material.map = texture;
        child.material.needsUpdate = true;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene, texture]);

  const prevAnim = useRef('');

  useEffect(() => {
    let target = PLAYER_ANIM_NAMES.idle;
    if (isDead)           target = PLAYER_ANIM_NAMES.die;
    else if (isDashing)   target = PLAYER_ANIM_NAMES.dash;
    else if (isAttacking) target = PLAYER_ANIM_NAMES.attack;
    else if (isLevelingUp) target = PLAYER_ANIM_NAMES.levelUp;
    else if (rageMode)    target = PLAYER_ANIM_NAMES.rage;
    else if (isMoving)    target = PLAYER_ANIM_NAMES.run;

    // Try the target, fall back to the first available clip
    const key = actions[target] ? target : Object.keys(actions)[0] ?? '';
    if (!key || key === prevAnim.current) return;
    prevAnim.current = key;

    Object.entries(actions).forEach(([n, a]) => { if (n !== key) a?.fadeOut(0.2); });

    const action = actions[key]!;
    if (target === PLAYER_ANIM_NAMES.die || target === PLAYER_ANIM_NAMES.dash) {
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    action.reset().fadeIn(0.2).play();
  }, [isMoving, isAttacking, isDashing, isDead, isLevelingUp, rageMode, actions]);

  return (
    <group ref={group} scale={[modelScale, modelScale, modelScale]}>
      <primitive object={scene} />
    </group>
  );
}

// ── Public component — routes to per-hero variant ─────────────
export const PlayerModel: React.FC<PlayerModelProps> = (props) => {
  if (props.hero === 'ARCHER')    return <ArcherModel    {...props} />;
  if (props.hero === 'WIZARD')    return <WizardModel    {...props} />;
  return                                 <BarbarianModel {...props} />;
};
