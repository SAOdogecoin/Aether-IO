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
  const { stats, spawnDrop, crates, damageCrate } = useGameStore();

  useFrame(() => {
    if (!meshRef.current) return;

    const activeBullets = bulletsDataRef.current;
    
    crates.forEach((crate, i) => {
        if (!crate.active) {
            dummy.position.set(0, -100, 0);
        } else {
            // Collision Logic
            for(let b=0; b < activeBullets.length; b++) {
                const bullet = activeBullets[b];
                if (bullet.active) {
                    if (bullet.position.distanceTo(crate.position) < 1.5) {
                        // Apply damage via store action
                        damageCrate(crate.id, stats.damage);
                        
                        bullet.active = false;
                        
                        // Check destruction logic here to trigger visual drop
                        if (crate.hp - stats.damage <= 0) {
                             // Rewards
                            spawnDrop(crate.position, 'XP', 50);
                            
                            // Chance for Gold or Item
                            const r = Math.random();
                            if (r > 0.85) {
                                spawnDrop(crate.position.clone().add(new Vector3(1,0,0)), 'ITEM', 0);
                            } else if (r > 0.5) {
                                spawnDrop(crate.position.clone().add(new Vector3(0.5,0,0.5)), 'GOLD', 50);
                            }
                        }

                        // Shake visual
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

  // Safe guard in case crates array changes size (though it's static per run mostly)
  // Max count logic is handled by instancedMesh args
  const MAX_CRATES = 25; 

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_CRATES]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={COLORS.wood} />
    </instancedMesh>
  );
};