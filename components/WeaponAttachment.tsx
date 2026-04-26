import React, { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Object3D, Bone } from 'three';
import { WEAPON_PATHS, HERO_WEAPON, HAND_BONE_HINTS } from '../assetConfig';

// Preload all weapon GLTFs (they'll 404 gracefully until .bin files arrive)
Object.values(WEAPON_PATHS).forEach(p => {
  try { useGLTF.preload(p); } catch { /* ignore until .bin files exist */ }
});

interface WeaponAttachmentProps {
  hero: 'ARCHER' | 'WIZARD' | 'BARBARIAN';
  /** The root scene object of the loaded character model */
  characterScene: Object3D;
}

// Finds the right-hand bone by trying a list of common naming conventions
function findHandBone(root: Object3D): Bone | null {
  let found: Bone | null = null;
  root.traverse(child => {
    if (found) return;
    if (!(child as Bone).isBone) return;
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

export const WeaponAttachment: React.FC<WeaponAttachmentProps> = ({ hero, characterScene }) => {
  const weaponKey = HERO_WEAPON[hero];
  const weaponPath = WEAPON_PATHS[weaponKey];
  const { scene: weaponScene } = useGLTF(weaponPath);
  const attachedRef = useRef(false);

  useEffect(() => {
    if (attachedRef.current) return;

    const handBone = findHandBone(characterScene);
    if (!handBone) {
      if (import.meta.env.DEV) {
        console.warn(`[WeaponAttachment] No hand bone found for ${hero}. Available bones:`);
        characterScene.traverse(c => { if ((c as Bone).isBone) console.warn(' -', c.name); });
      }
      return;
    }

    const weapon = weaponScene.clone();
    // Reset local transform so the weapon aligns to the bone naturally.
    // Adjust position/rotation below once you see it in-game.
    weapon.position.set(0, 0, 0);
    weapon.rotation.set(0, 0, 0);
    weapon.scale.setScalar(1);

    handBone.add(weapon);
    attachedRef.current = true;

    return () => {
      handBone.remove(weapon);
      attachedRef.current = false;
    };
  }, [characterScene, weaponScene, hero]);

  return null; // purely imperative — no JSX output
};
