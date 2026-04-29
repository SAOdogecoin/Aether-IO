import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { InstancedMesh, Object3D, Vector3 } from 'three';
import { useGameStore } from '../store';
import { COLORS } from '../constants';
import { BulletData, CrateData } from '../types';

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
            // Bullet collision
            for(let b=0; b < activeBullets.length; b++) {
                const bullet = activeBullets[b];
                if (bullet.active) {
                    if (bullet.position.distanceTo(crate.position) < 1.5) {
                        damageCrate(crate.id, stats.damage);
                        bullet.active = false;

                        if (crate.hp - stats.damage <= 0) {
                            const r = Math.random();
                            if (r < 0.25) {
                                spawnDrop(crate.position.clone(), 'XP', 1, undefined, 5);
                            } else if (r < 0.5) {
                                spawnDrop(crate.position.clone(), 'GOLD', 50);
                            } else if (r < 0.75) {
                                spawnDrop(crate.position.clone(), 'ITEM', 0);
                            }
                            // else nothing (25% chance)
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
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_CRATES]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={COLORS.wood} />
      </instancedMesh>
      {crates.filter(c => c.active).map(c => (
        <Html key={c.id} position={[c.position.x, c.position.y + 2, c.position.z]} center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ width: 48, height: 6, background: 'rgba(0,0,0,0.7)', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.8)' }}>
            <div style={{ height: '100%', width: `${(c.hp / c.maxHp) * 100}%`, background: 'linear-gradient(90deg,#92400e,#d97706)', borderRadius: 3, transition: 'width 0.1s' }} />
          </div>
        </Html>
      ))}
    </>
  );
};
