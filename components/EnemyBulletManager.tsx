
import React, { useRef, useLayoutEffect, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Vector3, DynamicDrawUsage } from 'three';
import { useGameStore } from '../store';
import { MAX_ENEMY_BULLETS, COLORS, PLAYER_RADIUS } from '../constants';
import { GameStatus, BulletData } from '../types';

interface EnemyBulletManagerProps {
  enemyBulletsDataRef: React.MutableRefObject<BulletData[]>;
}

const dummy = new Object3D();

export const EnemyBulletManager: React.FC<EnemyBulletManagerProps> = ({ enemyBulletsDataRef }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const { status, earthwall, obstacles, playerPosition, takeDamage, isInvincible } = useGameStore();
  
  // Local storage
  const bullets = useRef(new Array(MAX_ENEMY_BULLETS).fill(0).map((_, i) => ({
    id: i,
    active: false,
    position: new Vector3(),
    velocity: new Vector3(),
    lifetime: 0,
    damage: 0
  })));

  // Sync ref
  useEffect(() => {
    enemyBulletsDataRef.current = bullets.current;
  }, []);

  useLayoutEffect(() => {
    if (meshRef.current) {
        meshRef.current.instanceMatrix.setUsage(DynamicDrawUsage);
    }
  }, []);

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;
    if (!meshRef.current) return;

    let activeCount = 0;
    for (let i = 0; i < MAX_ENEMY_BULLETS; i++) {
        const b = bullets.current[i];
        if (b.active) {
            b.position.add(b.velocity.clone().multiplyScalar(delta));
            b.lifetime -= delta;

            // Earthwall Collision for bullets
            if (earthwall.active) {
                const dist = b.position.distanceTo(earthwall.position);
                if (dist < earthwall.radius) {
                    b.active = false;
                    b.lifetime = 0;
                }
            }

            // Obstacle Collision
            if (b.active) {
                for(const obs of obstacles) {
                    if (b.position.distanceTo(obs.position) < obs.radius + 0.3) {
                        b.active = false;
                        b.lifetime = 0;
                        break;
                    }
                }
            }

            // Player hit detection (horizontal collision only)
            if (b.active && !isInvincible) {
                const dx = b.position.x - playerPosition.x;
                const dz = b.position.z - playerPosition.z;
                const horizontalDist = Math.sqrt(dx * dx + dz * dz);
                if (horizontalDist < PLAYER_RADIUS + 0.5) {
                    takeDamage(b.damage);
                    b.active = false;
                    b.lifetime = 0;
                }
            }

            if (b.lifetime <= 0) {
                b.active = false;
                dummy.position.set(0, -100, 0);
            } else {
                dummy.position.copy(b.position);
                dummy.lookAt(b.position.clone().add(b.velocity));
                dummy.scale.set(1, 1, 1);
            }
            activeCount++;
        } else {
            dummy.position.set(0, -100, 0);
            dummy.scale.set(0, 0, 0);
        }
        
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_ENEMY_BULLETS]} frustumCulled={false}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshStandardMaterial color={COLORS.bulletEnemy} emissive={COLORS.bulletEnemy} emissiveIntensity={2} />
    </instancedMesh>
  );
};
