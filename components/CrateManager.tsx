import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Vector3 } from 'three';
import { useGameStore } from '../store';
import { COLORS } from '../constants';
import { BulletData } from '../types';

const dummy = new Object3D();

interface CrateManagerProps {
  bulletsDataRef: React.MutableRefObject<BulletData[]>;
}

export const CrateManager: React.FC<CrateManagerProps> = ({ bulletsDataRef }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const { stats, spawnDrop, crates, damageCrate, playerPosition } = useGameStore();

  useFrame(() => {
    if (!meshRef.current) return;

    const activeBullets = bulletsDataRef.current;

    crates.forEach((crate, i) => {
        if (!crate.active) {
            dummy.position.set(0, -100, 0);
        } else {
            // Player walk-on: destroy crate when player steps on it
            const playerDist = playerPosition.distanceTo(crate.position);
            if (playerDist < 1.3) {
                const r = Math.random();
                if (r < 0.1) {
                    // Rare (10%): drop item
                    spawnDrop(crate.position.clone().add(new Vector3(0.5, 0, 0.5)), 'ITEM', 0);
                } else if (r < 0.4) {
                    // Common (30%): 5 XP orbs
                    for (let x = 0; x < 5; x++) {
                        const off = new Vector3((Math.random()-0.5)*1.5, 0, (Math.random()-0.5)*1.5);
                        spawnDrop(crate.position.clone().add(off), 'XP', 10);
                    }
                } else {
                    // Very common (60%): 100 gold
                    spawnDrop(crate.position.clone(), 'GOLD', 100);
                }
                damageCrate(crate.id, 9999);
                dummy.position.set(0, -100, 0);
                dummy.updateMatrix();
                meshRef.current?.setMatrixAt(i, dummy.matrix);
                return;
            }

            // Bullet collision
            for(let b=0; b < activeBullets.length; b++) {
                const bullet = activeBullets[b];
                if (bullet.active) {
                    if (bullet.position.distanceTo(crate.position) < 1.5) {
                        damageCrate(crate.id, stats.damage);
                        bullet.active = false;

                        if (crate.hp - stats.damage <= 0) {
                            const r = Math.random();
                            if (r < 0.1) {
                                spawnDrop(crate.position.clone().add(new Vector3(0.5, 0, 0.5)), 'ITEM', 0);
                            } else if (r < 0.4) {
                                for (let x = 0; x < 5; x++) {
                                    const off = new Vector3((Math.random()-0.5)*1.5, 0, (Math.random()-0.5)*1.5);
                                    spawnDrop(crate.position.clone().add(off), 'XP', 10);
                                }
                            } else {
                                spawnDrop(crate.position.clone(), 'GOLD', 100);
                            }
                        }

                        dummy.rotation.set(0, crate.rotation + Math.random() * 0.5, 0);
                    }
                }
            }

            dummy.position.copy(crate.position);
            dummy.rotation.set(0, crate.rotation, 0);
            dummy.scale.set(1.5, 1.5, 1.5);
        }
        dummy.updateMatrix();
        meshRef.current?.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const MAX_CRATES = 25;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_CRATES]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={COLORS.wood} />
    </instancedMesh>
  );
};
