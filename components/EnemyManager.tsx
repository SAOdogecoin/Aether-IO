
import React, { useRef, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Vector3, Color } from 'three';
import { useGameStore } from '../store';
import { ARENA_SIZE, COLORS } from '../constants';
import { GameStatus, EnemyData, BulletData } from '../types';
import { SpatialHashGrid } from '../utils/SpatialHashGrid';
import { ASSET_FLAGS } from '../assetConfig';
import { NearbyEnemies } from './EnemyModels';

const MAX_ENEMIES = 400;

const dummy = new Object3D();
const tempVec = new Vector3();
const tempColor = new Color();
const pushDir = new Vector3();

interface EnemyManagerProps {
  bulletsDataRef: React.MutableRefObject<BulletData[]>;
  enemyBulletsDataRef: React.MutableRefObject<BulletData[]>;
  enemiesDataRef: React.MutableRefObject<EnemyData[]>;
  spatialGrid: React.MutableRefObject<SpatialHashGrid>;
}

export const EnemyManager: React.FC<EnemyManagerProps> = ({ bulletsDataRef, enemyBulletsDataRef, enemiesDataRef, spatialGrid }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const stunIconsRef = useRef<InstancedMesh>(null);
  const playerPositionRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const { playerPosition, addScore, takeDamage, status, level, stats, spawnDrop, wave, waveTimer, advanceWave, addNotification, setBossData, earthwall, updateMinimapEnemies, obstacles } = useGameStore();

  const enemies = enemiesDataRef;

  const spawnTimer = useRef(0);
  const dotTicker = useRef(0);
  const waveState = useRef({ wave: 1, bossSpawned: false, eliteSpawned: false });
  const minimapThrottle = useRef(0); 

  useEffect(() => {
    const handleBarrier = (e: CustomEvent) => {
        const { position, radius, force } = e.detail;
        enemies.current.forEach(enemy => {
            if (enemy.active) {
                const dist = enemy.position.distanceTo(position);
                if (dist < radius) {
                    const dir = new Vector3().subVectors(enemy.position, position).normalize();
                    enemy.position.add(dir.multiplyScalar(force));
                    // 2x Stun Duration (1.0s)
                    enemy.freezeTimer = 1.0;
                }
            }
        });
    };
    window.addEventListener('barrier-trigger', handleBarrier as EventListener);
    return () => window.removeEventListener('barrier-trigger', handleBarrier as EventListener);
  }, []);

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;
    if (!meshRef.current) return;

    playerPositionRef.current.x = playerPosition.x;
    playerPositionRef.current.z = playerPosition.z;

    spatialGrid.current.clear();
    const activeBullets = bulletsDataRef.current;
    
    activeBullets.forEach(b => { 
        if(b.active && b.type === 'BLACKHOLE') {
            b.currentPullCount = 0; 
        }
    });

    if (!meshRef.current.userData.enemies) {
        meshRef.current.userData.enemies = enemies.current;
    }

    // New Wave Logic: Fight for 30s, Wait for 10s, Advance at 40s
    if (waveTimer > 40) {
        advanceWave();
    }
    
    if (wave !== waveState.current.wave) {
        waveState.current.wave = wave;
        waveState.current.bossSpawned = false;
        waveState.current.eliteSpawned = false;
    }

    spawnTimer.current += delta;
    // 50% Slower Spawn Rate (doubled the base threshold value)
    const spawnRate = Math.max(0.1, 1.6 - (level * 0.04) - (wave * 0.1));
    
    // Only spawn enemies if waveTimer is less than 30 seconds
    if (waveTimer < 30 && spawnTimer.current > spawnRate) {
        spawnTimer.current = 0;
        const enemy = enemies.current.find(e => !e.active);
        if (enemy) {
            enemy.active = true;
            enemy.burnTimer = 0;
            enemy.poisonTimer = 0;
            enemy.freezeTimer = 0;
            enemy.slowTimer = 0;
            enemy.slowFactor = 0;
            enemy.bossPattern = 0;
            enemy.bossTimer = 0;
            enemy.bossAngle = 0;

            let angle, dist, spawnPos;
            do {
                angle = Math.random() * Math.PI * 2;
                dist = (ARENA_SIZE / 2) - 5;
                spawnPos = new Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
            } while (spawnPos.distanceTo(playerPosition) < 20);

            enemy.position.copy(spawnPos);
            
            const hpMult = 1 + (wave * 0.5) + (level * 0.1);
            const speedMult = 1 + (wave * 0.025);
            const globalHpReduction = 0.4;
            const r = Math.random();
            
            let isBoss = false;
            
            if (wave % 10 === 0 && !waveState.current.bossSpawned) {
                isBoss = true;
                waveState.current.bossSpawned = true;
                const bossName = wave % 20 === 0 ? "VOID REAPER" : "ABYSS LORD";
                addNotification(`⚠️ ${bossName} APPEARED ⚠️`, COLORS.enemyBoss, 'BOSS');
                setBossData({ active: true, name: bossName, hp: 1, maxHp: 1 });
                
                enemy.type = 2; 
                enemy.health = (2000 + (level * 250) + (wave * 100)) * hpMult * globalHpReduction * 0.8;
                enemy.speed = (2.5 + (level * 0.1)) * speedMult;
                enemy.radius = 2.5;
                enemy.scale = 3.0; 
                setBossData({ hp: enemy.health, maxHp: enemy.health });

            } else {
                // Elite Logic: Start Wave 5, every 3 waves (5, 8, 11, 14...)
                const eliteWaveActive = wave >= 5 && (wave - 5) % 3 === 0;
                
                if (eliteWaveActive && !waveState.current.eliteSpawned) {
                     waveState.current.eliteSpawned = true;
                     addNotification("⚠️ ELITE SQUAD", COLORS.enemyElite, 'BOSS');
                }

                // Increase Elite spawn chance during elite waves
                const isElite = eliteWaveActive && (r < 0.15 || !waveState.current.eliteSpawned); // Force at least one if none spawned? No, just high chance.

                if (isElite) {
                    if (Math.random() > 0.7) {
                        enemy.type = 5; 
                        enemy.health = (120 + (level * 15)) * hpMult * globalHpReduction;
                        enemy.speed = (3.5 + (level * 0.1)) * speedMult;
                        enemy.radius = 1.8;
                        enemy.scale = 1.6;
                    } else {
                        enemy.type = 1; 
                        enemy.health = (150 + (level * 20)) * hpMult * globalHpReduction;
                        enemy.speed = (4 + (level * 0.1)) * speedMult;
                        enemy.radius = 1.5;
                        enemy.scale = 1.5; 
                    }
                } 
                else if (wave >= 3 && r > 0.925) { 
                    if (Math.random() > 0.5) {
                        enemy.type = 3; 
                        enemy.health = (15 + (level * 5)) * hpMult * globalHpReduction;
                        enemy.speed = 3.0 * speedMult;
                        enemy.radius = 0.8;
                        enemy.scale = 1.0; 
                    } else {
                        enemy.type = 6;
                        enemy.health = (20 + (level * 6)) * hpMult * globalHpReduction;
                        enemy.speed = 2.0 * speedMult;
                        enemy.radius = 0.8;
                        enemy.scale = 1.1;
                    }
                } 
                else if (wave >= 2 && r > 0.85) { 
                    enemy.type = 4;
                    const baseHp = (10 + (level * 4)) * hpMult * globalHpReduction;
                    enemy.health = baseHp * 0.5;
                    const baseSpeed = (4 + (level * 0.15)) * speedMult;
                    enemy.speed = baseSpeed * 2.0;
                    enemy.radius = 0.6;
                    enemy.scale = 0.8;
                }
                else {
                    enemy.type = 0; 
                    enemy.health = (10 + (level * 4)) * hpMult * globalHpReduction;
                    enemy.speed = (4 + (level * 0.15)) * speedMult;
                    enemy.radius = 0.6;
                    enemy.scale = 1.0;
                }
            }
            enemy.maxHealth = enemy.health;
        }
    }

    dotTicker.current += delta;
    const shouldTickDoT = dotTicker.current > 0.5;
    if (shouldTickDoT) dotTicker.current = 0;

    const time = state.clock.getElapsedTime();

    for (let i = 0; i < MAX_ENEMIES; i++) {
        const e = (enemies.current || [])[i];
        if (e && e.active && e.position) {
            spatialGrid.current.add(i, e.position.x, e.position.z);

            const distToPlayer = e.position.distanceTo(playerPosition);
            let currentSpeed = e.speed;
            let canMove = true;

            if (e.type === 2) {
                 const currentBossData = useGameStore.getState().bossData;
                 if (currentBossData && Math.abs(currentBossData.hp - e.health) > 5) {
                     setBossData({ hp: e.health });
                 }
            }

            if (e.burnTimer && e.burnTimer > 0) {
                e.burnTimer -= delta;
                if (shouldTickDoT) {
                    const dmg = (e.burnDamage || 5) * 0.5;
                    e.health -= dmg;
                    window.dispatchEvent(new CustomEvent('damage', { detail: { position: e.position, damage: dmg, isDoT: true, damageType: 'FIRE' } }));
                }
            }
            if (e.poisonTimer && e.poisonTimer > 0) {
                e.poisonTimer -= delta;
                if (shouldTickDoT) {
                    const dmg = (e.poisonDamage || 3) * 0.5;
                    e.health -= dmg;
                    window.dispatchEvent(new CustomEvent('damage', { detail: { position: e.position, damage: dmg, isDoT: true, damageType: 'POISON' } }));
                }
            }

            if (e.freezeTimer && e.freezeTimer > 0) {
                e.freezeTimer -= delta;
                canMove = false;
                if (stunIconsRef.current && e.position) {
                    dummy.position.set(e.position.x, e.position.y + (e.scale * 1.8) + 0.5, e.position.z); 
                    dummy.rotation.set(time * 5, time * 3, 0);
                    dummy.scale.set(0.5, 0.5, 0.5);
                    dummy.updateMatrix();
                    stunIconsRef.current.setMatrixAt(i, dummy.matrix);
                } 
            } else {
                if (stunIconsRef.current) {
                    dummy.position.set(0, -100, 0);
                    dummy.updateMatrix();
                    stunIconsRef.current.setMatrixAt(i, dummy.matrix);
                }
            }

            if (e.slowTimer && e.slowTimer > 0) {
                e.slowTimer -= delta;
                currentSpeed *= (1 - (e.slowFactor || 0.5));
            }

            if (e.freezeTimer && e.freezeTimer > 0) tempColor.set('#3b82f6');
            else if (e.burnTimer && e.burnTimer > 0) tempColor.set('#ef4444');
            else {
                if (e.type === 2) tempColor.set(COLORS.enemyBoss);
                else if (e.type === 3) tempColor.set(COLORS.enemyShooter);
                else if (e.type === 4) tempColor.set(COLORS.enemySpeedy); 
                else if (e.type === 5) tempColor.set(COLORS.enemyEliteShooter); 
                else if (e.type === 6) tempColor.set(COLORS.enemySlowShooter); 
                else if (e.type === 1) {
                     if (e.scale > 1.4) tempColor.set(COLORS.enemyElite);
                     else tempColor.set(COLORS.enemyOrc);
                }
                else tempColor.set(COLORS.enemySlime);

                if (e.poisonTimer && e.poisonTimer > 0) tempColor.lerp(new Color('#4ade80'), 0.5);
            }

            meshRef.current.setColorAt(i, tempColor);
            
            if (canMove) {
                let moved = false;
                for(let b=0; b < activeBullets.length; b++) {
                    const bullet = activeBullets[b];
                    if (bullet.active && bullet.type === 'BLACKHOLE') {
                        const max = bullet.maxPullCount || 8;
                        const current = bullet.currentPullCount || 0;
                        if (current < max && e.position.distanceTo(bullet.position) < 15.0) {
                            pushDir.subVectors(bullet.position, e.position).normalize();
                            e.position.add(pushDir.multiplyScalar(currentSpeed * 2.0 * delta));
                            moved = true;
                            bullet.currentPullCount = current + 1;
                        }
                    }
                }
                if (earthwall.active) {
                    const distToWall = e.position.distanceTo(earthwall.position);
                    if (distToWall < earthwall.radius + e.radius) {
                        pushDir.subVectors(e.position, earthwall.position).normalize();
                        if (pushDir.lengthSq() === 0) pushDir.set(1, 0, 0);
                        e.position.copy(earthwall.position).add(pushDir.multiplyScalar(earthwall.radius + e.radius));
                        moved = true; 
                    }
                }

                if (!moved) {
                    const nextPos = e.position.clone();
                    if ((e.type === 3 || e.type === 5 || e.type === 6) && distToPlayer > 15) { 
                         tempVec.subVectors(playerPosition, e.position).normalize();
                         nextPos.add(tempVec.multiplyScalar(currentSpeed * delta));
                    } else if (e.type === 2 && distToPlayer > 10) { 
                         tempVec.subVectors(playerPosition, e.position).normalize();
                         nextPos.add(tempVec.multiplyScalar(currentSpeed * delta));
                    } else if (e.type !== 3 && e.type !== 5 && e.type !== 6 && e.type !== 2) {
                         tempVec.subVectors(playerPosition, e.position).normalize();
                         nextPos.add(tempVec.multiplyScalar(currentSpeed * delta));
                    }

                    for(const obs of obstacles) {
                        const distToObs = nextPos.distanceTo(obs.position);
                        const minDist = obs.radius + e.radius;
                        if (distToObs < minDist) {
                            pushDir.subVectors(nextPos, obs.position).normalize();
                            nextPos.copy(obs.position).add(pushDir.multiplyScalar(minDist));
                        }
                    }
                    e.position.copy(nextPos);
                }

                // Clamp enemies to arena boundary so they don't escape into the void
                const ex = e.position.x, ez = e.position.z;
                const d2 = ex * ex + ez * ez;
                const elim = (ARENA_SIZE / 2) - 4; // 56 — just outside tree ring
                if (d2 > elim * elim) {
                    const s = elim / Math.sqrt(d2);
                    e.position.x *= s;
                    e.position.z *= s;
                }
            }

            e.stateTimer = (e.stateTimer || 0) + delta;

            if (e.type === 2 && canMove) {
                e.bossTimer = (e.bossTimer || 0) + delta;
                if (e.bossTimer > 5.0) {
                    e.bossTimer = 0;
                    e.bossPattern = ((e.bossPattern || 0) + 1) % 3;
                }

                const pattern = e.bossPattern || 0;

                if (pattern === 0) {
                    if (e.stateTimer > 0.05) { 
                        e.stateTimer = 0;
                        e.bossAngle = (e.bossAngle || 0) + 0.3;
                        const bullet = enemyBulletsDataRef.current.find(b => !b.active);
                        if (bullet) {
                            bullet.active = true;
                            bullet.lifetime = 4.0;
                            bullet.damage = 15; 
                            bullet.position.copy(e.position).add(new Vector3(0, 1.5, 0));
                            bullet.velocity.set(Math.cos(e.bossAngle), 0, Math.sin(e.bossAngle)).multiplyScalar(10);
                        }
                    }
                } 
                else if (pattern === 1) {
                     if (e.stateTimer > 0.8) {
                        e.stateTimer = 0;
                        for(let k=0; k<12; k++) {
                            const bullet = enemyBulletsDataRef.current.find(b => !b.active);
                            if (bullet) {
                                bullet.active = true;
                                bullet.lifetime = 4.0;
                                bullet.damage = 15;
                                bullet.position.copy(e.position).add(new Vector3(0, 1.5, 0));
                                const a = (Math.PI * 2 * k) / 12;
                                bullet.velocity.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(8);
                            }
                        }
                     }
                }
                else if (pattern === 2) {
                    if (e.stateTimer > 0.15) {
                        e.stateTimer = 0;
                        const bullet = enemyBulletsDataRef.current.find(b => !b.active);
                        if (bullet) {
                            bullet.active = true;
                            bullet.lifetime = 4.0;
                            bullet.damage = 20; 
                            bullet.position.copy(e.position).add(new Vector3(0, 1.5, 0));
                            
                            tempVec.subVectors(playerPosition, e.position).normalize();
                            const spread = (Math.random() - 0.5) * 0.3;
                            tempVec.applyAxisAngle(new Vector3(0,1,0), spread);
                            bullet.velocity.copy(tempVec).multiplyScalar(14);
                        }
                    }
                }
            }
            else if ((e.type === 3 || e.type === 5 || e.type === 6) && canMove) {
                const fireRate = e.type === 5 ? 1.5 : (e.type === 6 ? 3.0 : 2.0); 
                
                if (e.stateTimer > fireRate && distToPlayer < 25) {
                    e.stateTimer = 0;

                    if (e.type === 5) {
                        const baseDir = new Vector3().subVectors(playerPosition, e.position).normalize();
                        for(let k=-1; k<=1; k++) {
                             const bullet = enemyBulletsDataRef.current.find(b => !b.active);
                             if (bullet) {
                                bullet.active = true;
                                bullet.lifetime = 3.0;
                                bullet.damage = 10;
                                bullet.position.copy(e.position).add(new Vector3(0, 1, 0));
                                const dir = baseDir.clone().applyAxisAngle(new Vector3(0,1,0), k * 0.3);
                                bullet.velocity.copy(dir).multiplyScalar(12);
                             }
                        }
                    }
                    else if (e.type === 6) {
                        const bullet = enemyBulletsDataRef.current.find(b => !b.active);
                        if (bullet) {
                            bullet.active = true;
                            bullet.lifetime = 6.0; 
                            bullet.damage = 5; 
                            bullet.position.copy(e.position).add(new Vector3(0, 1, 0));
                            pushDir.subVectors(playerPosition, e.position).normalize();
                            bullet.velocity.copy(pushDir).multiplyScalar(6); 
                        }
                    }
                    else {
                        const bullet = enemyBulletsDataRef.current.find(b => !b.active);
                        if (bullet) {
                            bullet.active = true;
                            bullet.lifetime = 3.0;
                            bullet.damage = 10;
                            bullet.position.copy(e.position).add(new Vector3(0, 1, 0));
                            pushDir.subVectors(playerPosition, e.position).normalize();
                            bullet.velocity.copy(pushDir).multiplyScalar(15);
                        }
                    }
                }
            }
            
            if (e.type !== 3 && e.type !== 5 && e.type !== 6 && distToPlayer < e.radius + 0.5 && canMove) {
                const dmg = (e.type === 2 ? 30 : 10) * (1 + wave * 0.1); 
                takeDamage(dmg * delta);
            }

            if (e.health <= 0) {
                e.active = false;
                
                let goldDrops = 0;
                if (e.type === 2) goldDrops = 10; 
                else if (e.type === 1 || e.type === 5) goldDrops = 3; 
                else if (Math.random() < 0.5) goldDrops = 1; 

                for(let g=0; g<goldDrops; g++) {
                    const offset = tempVec.set((Math.random()-0.5), 0, (Math.random()-0.5));
                    spawnDrop(e.position.clone().add(offset), 'GOLD', 10);
                }

                addScore(0); 
                
                if (e.type === 2) { 
                    setBossData({ active: false });
                    const roll = Math.random();
                    let dropped = false;
                    if (wave >= 60 && roll < Math.min(0.20, (wave - 50) * 0.01)) { spawnDrop(e.position, 'ITEM', 0, 'MYTHIC'); dropped = true; }
                    if (!dropped && wave >= 30 && Math.random() < Math.min(0.50, (wave - 20) * 0.02)) { spawnDrop(e.position, 'ITEM', 0, 'LEGENDARY'); dropped = true; }
                    if (!dropped) spawnDrop(e.position, 'ITEM', 0, 'EPIC');
                    spawnDrop(e.position.clone().add(tempVec.set(1,0,0)), 'XP', 1000); 
                } 
                else if (e.type === 1 || e.type === 5) { 
                     if (Math.random() > 0.5) spawnDrop(e.position, 'ITEM', 0); 
                     for(let k=0; k<5; k++) {
                         const offset = tempVec.set((Math.random()-0.5)*2, 0, (Math.random()-0.5)*2);
                         spawnDrop(e.position.clone().add(offset), 'XP', 100);
                     }
                }
                else {
                    if (Math.random() > 0.90) spawnDrop(e.position, 'ITEM', 0);
                    else spawnDrop(e.position, 'XP', e.type >= 3 ? 30 : 20);
                }
                dummy.position.set(0, -100, 0);
                if (stunIconsRef.current) stunIconsRef.current.setMatrixAt(i, dummy.matrix);
            } else {
                dummy.position.copy(e.position);
                const aestheticHeight = 2.0; 
                const aestheticWidth = 0.6;
                
                if (e.type === 0 && e.scale < 0.9) {
                    dummy.scale.set(e.scale, e.scale * 0.5, e.scale); 
                } else {
                    dummy.scale.set(e.scale * aestheticWidth, e.scale * aestheticHeight, e.scale * aestheticWidth);
                }

                const totalHeight = 1.0 * dummy.scale.y;
                if (e.type !== 2) {
                    const bob = Math.abs(Math.sin(state.clock.elapsedTime * 5 + i)) * 0.2;
                    dummy.position.y = (totalHeight / 2) + bob;
                } else {
                    dummy.position.y = totalHeight / 2;
                }
                dummy.lookAt(playerPosition);
            }
        } else {
            dummy.position.set(0, -100, 0);
            if (stunIconsRef.current) stunIconsRef.current.setMatrixAt(i, dummy.matrix);
        }

        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    if (stunIconsRef.current) stunIconsRef.current.instanceMatrix.needsUpdate = true;

    minimapThrottle.current += 1;
    if (minimapThrottle.current > 10) {
        minimapThrottle.current = 0;
        const activeEnemies = (enemies.current || []).filter(e => e && e.active).map(e => ({ x: e.position.x, z: e.position.z, type: e.type }));
        updateMinimapEnemies(activeEnemies);
    }
  });

  return (
    <>
        {/* Keep instanced meshes for game logic (collision etc.) but hide
            visually when 3D models are active */}
        <instancedMesh
          ref={meshRef}
          args={[undefined, undefined, MAX_ENEMIES]}
          frustumCulled={false}
          visible={!ASSET_FLAGS.useEnemyModels}
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial vertexColors roughness={0.5} metalness={0.2} />
        </instancedMesh>
        <instancedMesh
          ref={stunIconsRef}
          args={[undefined, undefined, MAX_ENEMIES]}
          frustumCulled={false}
          visible={!ASSET_FLAGS.useEnemyModels}
        >
            <torusGeometry args={[0.5, 0.1, 8, 16]} />
            <meshBasicMaterial color="#facc15" />
        </instancedMesh>

        {ASSET_FLAGS.useEnemyModels && (
          <Suspense fallback={null}>
            <NearbyEnemies
              enemiesDataRef={enemiesDataRef}
              playerPositionRef={playerPositionRef}
            />
          </Suspense>
        )}
    </>
  );
};
