import React, { useRef, useState } from 'react';
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
  // Track which crates have been hit at least once (to show HP bar)
  const damagedCrateIds = useRef<Set<number>>(new Set());
  const [damagedVersion, setDamagedVersion] = useState(0);

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

                        // Mark this crate as damaged (show HP bar)
                        if (!damagedCrateIds.current.has(crate.id)) {
                            damagedCrateIds.current.add(crate.id);
                            setDamagedVersion(v => v + 1);
                        }

                        if (crate.hp - stats.damage <= 0) {
                            damagedCrateIds.current.delete(crate.id);
                            // 0.5% chance for magnet orb (overrides regular drops)
                            if (Math.random() < 0.005) {
                                spawnDrop(crate.position.clone(), 'MAGNET', 0);
                            } else {
                                const r = Math.random();
                                if (r < 0.30) {
                                    // 30% nothing
                                } else if (r < 0.60) {
                                    // 30% XP orb — 50 XP, 1 piece
                                    spawnDrop(crate.position.clone(), 'XP', 50, undefined, 5);
                                } else if (r < 0.90) {
                                    // 30% gold orb — 100 gold, 1 piece
                                    spawnDrop(crate.position.clone(), 'GOLD', 100);
                                } else {
                                    // 10% item: 80% common, 20% rare
                                    const itemRarity = Math.random() < 0.2 ? 'RARE' : 'COMMON';
                                    spawnDrop(crate.position.clone(), 'ITEM', 0, itemRarity);
                                }
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
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_CRATES]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={COLORS.wood} />
      </instancedMesh>
      {crates.filter(c => c.active && damagedCrateIds.current.has(c.id)).map(c => (
        <Html key={c.id} position={[c.position.x, c.position.y + 2, c.position.z]} center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ width: 48, height: 6, background: 'rgba(0,0,0,0.7)', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.8)' }}>
            <div style={{ height: '100%', width: `${(c.hp / c.maxHp) * 100}%`, background: 'linear-gradient(90deg,#92400e,#d97706)', borderRadius: 3, transition: 'width 0.1s' }} />
          </div>
        </Html>
      ))}
    </>
  );
};
