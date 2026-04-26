import React, { useRef, useEffect } from 'react';
import { useGLTF, useFBX, useAnimations } from '@react-three/drei';
import { Group, LoopOnce } from 'three';
import { useFrame } from '@react-three/fiber';
import { CHARACTER_PATHS, PLAYER_ANIM_NAMES } from '../assetConfig';

export type HeroType = 'ARCHER' | 'WIZARD' | 'BARBARIAN';

export interface PlayerModelProps {
  hero: HeroType;
  isMoving: boolean;
  isAttacking: boolean;
  isDashing: boolean;
  isDead: boolean;
  isLevelingUp: boolean;
  rageMode: boolean;
  /** Scale applied to the loaded model. Default 1. */
  modelScale?: number;
}

// --------------- GLB variant -----------------------------------------------
const GLBPlayerModel: React.FC<PlayerModelProps> = ({
  hero, isMoving, isAttacking, isDashing, isDead, isLevelingUp, rageMode, modelScale = 1,
}) => {
  const group = useRef<Group>(null);
  const path = CHARACTER_PATHS[hero];
  const { scene, animations } = useGLTF(path);
  const { actions } = useAnimations(animations, group);

  // Track previous animation so we can fade cleanly
  const prevAnim = useRef<string>('');

  useEffect(() => {
    let target = PLAYER_ANIM_NAMES.idle;
    if (isDead)          target = PLAYER_ANIM_NAMES.die;
    else if (isDashing)  target = PLAYER_ANIM_NAMES.dash;
    else if (isAttacking)target = PLAYER_ANIM_NAMES.attack;
    else if (isLevelingUp) target = PLAYER_ANIM_NAMES.levelUp;
    else if (rageMode)   target = PLAYER_ANIM_NAMES.rage;
    else if (isMoving)   target = PLAYER_ANIM_NAMES.run;

    if (target === prevAnim.current) return;
    prevAnim.current = target;

    const next = actions[target];
    if (!next) return;

    // Fade out everything else
    Object.entries(actions).forEach(([name, action]) => {
      if (name !== target) action?.fadeOut(0.2);
    });

    // One-shot animations reset after completion
    if (target === PLAYER_ANIM_NAMES.die || target === PLAYER_ANIM_NAMES.dash) {
      next.setLoop(LoopOnce, 1);
      next.clampWhenFinished = true;
    }

    next.reset().fadeIn(0.2).play();
  }, [isMoving, isAttacking, isDashing, isDead, isLevelingUp, rageMode, actions]);

  return (
    <group ref={group} scale={[modelScale, modelScale, modelScale]}>
      <primitive object={scene} />
    </group>
  );
};

// --------------- FBX variant -----------------------------------------------
const FBXPlayerModel: React.FC<PlayerModelProps> = ({
  hero, isMoving, isAttacking, isDashing, isDead, isLevelingUp, rageMode, modelScale = 1,
}) => {
  const group = useRef<Group>(null);
  const path = CHARACTER_PATHS[hero].replace('.glb', '.fbx');
  const fbx = useFBX(path);
  const { actions } = useAnimations(fbx.animations, group);

  const prevAnim = useRef<string>('');

  useEffect(() => {
    let target = PLAYER_ANIM_NAMES.idle;
    if (isDead)          target = PLAYER_ANIM_NAMES.die;
    else if (isDashing)  target = PLAYER_ANIM_NAMES.dash;
    else if (isAttacking)target = PLAYER_ANIM_NAMES.attack;
    else if (isLevelingUp) target = PLAYER_ANIM_NAMES.levelUp;
    else if (rageMode)   target = PLAYER_ANIM_NAMES.rage;
    else if (isMoving)   target = PLAYER_ANIM_NAMES.run;

    if (target === prevAnim.current) return;
    prevAnim.current = target;

    const next = actions[target];
    if (!next) return;

    Object.entries(actions).forEach(([name, action]) => {
      if (name !== target) action?.fadeOut(0.2);
    });

    if (target === PLAYER_ANIM_NAMES.die || target === PLAYER_ANIM_NAMES.dash) {
      next.setLoop(LoopOnce, 1);
      next.clampWhenFinished = true;
    }

    next.reset().fadeIn(0.2).play();
  }, [isMoving, isAttacking, isDashing, isDead, isLevelingUp, rageMode, actions]);

  return (
    <group ref={group} scale={[modelScale, modelScale, modelScale]}>
      <primitive object={fbx} />
    </group>
  );
};

// --------------- Public component — picks loader from file extension --------
export const PlayerModel: React.FC<PlayerModelProps> = (props) => {
  const path = CHARACTER_PATHS[props.hero] ?? '';
  const isFBX = path.toLowerCase().endsWith('.fbx');
  return isFBX ? <FBXPlayerModel {...props} /> : <GLBPlayerModel {...props} />;
};

// Preload all hero GLBs so there's no pop-in at runtime
Object.values(CHARACTER_PATHS).forEach((p) => {
  if (!p.toLowerCase().endsWith('.fbx')) useGLTF.preload(p);
});
