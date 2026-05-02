
import React, { useRef, useLayoutEffect, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { InstancedMesh, Object3D, Vector3, DynamicDrawUsage, BufferGeometry, Color, InstancedBufferAttribute } from 'three';
import { useGameStore } from '../store';
import { MAX_BULLETS, COLORS } from '../constants';
import { GameStatus, BulletData, ProjectileType, EnemyData } from '../types';
import { SpatialHashGrid } from '../utils/SpatialHashGrid';

interface BulletManagerProps {
  playerPos: Vector3;
  targetPosRef: React.MutableRefObject<Vector3>;
  bulletsDataRef: React.MutableRefObject<BulletData[]>;
  projectileType?: ProjectileType;
  // New Props via Player
  enemiesDataRef?: React.MutableRefObject<EnemyData[]>;
}

const dummy = new Object3D();
const tempColor = new Color();

export const BulletManager: React.FC<BulletManagerProps & { spatialGrid?: React.MutableRefObject<SpatialHashGrid> }> = ({ playerPos, targetPosRef, bulletsDataRef, projectileType = 'MAGIC', enemiesDataRef, spatialGrid }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const { stats, status, equipment, obstacles, piercingShotBoostTimer, crates } = useGameStore();
  const { scene } = useThree();
  
  const bullets = useRef<BulletData[]>(new Array(MAX_BULLETS).fill(0).map((_, i) => ({
    id: i,
    active: false,
    position: new Vector3(),
    velocity: new Vector3(),
    lifetime: 0,
    type: 'MAGIC' as ProjectileType,
    state: 0,
    pierce: 1,
    hitIds: [] as number[],
    effect: undefined,
    knockback: 0,
    trailTimer: 0,
    damageMultiplier: 1,
    bouncesLeft: 0,
    rotation: 0
  })));
  
  const lastShot = useRef(0);

  useEffect(() => {
    bulletsDataRef.current = bullets.current;
  }, [bulletsDataRef]);

  useLayoutEffect(() => {
    if (meshRef.current) {
        meshRef.current.instanceMatrix.setUsage(DynamicDrawUsage);
        const colors = new Float32Array(MAX_BULLETS * 3);
        for(let i=0; i<MAX_BULLETS; i++) {
            tempColor.set('#000000');
            tempColor.toArray(colors, i*3);
        }
        meshRef.current.geometry.setAttribute('color', new InstancedBufferAttribute(colors, 3));
    }
  }, [projectileType]); 

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();

    // 1. Auto-Fire Logic
    const hasPiercingBoost = piercingShotBoostTimer > 0;
    const boostedFireRate = hasPiercingBoost ? stats.fireRate * 3 : stats.fireRate;
    const fireInterval = 1 / boostedFireRate;
    const targetPos = targetPosRef.current;

    // Find nearest enemy in attack range for auto-aim
    let nearestEnemyPos: Vector3 | null = null;
    if (enemiesDataRef && enemiesDataRef.current) {
      let nearestDist = stats.attackRange;
      for (const e of enemiesDataRef.current) {
        if (!e.active) continue;
        const d = playerPos.distanceTo(e.position);
        if (d < nearestDist) { nearestDist = d; nearestEnemyPos = e.position; }
      }
    }
    let nearestCratePos: Vector3 | null = null;
    if (!nearestEnemyPos) {
      let nearestCrateDist = stats.attackRange;
      for (const c of crates) {
        if (!c.active) continue;
        const d = playerPos.distanceTo(c.position);
        if (d < nearestCrateDist) { nearestCrateDist = d; nearestCratePos = c.position; }
      }
    }
    const hasTarget = nearestEnemyPos !== null || nearestCratePos !== null;

    if (hasTarget && time - lastShot.current > fireInterval) {
      lastShot.current = time;
      const aimAt = nearestEnemyPos ?? nearestCratePos ?? targetPos;
      const dir = new Vector3().subVectors(aimAt, playerPos).normalize();
      const count = hasPiercingBoost ? 7 : Math.min(7, stats.multishot); 
      
      for (let i = 0; i < count; i++) {
        const bullet = bullets.current.find(b => !b.active);
        if (bullet) {
            bullet.active = true;
            bullet.lifetime = projectileType === 'AXE' ? 3.5 : 3.0; 
            bullet.position.copy(playerPos).add(new Vector3(0, 1, 0));
            bullet.type = projectileType;
            bullet.state = 0;
            bullet.hitIds = [];
            bullet.knockback = stats.knockback;
            bullet.damageMultiplier = 1; 
            bullet.bouncesLeft = 0;
            
            if (equipment.weapon && equipment.weapon.onHitEffect) {
                bullet.effect = { ...equipment.weapon.onHitEffect };
                if (bullet.effect.type === 'BURN' || bullet.effect.type === 'POISON') {
                    bullet.effect.value = stats.damage * 0.3;
                }
            } else {
                bullet.effect = undefined;
            }
            
            bullet.pierce = projectileType === 'AXE' ? 99 : 1; 
            if (projectileType === 'MAGIC') bullet.pierce = 4;
            if (projectileType === 'ICE') bullet.pierce = 2; 

            let offsetIndex = 0;
            if (i > 0) {
                const pair = Math.ceil(i / 2);
                const sign = i % 2 !== 0 ? 1 : -1;
                offsetIndex = pair * sign;
            }

            if (projectileType === 'AXE') {
                const offsetDist = offsetIndex * 2.0; 
                bullet.position.add(dir.clone().cross(new Vector3(0,1,0)).multiplyScalar(offsetDist));
                bullet.velocity.copy(dir); 
            } else {
                const angle = offsetIndex * stats.spread;
                const spreadDir = dir.clone().applyAxisAngle(new Vector3(0, 1, 0), angle);
                bullet.velocity.copy(spreadDir);
            }
            
            let speed = stats.projectileSpeed;
            if (projectileType === 'AXE') speed *= 2.7; // Increased speed for 50% more range
            if (projectileType === 'MAGIC') speed *= 0.6; 
            if (projectileType === 'ARROW') speed *= 1.5; 

            bullet.velocity.multiplyScalar(speed);
        }
      }
    }

    // 2. Bullet Update Logic
    // OPTIMIZATION: Retrieve enemies reference
    const enemies = enemiesDataRef ? enemiesDataRef.current : [];
    const grid = spatialGrid ? spatialGrid.current : null;

    for (let i = 0; i < MAX_BULLETS; i++) {
        const b = bullets.current[i];
        if (b.active) {
            
            // Movement Logic
            if (b.type === 'FIREBALL') {
                b.position.add(b.velocity.clone().multiplyScalar(delta));
                b.trailTimer = (b.trailTimer || 0) - delta;
                if (b.trailTimer <= 0) {
                    b.trailTimer = 0.1; 
                    const trail = bullets.current.find(t => !t.active);
                    if (trail) {
                        trail.active = true;
                        trail.type = 'FIRE_TRAIL';
                        trail.lifetime = 5.0; 
                        trail.position.copy(b.position);
                        trail.position.y = 0.1; 
                        trail.velocity.set(0, 0, 0); 
                        trail.pierce = 9999; 
                        trail.damageMultiplier = 0.5;
                        trail.effect = undefined;
                    }
                }
            } else if (b.type === 'BLACKHOLE') {
                b.rotation = (b.rotation || 0) + delta * 2;
            } else if (b.type === 'STORM') {
                b.position.add(b.velocity.clone().multiplyScalar(delta));
                b.rotation = (b.rotation || 0) + delta * 15; 
            } else if (b.type === 'METEOR') {
                // Meteor falls initially then rolls with burning trail
                if (!b.state) {
                    b.state = 0; // 0 = falling, 1 = rolling
                    b.stateTimer = 0;
                }

                if (b.state === 0) {
                    // Falling phase - apply gravity
                    if (!b.velocity.y) b.velocity.y = 0;
                    b.velocity.y -= 20 * delta; // Gravity
                    b.position.add(b.velocity.clone().multiplyScalar(delta));

                    // Check if hit ground (y <= 1 or hit an enemy)
                    if (b.position.y <= 1.0) {
                        b.state = 1; // Switch to rolling
                        b.stateTimer = 0;
                        b.velocity.set(b.velocity.x, 0, b.velocity.z).normalize().multiplyScalar(15);
                        b.rotation = 0;

                        // Impact damage - 2x base damage + shockwave
                        const nearbyIds = grid ? grid.query(b.position.x, b.position.z) : [];
                        const idsToCheck = grid ? nearbyIds : (enemies || []).map((e, idx) => idx);

                        for(const id of idsToCheck) {
                            const e = enemies[id];
                            if (e && e.active && e.position.distanceTo(b.position) < 12.0) {
                                const dmg = stats.damage * 2.0 * (b.damageMultiplier || 1); // 2x impact damage
                                const shockDmg = dmg * 0.5; // 50% shockwave damage
                                e.health -= (dmg + shockDmg);
                                window.dispatchEvent(new CustomEvent('damage', {
                                    detail: { position: e.position, damage: dmg + shockDmg, isCrit: false, damageType: 'FIRE' }
                                }));
                            }
                        }
                    }
                } else {
                    // Rolling phase - move horizontally and leave burning trails
                    b.rotation = (b.rotation || 0) + delta * 20;
                    b.position.add(b.velocity.clone().multiplyScalar(delta));
                    b.stateTimer += delta;

                    // Create burning trail
                    if (b.stateTimer > 0.1) {
                        b.stateTimer = 0;
                        const trail = trails.find(t => !t.active);
                        if (trail) {
                            trail.active = true;
                            trail.position.copy(b.position);
                            trail.velocity.set(0, 0, 0);
                            trail.lifetime = 2.0;
                            trail.effect = { type: 'BURN', duration: 3, value: stats.damage * 0.4 };
                        }
                    }
                }
            } else if (b.type === ('FIRE_TRAIL' as ProjectileType)) {
                // Stationary
            } else if (b.type === 'AXE') {
                if (b.state === 0) {
                    b.velocity.multiplyScalar(0.95); 
                    if (b.velocity.length() < 2) {
                        b.state = 1; 
                        b.hitIds = []; 
                    }
                } else {
                    const toPlayer = new Vector3().subVectors(playerPos, b.position).normalize();
                    b.velocity.add(toPlayer.multiplyScalar(50 * delta)); 
                    if (b.position.distanceTo(playerPos) < 1.5) {
                        b.active = false;
                    }
                }
                b.position.add(b.velocity.clone().multiplyScalar(delta));
            } else {
                b.position.add(b.velocity.clone().multiplyScalar(delta));
            }
            
            b.lifetime -= delta;

            if (b.active && b.type !== 'FIRE_TRAIL' && b.type !== 'BLACKHOLE' && b.type !== 'STORM') { 
                for (const obs of obstacles) {
                    if (b.position.distanceTo(obs.position) < obs.radius + 0.3) {
                        b.active = false;
                        b.lifetime = 0;
                        break;
                    }
                }
            }

            if (b.lifetime <= 0) {
                // Explosion Logic (Blackhole end)
                 if (b.type === 'BLACKHOLE' && enemies) {
                     // Need broad phase for explosion too? Yes ideally.
                     const nearbyIds = grid ? grid.query(b.position.x, b.position.z) : [];
                     const idsToCheck = grid ? nearbyIds : enemies.map(e => e.id);

                     for(const id of idsToCheck) {
                         const e = enemies[id];
                         if (e.active && e.position.distanceTo(b.position) < 8.0) {
                                const dmg = stats.damage * 5.0; 
                                e.health -= dmg;
                                window.dispatchEvent(new CustomEvent('damage', { 
                                    detail: { position: e.position, damage: dmg, isCrit: false, damageType: 'MAGIC' } 
                                }));
                         }
                     }
                }
                b.active = false;
                dummy.position.set(0, -100, 0);
            } else {
                dummy.position.copy(b.position);
                
                // --- COLLISION DETECTION (OPTIMIZED) ---
                if (enemies && grid && b.type !== 'BLACKHOLE') { // Blackhole handles pull in EnemyManager, dmg at end
                    // Query Grid
                    const candidateIds = grid.query(b.position.x, b.position.z);
                    
                    const baseDamage = stats.damage;
                    const critRate = stats.critRate;
                    const critDamage = stats.critDamage;

                    for(const id of candidateIds) {
                        if (!b.active) break; // Bullet died mid-loop

                        const e = enemies[id];
                        if (!e || !e.active) continue;
                        if (b.hitIds && b.hitIds.includes(id)) continue; 

                        // Precise Check
                        let hitRadius = e.radius + 1.5; 
                        if (b.type === 'MAGIC') hitRadius += 1.0;
                        if (b.type === 'FIREBALL') hitRadius += 2.0; 
                        if (b.type === 'FIRE_TRAIL') hitRadius = e.radius + 1.5; 
                        if (b.type === 'POISON_ARROW') hitRadius += 1.5; 
                        if (b.type === 'STUN_ARROW') hitRadius += 1.5; 
                        if (b.type === 'PIERCING_ARROW') hitRadius += 4.0;
                        if (b.type === 'STORM') hitRadius += 4.0;

                        if (b.position.distanceTo(e.position) < hitRadius) {
                            
                             // Fire Trail Logic
                             if (b.type === ('FIRE_TRAIL' as ProjectileType)) {
                                e.burnTimer = 2.0;
                                e.burnDamage = 5;
                                e.health -= 2 * delta; 
                                continue; 
                            }

                            const isCrit = Math.random() < critRate;
                            let dmg = (isCrit ? baseDamage * critDamage : baseDamage);
                            if (b.damageMultiplier) dmg *= b.damageMultiplier;

                            // Effects
                            if (b.effect) {
                                const { type, duration, value, chance } = b.effect;
                                if (Math.random() < (chance || 1.0)) {
                                    if (type === 'BURN') { e.burnTimer = duration; e.burnDamage = value ?? 5; }
                                    if (type === 'POISON') { e.poisonTimer = duration; e.poisonDamage = value ?? 3; }
                                    if (type === 'STUN' || type === 'FREEZE') { e.freezeTimer = duration; }
                                    if (type === 'SLOW') { e.slowTimer = duration; e.slowFactor = value || 0.5; }
                                }
                            }

                            let dmgType = 'PHYSICAL';
                            if (b.type === 'FIREBALL' || b.type === 'POISON_ARROW' || b.type === ('FIRE_TRAIL' as ProjectileType)) dmgType = 'FIRE';
                            else if (b.type === 'STUN_ARROW' || b.type === 'ICE') dmgType = 'ICE';
                            else if (b.type === 'MAGIC') dmgType = 'MAGIC';
                            else if (b.type === 'STORM') dmgType = 'MAGIC';

                            // AOE Logic
                            if (b.type === 'MAGIC' || b.type === 'FIREBALL' || b.type === 'POISON_ARROW' || b.type === 'STUN_ARROW' || b.type === ('FIRE_TRAIL' as ProjectileType)) {
                                // For AOE, we can re-query grid or check neighbors of current target
                                // Simple: Check neighbors of 'e'
                                const aoeRange = b.type === 'MAGIC' ? 4.0 : 5.0;
                                const aoeCandidates = grid.query(e.position.x, e.position.z);
                                for(const aoeId of aoeCandidates) {
                                    const neighbor = enemies[aoeId];
                                    if(neighbor.active && neighbor.id !== e.id && neighbor.position.distanceTo(e.position) < aoeRange) {
                                        neighbor.health -= dmg * 0.5;
                                        if (b.type === 'POISON_ARROW') { neighbor.burnTimer = 4.0; neighbor.burnDamage = baseDamage * 0.5; }
                                        if (b.type === 'STUN_ARROW') { neighbor.freezeTimer = 1.5; }
                                    }
                                }
                            }
                            
                            // Apply to main target
                            if (b.type === 'POISON_ARROW') { e.burnTimer = 4.0; e.burnDamage = baseDamage * 0.5; }
                            if (b.type === 'STUN_ARROW') { e.freezeTimer = 1.5; }
                            if (b.type === 'FIREBALL') { e.burnTimer = 3.0; e.burnDamage = 5; }

                            e.health -= dmg;
                            window.dispatchEvent(new CustomEvent('damage', { 
                                detail: { position: e.position, damage: dmg, isCrit, damageType: dmgType } 
                            }));

                            if (b.hitIds) b.hitIds.push(e.id);
                            
                            // Knockback
                            if (e.type !== 2 && e.freezeTimer <= 0) { // Can move check simplified
                                const kbDir = e.position.clone().sub(b.position).normalize();
                                const kbForce = b.knockback ?? 0.5;
                                e.position.add(kbDir.multiplyScalar(kbForce));
                            }

                            // Bouncing
                            if (b.type === 'STORM' && b.bouncesLeft && b.bouncesLeft > 0) {
                                b.bouncesLeft--;
                                let nearestDist = 50; 
                                let nextTargetPos = null;
                                // Simplified bounce: Check current candidate list
                                for(const nextId of candidateIds) {
                                    const potential = enemies[nextId];
                                    if (potential.active && !b.hitIds.includes(potential.id)) {
                                        const d = potential.position.distanceTo(e.position);
                                        if (d < nearestDist) {
                                            nearestDist = d;
                                            nextTargetPos = potential.position;
                                        }
                                    }
                                }
                                if (nextTargetPos) {
                                    const newDir = new Vector3().subVectors(nextTargetPos, e.position).normalize();
                                    b.velocity.copy(newDir).multiplyScalar(15);
                                    b.position.copy(e.position).add(newDir.multiplyScalar(1.0));
                                } else {
                                    b.active = false;
                                }
                            } else if (b.pierce && b.pierce > 0) {
                                b.pierce--;
                                if (b.pierce <= 0) b.active = false;
                            } else {
                                b.active = false;
                            }
                        }
                    }
                }


                // Visuals
                if (b.type === 'AXE') {
                     dummy.rotation.set(0, time * 25, 0); 
                     dummy.scale.set(2.5, 2.5, 2.5); 
                     tempColor.set('#ef4444');
                } else if (b.type === 'MAGIC') {
                     dummy.rotation.set(time, time, time);
                     dummy.scale.set(2, 2, 2); 
                     tempColor.set(COLORS.bulletPlayer);
                } else if (b.type === 'ICE') {
                     dummy.rotation.set(time, 0, time);
                     dummy.scale.set(1.5, 1.5, 1.5);
                     tempColor.set('#a5f3fc');
                } else if (b.type === 'BLACKHOLE') {
                     dummy.rotation.set(time*5, time*2, 0);
                     dummy.scale.set(8, 8, 8); 
                     tempColor.set('#000000'); 
                } else if (b.type === 'STORM') {
                     dummy.rotation.set(0, b.rotation || 0, 0);
                     dummy.scale.set(5, 5, 5); 
                     tempColor.set('#818cf8'); 
                } else if (b.type === 'FIREBALL') {
                     dummy.rotation.set(time*2, time*2, time*2);
                     dummy.scale.set(12, 12, 12); 
                     tempColor.set('#ff0000'); 
                } else if (b.type === 'FIRE_TRAIL') {
                     dummy.rotation.set(0, time, 0);
                     dummy.scale.set(12, 0.2, 12); 
                     tempColor.set('#f97316'); 
                } else if (b.type === 'PIERCING_ARROW') {
                     const lookAtPos = b.position.clone().add(b.velocity);
                     dummy.lookAt(lookAtPos);
                     dummy.scale.set(6, 6, 15); 
                     tempColor.set('#0ea5e9');
                } else if (b.type === 'POISON_ARROW') {
                     const lookAtPos = b.position.clone().add(b.velocity);
                     dummy.lookAt(lookAtPos);
                     dummy.scale.set(3, 3, 3);
                     tempColor.set('#ef4444');
                } else if (b.type === 'STUN_ARROW') {
                     const lookAtPos = b.position.clone().add(b.velocity);
                     dummy.lookAt(lookAtPos);
                     dummy.scale.set(3, 3, 3);
                     tempColor.set('#0ea5e9');
                } else if (b.type === 'METEOR') {
                     dummy.rotation.set(b.rotation || 0, (b.rotation || 0) * 0.5, b.rotation || 0);
                     dummy.scale.set(12, 12, 12);
                     tempColor.set('#8B4513');
                } else {
                     const lookAtPos = b.position.clone().add(b.velocity);
                     dummy.lookAt(lookAtPos);
                     dummy.scale.set(1, 1, 1);
                     tempColor.set('#22c55e');
                }
            }
        } else {
            dummy.position.set(0, -100, 0);
            dummy.scale.set(0, 0, 0);
        }
        
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  const onGeometryUpdate = (geo: BufferGeometry) => {
      if ((projectileType === 'ARROW' || projectileType === 'PIERCING_ARROW' || projectileType === 'POISON_ARROW' || projectileType === 'STUN_ARROW') && geo) {
          geo.rotateX(Math.PI / 2); 
      }
  };

  return (
    <instancedMesh key={projectileType} ref={meshRef} args={[undefined, undefined, MAX_BULLETS]} frustumCulled={false}>
      {(projectileType?.includes('ARROW')) && <cylinderGeometry args={[0.05, 0.05, 1.5, 6]} ref={onGeometryUpdate} />}
      {projectileType === 'AXE' && <boxGeometry args={[1, 0.1, 1]} />}
      {projectileType === 'STORM' && <coneGeometry args={[0.5, 2, 8, 1, true]} />}
      {projectileType === 'METEOR' && <sphereGeometry args={[0.6, 16, 16]} />}
      {projectileType === 'BLACKHOLE' && <sphereGeometry args={[0.8, 16, 16]} />}
      {(!projectileType?.includes('ARROW') && projectileType !== 'AXE' && projectileType !== 'STORM' && projectileType !== 'METEOR' && projectileType !== 'BLACKHOLE') && <dodecahedronGeometry args={[0.3, 0]} />} 
      
      <meshStandardMaterial
        vertexColors
        color={projectileType === 'BLACKHOLE' ? '#000000' : (projectileType === 'METEOR' ? '#8B4513' : undefined)}
        emissive={projectileType === 'METEOR' ? '#FF6B35' : (projectileType === 'MAGIC' || projectileType === 'FIRE_TRAIL' || projectileType === 'PIERCING_ARROW' ? (projectileType === 'PIERCING_ARROW' ? '#0ea5e9' : COLORS.bulletPlayer) : '#000')}
        emissiveIntensity={projectileType === 'METEOR' ? 0.8 : (projectileType === 'BLACKHOLE' ? 0 : (projectileType === 'MAGIC' || projectileType === 'FIRE_TRAIL' || projectileType === 'PIERCING_ARROW' ? 2 : 0))}
        transparent={true}
        opacity={projectileType === 'BLACKHOLE' ? 1.0 : (projectileType === 'METEOR' ? 0.95 : (projectileType === 'STORM' ? 0.5 : (projectileType === 'MAGIC' || projectileType === 'FIRE_TRAIL' ? 0.6 : 1.0)))}
        depthWrite={projectileType !== 'STORM'}
        side={projectileType === 'STORM' ? 2 : 0}
      />
    </instancedMesh>
  );
};
