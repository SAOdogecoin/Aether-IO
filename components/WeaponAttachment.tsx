import React, { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { Object3D, Bone } from 'three';
import { WEAPON_PATHS, HERO_WEAPON, HAND_BONE_HINTS } from '../assetConfig';
import { useGameStore } from '../store';
import type { HeroType } from './PlayerModel';

// Preload all hero weapon GLTFs upfront
Object.values(WEAPON_PATHS).forEach(p => useGLTF.preload(p));

// Map item name → WEAPON_PATHS key so equipped items drive the 3D model shown
const WEAPON_NAME_TO_MODEL: Partial<Record<string, keyof typeof WEAPON_PATHS>> = {
  // Archer
  'Shortbow':        'bow',
  'Elven Bow':       'bow',
  'Composite Bow':   'crossbow',
  'Windforce':       'bow',
  'Apollo Bow':      'bow',
  // Wizard
  'Novice Staff':    'staff',
  'Adept Staff':     'staff',
  'Inferno Rod':     'wand',
  'Archon Staff':    'staff',
  'Staff of Aether': 'staff',
  // Barbarian
  'Hand Axe':        'axe_1h',
  'Viking Axe':      'axe_2h',
  'Double Axe':      'axe_2h',
  'World Breaker':   'axe_2h',
  'Titan Killer':    'axe_2h',
};

function findHandBone(root: Object3D): Bone | null {
  let found: Bone | null = null;
  root.traverse(child => {
    if (found || !(child as Bone).isBone) return;
    const name = child.name.toLowerCase();
    for (const hint of HAND_BONE_HINTS) {
      if (name === hint.toLowerCase() || name.includes(hint.toLowerCase())) {
        found = child as Bone;
        return;
      }
    }
  });
  return found;
}

interface WeaponAttachmentProps {
  hero: HeroType;
  characterScene: Object3D;
}

export const WeaponAttachment: React.FC<WeaponAttachmentProps> = ({ hero, characterScene }) => {
  const equippedWeapon = useGameStore(state => state.equipment.weapon);

  // Resolve GLTF model from equipped item name, fall back to class default
  const modelKey: keyof typeof WEAPON_PATHS =
    (equippedWeapon ? WEAPON_NAME_TO_MODEL[equippedWeapon.name] : undefined) ?? HERO_WEAPON[hero];

  const { scene: weaponScene } = useGLTF(WEAPON_PATHS[modelKey]);

  useEffect(() => {
    const handBone = findHandBone(characterScene);
    if (!handBone) {
      if (import.meta.env.DEV) {
        const bones: string[] = [];
        characterScene.traverse(c => { if ((c as Bone).isBone) bones.push(c.name); });
        console.warn(`[WeaponAttachment] No hand bone for ${hero}. Available:`, bones);
      }
      return;
    }

    const weapon = weaponScene.clone();
    weapon.position.set(0, 0, 0);
    weapon.rotation.set(0, 0, 0);
    weapon.scale.setScalar(1);
    handBone.add(weapon);

    return () => { handBone.remove(weapon); };
  }, [characterScene, weaponScene, hero]);

  return null;
};
