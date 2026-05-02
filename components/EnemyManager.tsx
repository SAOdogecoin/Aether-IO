
import React, { useRef, useEffect, useState, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Vector3, Color } from 'three';
import { useGameStore } from '../store';
import { ARENA_SIZE, COLORS } from '../constants';
import { GameStatus, EnemyData, BulletData } from '../types';
import { SpatialHashGrid } from '../utils/SpatialHashGrid';
import { ASSET_FLAGS } from '../assetConfig';
import { Html } from '@react-three/drei';
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
  const { playerPosition, addScore, takeDamage, status, level, stats, spawnDrop, wave, waveTimer, advanceWave, addNotification, setBossData, earthwall, updateMinimapEnemies, obstacles, bossData, activatePortal, portalActive, updateActiveEnemyCount, stage, stageWaveIndex, stageTotalWaves, stageEnemiesKilled, stageTotalEnemies, recordEnemyKill } = useGameStore();

  const enemies = enemiesDataRef;

  const spawnTimer = useRef(0);
  const dotTicker = useRef(0);
  const waveState = useRef({
      stage: 0,
      waveIndex: -1,
      normalSpawned: 0,
      eliteSpawned: 0,
      normalMageSpawned: 0,
      eliteMageSpawned: 0,
      normalTarget: 0,
      eliteTarget: 0,
      normalMageTarget: 0,
      eliteMageTarget: 0
  });
  const bossActiveRef = useRef(false);
  const bossDefeatedTimer = useRef(0);
  const minimapThrottle = useRef(0);
  const waveAdvancedRef = useRef(false);
  const [stunnedEnemies, setStunnedEnemies] = useState<Array<{id: number; x: number; y: number; z: number}>>([]);
  const [statusEffects, setStatusEffects] = useState<Array<{id: number; x: number; y: number; z: number; effects: string[]}>>([]);
  const stunnedUpdateTimer = useRef(0); 

  useEffect(() => {
    const handleBarrier = (e: CustomEvent) => {
        const { position, radius, force, damage } = e.detail;
        enemies.current.forEach(enemy => {
            if (enemy.active) {
                const dist = enemy.position.distanceTo(position);
                if (dist < radius) {
                    const dir = new Vector3().subVectors(enemy.position, position).normalize();
                    enemy.position.add(dir.multiplyScalar(force));
                    // 2x Stun Duration (1.0s)
                    enemy.freezeTimer = 1.0;
                    if (damage > 0) {
                        enemy.health -= damage;
                        window.dispatchEvent(new CustomEvent('damage', {
                            detail: { position: enemy.position, damage: damage, isCrit: false, damageType: 'MAGIC' }
                        }));
                    }
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

    // Portal appears when all stage enemies defeated
    const activeEnemyCount = (enemies.current || []).filter(e => e && e.active).length;
    const allStageEnemiesKilled = stageEnemiesKilled >= stageTotalEnemies;
    if (activeEnemyCount === 0 && allStageEnemiesKilled && !bossData.active && !portalActive && waveTimer > 0.5) {
        activatePortal(playerPosition);
    }

    // Boss defeat countdown: 5 seconds before next wave
    if (bossActiveRef.current && !bossData.active) {
        // Boss just died
        bossDefeatedTimer.current += delta;
        if (bossDefeatedTimer.current >= 5.0) {
            bossDefeatedTimer.current = 0;
            advanceWave();
        }
    }

    // Initialize wave for new stage
    if (stage !== waveState.current.stage || stageWaveIndex !== waveState.current.waveIndex) {
        waveState.current.stage = stage;
        waveState.current.waveIndex = stageWaveIndex;
        waveState.current.normalSpawned = 0;
        waveState.current.eliteSpawned = 0;
        waveState.current.normalMageSpawned = 0;
        waveState.current.eliteMageSpawned = 0;
        waveAdvancedRef.current = false;

        // Get wave composition from store
        const stageData = useGameStore.getState();
        const stageSpec = stageData.stage === 1 ? {
            totalWaves: 3,
            waves: [
                { normalEnemies: 4, eliteEnemies: 0, normalMages: 1, eliteMages: 0 },
                { normalEnemies: 4, eliteEnemies: 0, normalMages: 1, eliteMages: 0 },
                { normalEnemies: 4, eliteEnemies: 0, normalMages: 1, eliteMages: 0 },
            ]
        } : stageData.stage === 2 ? {
            totalWaves: 4,
            waves: [
                { normalEnemies: 4, eliteEnemies: 1, normalMages: 1, eliteMages: 0 },
                { normalEnemies: 3, eliteEnemies: 2, normalMages: 0, eliteMages: 1 },
                { normalEnemies: 5, eliteEnemies: 0, normalMages: 1, eliteMages: 0 },
                { normalEnemies: 2, eliteEnemies: 3, normalMages: 0, eliteMages: 1 },
            ]
        } : stageData.stage === 3 ? {
            totalWaves: 4,
            waves: [
                { normalEnemies: 2, eliteEnemies: 3, normalMages: 0, eliteMages: 1 },
                { normalEnemies: 0, eliteEnemies: 3, normalMages: 0, eliteMages: 1 },
                { normalEnemies: 3, eliteEnemies: 2, normalMages: 1, eliteMages: 1 },
                { normalEnemies: 1, eliteEnemies: 4, normalMages: 0, eliteMages: 1 },
            ]
        } : {
            totalWaves: 4,
            waves: [
                { normalEnemies: 0, eliteEnemies: 4, normalMages: 1, eliteMages: 1 },
                { normalEnemies: 1, eliteEnemies: 3, normalMages: 0, eliteMages: 2 },
                { normalEnemies: 0, eliteEnemies: 5, normalMages: 1, eliteMages: 1 },
                { normalEnemies: 0, eliteEnemies: 4, normalMages: 0, eliteMages: 2 },
            ]
        };

        const waveComp = stageSpec.waves[stageWaveIndex] || stageSpec.waves[0];
        waveState.current.normalTarget = waveComp.normalEnemies;
        waveState.current.eliteTarget = waveComp.eliteEnemies;
        waveState.current.normalMageTarget = waveComp.normalMages;
        waveState.current.eliteMageTarget = waveComp.eliteMages;
    }

    bossActiveRef.current = bossData.active;

    // Stage-based spawning
    spawnTimer.current += delta;
    const spawnRate = 0.4; // Spawn rate in seconds
    const totalSpawned = waveState.current.normalSpawned + waveState.current.eliteSpawned +
                        waveState.current.normalMageSpawned + waveState.current.eliteMageSpawned;
    const totalTarget = waveState.current.normalTarget + waveState.current.eliteTarget +
                       waveState.current.normalMageTarget + waveState.current.eliteMageTarget;

    if (totalSpawned < totalTarget && spawnTimer.current > spawnRate) {
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

            const stageMult = 1 + (stage * 0.3);
            const hpMult = stageMult + (level * 0.1);
            const speedMult = 1 + (stage * 0.05);
            const globalHpReduction = 0.4;

            // Determine enemy type based on remaining targets
            let enemyType = 0;
            if (waveState.current.eliteMageSpawned < waveState.current.eliteMageTarget) {
                enemyType = 8; // Elite Mage
                waveState.current.eliteMageSpawned++;
            } else if (waveState.current.normalMageSpawned < waveState.current.normalMageTarget) {
                enemyType = 7; // Normal Mage
                waveState.current.normalMageSpawned++;
            } else if (waveState.current.eliteSpawned < waveState.current.eliteTarget) {
                enemyType = 1; // Elite
                waveState.current.eliteSpawned++;
            } else if (waveState.current.normalSpawned < waveState.current.normalTarget) {
                enemyType = 0; // Normal
                waveState.current.normalSpawned++;
            }

            enemy.type = enemyType;

            if (enemyType === 0) {
                // Normal Slime
                enemy.health = (10 + (level * 4)) * hpMult * globalHpReduction;
                enemy.speed = (4 + (level * 0.15)) * speedMult;
                enemy.radius = 0.6;
                enemy.scale = 1.0;
            } else if (enemyType === 1) {
                // Elite
                const isLargeElite = Math.random() > 0.5;
                enemy.health = (40 + (level * 10)) * hpMult * globalHpReduction * (isLargeElite ? 2 : 1);
                enemy.speed = (3.0 + (level * 0.1)) * speedMult;
                enemy.radius = isLargeElite ? 1.2 : 0.9;
                enemy.scale = isLargeElite ? 1.8 : 1.3;
            } else if (enemyType === 7) {
                // Normal Mage - shoots 1 projectile slowly
                enemy.health = (15 + (level * 5)) * hpMult * globalHpReduction;
                enemy.speed = (2.5 + (level * 0.1)) * speedMult;
                enemy.radius = 0.7;
                enemy.scale = 1.1;
                enemy.state = 'SHOOT';
                enemy.stateTimer = 0;
            } else if (enemyType === 8) {
                // Elite Mage - shoots 3 projectiles faster
                enemy.health = (30 + (level * 8)) * hpMult * globalHpReduction * 1.5;
                enemy.speed = (2.0 + (level * 0.1)) * speedMult;
                enemy.radius = 0.8;
                enemy.scale = 1.3;
                enemy.state = 'SHOOT';
                enemy.stateTimer = 0;
            }

            enemy.maxHealth = enemy.health;
        }
    }

    // Auto-advance wave when all enemies killed (but not last wave)
    const currentActiveEnemies = (enemies.current || []).filter(e => e && e.active).length;
    const isLastWave = stageWaveIndex >= stageTotalWaves - 1;
    if (!waveAdvancedRef.current && !isLastWave && totalSpawned === totalTarget && totalTarget > 0 && currentActiveEnemies === 0) {
        waveAdvancedRef.current = true;
        advanceWave();
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
                    const dmg = (e.burnDamage || 5) * 1.5;
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
                else if (e.type === 7) tempColor.set('#8b5cf6'); // Normal Mage - Purple
                else if (e.type === 8) tempColor.set('#d946ef'); // Elite Mage - Magenta
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
                    if ((e.type === 3 || e.type === 5 || e.type === 6 || e.type === 7 || e.type === 8) && distToPlayer > 15) {
                         tempVec.subVectors(playerPosition, e.position).normalize();
                         nextPos.add(tempVec.multiplyScalar(currentSpeed * delta));
                    } else if (e.type === 2 && distToPlayer > 10) {
                         tempVec.subVectors(playerPosition, e.position).normalize();
                         nextPos.add(tempVec.multiplyScalar(currentSpeed * delta));
                    } else if (e.type !== 3 && e.type !== 5 && e.type !== 6 && e.type !== 7 && e.type !== 8 && e.type !== 2) {
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
                // Melee attack when player is close (like normal enemies)
                if (distToPlayer < e.radius + 0.5) {
                    const dmg = 30 * (1 + wave * 0.1);
                    takeDamage(dmg * delta);
                }

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
                            bullet.damage = 30;
                            bullet.position.copy(e.position).add(new Vector3(0, 1.5, 0));
                            bullet.velocity.set(Math.cos(e.bossAngle), 0, Math.sin(e.bossAngle)).multiplyScalar(10 * 1.7);
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
                                bullet.damage = 30;
                                bullet.position.copy(e.position).add(new Vector3(0, 1.5, 0));
                                const a = (Math.PI * 2 * k) / 12;
                                bullet.velocity.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(8 * 1.7);
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
                            bullet.damage = 30;
                            bullet.position.copy(e.position).add(new Vector3(0, 1.5, 0));

                            tempVec.subVectors(playerPosition, e.position).normalize();
                            const spread = (Math.random() - 0.5) * 0.3;
                            tempVec.applyAxisAngle(new Vector3(0,1,0), spread);
                            bullet.velocity.copy(tempVec).multiplyScalar(14 * 1.7);
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
                                bullet.damage = 30;
                                bullet.position.copy(e.position).add(new Vector3(0, 1, 0));
                                const dir = baseDir.clone().applyAxisAngle(new Vector3(0,1,0), k * 0.3);
                                bullet.velocity.copy(dir).multiplyScalar(12);
                             }
                        }
                    }
                    else if (e.type === 6) {
                        // Slow shooter: 3 bullets, 50% faster
                        const baseDir6 = new Vector3().subVectors(playerPosition, e.position).normalize();
                        for (let k = -1; k <= 1; k++) {
                            const bullet = enemyBulletsDataRef.current.find(b => !b.active);
                            if (bullet) {
                                bullet.active = true;
                                bullet.lifetime = 6.0;
                                bullet.damage = 15;
                                bullet.position.copy(e.position).add(new Vector3(0, 1, 0));
                                const dir6 = baseDir6.clone().applyAxisAngle(new Vector3(0, 1, 0), k * 0.25);
                                bullet.velocity.copy(dir6).multiplyScalar(6 * 1.5);
                            }
                        }
                    }
                    else {
                        // Regular shooter (type 3): 3 bullets, 50% faster
                        const baseDir3 = new Vector3().subVectors(playerPosition, e.position).normalize();
                        for (let k = -1; k <= 1; k++) {
                            const bullet = enemyBulletsDataRef.current.find(b => !b.active);
                            if (bullet) {
                                bullet.active = true;
                                bullet.lifetime = 3.0;
                                bullet.damage = 30;
                                bullet.position.copy(e.position).add(new Vector3(0, 1, 0));
                                const dir3 = baseDir3.clone().applyAxisAngle(new Vector3(0, 1, 0), k * 0.25);
                                bullet.velocity.copy(dir3).multiplyScalar(15 * 1.5);
                            }
                        }
                    }
                }
            }
            else if ((e.type === 7 || e.type === 8) && canMove) {
                // Mage shooting
                const fireRate = e.type === 7 ? 3.0 : 1.5; // Normal mage slower, elite faster

                if (e.stateTimer > fireRate && distToPlayer < 30) {
                    e.stateTimer = 0;

                    if (e.type === 7) {
                        // Normal mage: 1 projectile
                        const bullet = enemyBulletsDataRef.current.find(b => !b.active);
                        if (bullet) {
                            bullet.active = true;
                            bullet.lifetime = 4.0;
                            bullet.damage = 20;
                            bullet.position.copy(e.position).add(new Vector3(0, 1, 0));
                            const dir = new Vector3().subVectors(playerPosition, e.position).normalize();
                            bullet.velocity.copy(dir).multiplyScalar(12);
                        }
                    } else if (e.type === 8) {
                        // Elite mage: 3 projectiles
                        const baseDir = new Vector3().subVectors(playerPosition, e.position).normalize();
                        for (let k = -1; k <= 1; k++) {
                            const bullet = enemyBulletsDataRef.current.find(b => !b.active);
                            if (bullet) {
                                bullet.active = true;
                                bullet.lifetime = 4.0;
                                bullet.damage = 25;
                                bullet.position.copy(e.position).add(new Vector3(0, 1, 0));
                                const dir = baseDir.clone().applyAxisAngle(new Vector3(0, 1, 0), k * 0.35);
                                bullet.velocity.copy(dir).multiplyScalar(14);
                            }
                        }
                    }
                }
            }

            if (e.type !== 3 && e.type !== 5 && e.type !== 6 && e.type !== 7 && e.type !== 8 && distToPlayer < e.radius + 0.5 && canMove) {
                const dmg = (e.type === 2 ? 30 : 10) * (1 + stage * 0.15);
                takeDamage(dmg * delta);
            }

            if (e.health <= 0) {
                e.active = false;
                const { addExperience } = useGameStore.getState();
                recordEnemyKill();

                let goldGained = 0;
                let xpGained = 0;

                if (e.type === 2) {
                    setBossData({ active: false });
                    goldGained = 200 + stage * 50;
                    xpGained = (200 + stage * 50) * 10;
                    addScore(goldGained);
                    addExperience(xpGained);
                    const roll = Math.random();
                    let dropped = false;
                    if (stage >= 60 && roll < Math.min(0.20, (stage - 50) * 0.01)) { spawnDrop(e.position, 'ITEM', 0, 'MYTHIC'); dropped = true; }
                    if (!dropped && stage >= 30 && Math.random() < Math.min(0.50, (stage - 20) * 0.02)) { spawnDrop(e.position, 'ITEM', 0, 'LEGENDARY'); dropped = true; }
                    if (!dropped) spawnDrop(e.position, 'ITEM', 0, 'EPIC');
                }
                else if (e.type === 1 || e.type === 5) {
                    goldGained = 50;
                    xpGained = 100 + stage * 10;
                    addScore(goldGained);
                    addExperience(xpGained);
                    if (Math.random() > 0.6) spawnDrop(e.position, 'ITEM', 0);
                }
                else if (e.type === 7 || e.type === 8) {
                    goldGained = e.type === 8 ? 30 + stage * 3 : 20 + stage * 2;
                    xpGained = e.type === 8 ? 80 + stage * 8 : 50 + stage * 5;
                    addScore(goldGained);
                    addExperience(xpGained);
                    if (Math.random() > 0.7) spawnDrop(e.position, 'ITEM', 0);
                }
                else {
                    goldGained = 10 + stage * 2;
                    xpGained = 20 + stage * 5;
                    addScore(goldGained);
                    addExperience(xpGained);
                    if (Math.random() > 0.85) spawnDrop(e.position, 'ITEM', 0);
                }

                // Floating text for XP and Gold
                window.dispatchEvent(new CustomEvent('loot-text', {
                    detail: {
                        position: e.position.clone().add(new Vector3(0, 2, 0)),
                        text: `+${goldGained}G`,
                        color: '#fbbf24'
                    }
                }));
                window.dispatchEvent(new CustomEvent('loot-text', {
                    detail: {
                        position: e.position.clone().add(new Vector3(1, 2.5, 0)),
                        text: `+${xpGained}XP`,
                        color: '#a3e635'
                    }
                }));

                // 5% chance to drop a health orb
                if (Math.random() < 0.05) {
                    spawnDrop(e.position.clone(), 'HEALTH', 0);
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

    stunnedUpdateTimer.current += delta;
    if (stunnedUpdateTimer.current > 0.1) {
        stunnedUpdateTimer.current = 0;
        const activeCount = (enemies.current || []).filter(e => e && e.active).length;
        updateActiveEnemyCount(activeCount);
        const newStatusEffects = (enemies.current || [])
            .filter(e => e && e.active && (e.freezeTimer > 0 || e.burnTimer > 0 || e.poisonTimer > 0 || e.slowTimer > 0))
            .map(e => {
                const effects: string[] = [];
                if (e.freezeTimer && e.freezeTimer > 0) effects.push('STUNNED');
                if (e.burnTimer && e.burnTimer > 0) effects.push('BURNED');
                if (e.poisonTimer && e.poisonTimer > 0) effects.push('POISONED');
                if (e.slowTimer && e.slowTimer > 0) effects.push('SLOWED');
                return { id: e.id, x: e.position.x, y: e.position.y + e.scale * 2.8, z: e.position.z, effects };
            });
        setStatusEffects(newStatusEffects);
        const newStunned = newStatusEffects.filter(e => e.effects.includes('STUNNED'));
        setStunnedEnemies(newStunned);
    }

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

        {statusEffects.map(effect => (
            <Html key={`${effect.id}-${effect.effects.join('-')}`} position={[effect.x, effect.y, effect.z]} center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                    {effect.effects.map((effectName, i) => {
                        let color = '#facc15';
                        if (effectName === 'BURNED') color = '#ef4444';
                        else if (effectName === 'POISONED') color = '#22c55e';
                        else if (effectName === 'SLOWED') color = '#3b82f6';
                        return (
                            <div key={i} style={{
                                color,
                                fontWeight: 900,
                                fontSize: 14,
                                textShadow: '0 0 6px black, 0 0 6px black',
                                whiteSpace: 'nowrap',
                                letterSpacing: 1
                            }}>
                                {effectName}
                            </div>
                        );
                    })}
                </div>
            </Html>
        ))}
    </>
  );
};
