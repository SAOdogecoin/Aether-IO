import React, { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Object3D, Bone } from 'three';
import { SKELETON_WEAPON_PATHS, HAND_BONE_HINTS, OFF_HAND_BONE_HINTS } from '../assetConfig';

// Preload all skeleton weapons
Object.values(SKELETON_WEAPON_PATHS).forEach(p => useGLTF.preload(p));

// ── Bone finder ───────────────────────────────────────────────
function findBone(root: Object3D, hints: string[]): Bone | null {
  let found: Bone | null = null;
  root.traverse(child => {
    if (found || !(child as Bone).isBone) return;
    const n = child.name.toLowerCase();
    if (hints.some(h => n === h.toLowerCase() || n.includes(h.toLowerCase()))) {
      found = child as Bone;
    }
  });
  return found;
}

function attach(root: Object3D, weaponScene: Object3D, boneHints: string[], label: string) {
  const bone = findBone(root, boneHints);
  if (!bone) {
    if (import.meta.env.DEV) {
      const bones: string[] = [];
      root.traverse(c => { if ((c as Bone).isBone) bones.push(c.name); });
      console.warn(`[SkeletonWeapons] No "${label}" bone found. Available:`, bones);
    }
    return null;
  }
  const w = weaponScene.clone();
  w.position.set(0, 0, 0);
  w.rotation.set(0, 0, 0);
  w.scale.setScalar(1);
  bone.add(w);
  return w;
}

// ── Per-type weapon components ────────────────────────────────
// Each component uses a fixed set of useGLTF calls (hook-safe).

interface WProps { clone: Object3D }

// Minion → axe in right hand
export const MinionWeapons: React.FC<WProps> = ({ clone }) => {
  const { scene: axeScene } = useGLTF(SKELETON_WEAPON_PATHS.axe);
  useEffect(() => {
    const w = attach(clone, axeScene, HAND_BONE_HINTS, 'right hand');
    return () => { w?.parent?.remove(w); };
  }, [clone, axeScene]);
  return null;
};

// Warrior / Boss → axe (right) + shield (left)
export const WarriorWeapons: React.FC<WProps> = ({ clone }) => {
  const { scene: axeScene }    = useGLTF(SKELETON_WEAPON_PATHS.axe);
  const { scene: shieldScene } = useGLTF(SKELETON_WEAPON_PATHS.shield);
  useEffect(() => {
    const axe    = attach(clone, axeScene,    HAND_BONE_HINTS,     'right hand');
    const shield = attach(clone, shieldScene, OFF_HAND_BONE_HINTS, 'left hand');
    return () => { axe?.parent?.remove(axe); shield?.parent?.remove(shield); };
  }, [clone, axeScene, shieldScene]);
  return null;
};

// Rogue / Speedy → arrow in right hand
export const RogueWeapons: React.FC<WProps> = ({ clone }) => {
  const { scene: arrowScene } = useGLTF(SKELETON_WEAPON_PATHS.arrow);
  useEffect(() => {
    const w = attach(clone, arrowScene, HAND_BONE_HINTS, 'right hand');
    return () => { w?.parent?.remove(w); };
  }, [clone, arrowScene]);
  return null;
};

// Mage / SlowShooter → staff in right hand
export const MageWeapons: React.FC<WProps> = ({ clone }) => {
  const { scene: staffScene } = useGLTF(SKELETON_WEAPON_PATHS.staff);
  useEffect(() => {
    const w = attach(clone, staffScene, HAND_BONE_HINTS, 'right hand');
    return () => { w?.parent?.remove(w); };
  }, [clone, staffScene]);
  return null;
};
