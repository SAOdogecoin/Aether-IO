import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Mesh, InstancedMesh } from 'three';
import { useGameStore } from '../store';
import { COLORS } from '../constants';

export const Pet: React.FC = () => {
  const meshRef = useRef<Mesh>(null);
  const { equipment, playerPosition, heal } = useGameStore();
  const { scene } = useThree();
  const pet = equipment.pet;
  const currentPos = useRef(new Vector3(0, 1, 0));
  
  const skillTimer = useRef(0);

  useFrame((state, delta) => {
    if (!pet || !meshRef.current) return;

    // Follow logic
    const targetPos = new Vector3(
        playerPosition.x - 1.5, // Follow slightly behind/left
        1.0 + Math.sin(state.clock.elapsedTime * 4) * 0.2, // Bobbing
        playerPosition.z + 1.5
    );

    // Smooth Lerp
    currentPos.current.lerp(targetPos, delta * 3);
    meshRef.current.position.copy(currentPos.current);
    meshRef.current.lookAt(playerPosition.x, 1, playerPosition.z);
    
    // Rotate slightly
    meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 5) * 0.1;

    // --- PET SKILL LOGIC ---
    if (pet.petSkill) {
        skillTimer.current += delta;
        
        // HEAL LOGIC
        if (pet.petSkill === 'HEAL') {
            const cooldown = pet.petCooldown || 10;
            if (skillTimer.current > cooldown) {
                skillTimer.current = 0;
                const healAmt = pet.petValue || 10;
                heal(healAmt);
                
                // Visual Heal Indicator (reuse damage text system if possible or just log for now)
                // For now, we rely on the HP bar going up.
            }
        } 
        // ATTACK LOGIC (MELEE)
        else if (pet.petSkill === 'ATTACK_MELEE') {
            // Attack every 2 seconds roughly
            if (skillTimer.current > 2.0) {
                skillTimer.current = 0;
                
                const enemiesMesh = scene.getObjectByName("EnemyMesh") as InstancedMesh;
                if (enemiesMesh && enemiesMesh.userData.enemies) {
                    const enemies = enemiesMesh.userData.enemies;
                    for(const e of enemies) {
                        if (e.active && e.position.distanceTo(currentPos.current) < 3.0) {
                            const dmg = pet.petValue || 10;
                            e.health -= dmg;
                            window.dispatchEvent(new CustomEvent('damage', { 
                                detail: { position: e.position, damage: dmg, isCrit: false, damageType: 'PHYSICAL', isPlayer: false } // isPlayer: false to avoid red text? Actually red text is fine for pet too or add pet specific color later
                            }));
                            // Only hit one enemy per swing for melee pet? Or AOE? Let's do single target for now or small AOE
                            break; // Single target
                        }
                    }
                }
            }
        }
        // ATTACK LOGIC (RANGED) - Not implementing Bullet System spawn here to avoid complexity, 
        // but simulate a hit scan or simple effect
        else if (pet.petSkill === 'ATTACK_RANGED') {
             if (skillTimer.current > 3.0) {
                skillTimer.current = 0;
                
                // Find nearest enemy
                const enemiesMesh = scene.getObjectByName("EnemyMesh") as InstancedMesh;
                if (enemiesMesh && enemiesMesh.userData.enemies) {
                    const enemies = enemiesMesh.userData.enemies;
                    let target = null;
                    let minDist = 20;
                    for(const e of enemies) {
                        if (e.active) {
                            const d = e.position.distanceTo(currentPos.current);
                            if (d < minDist) {
                                minDist = d;
                                target = e;
                            }
                        }
                    }
                    
                    if (target) {
                        const dmg = pet.petValue || 20;
                        target.health -= dmg;
                        window.dispatchEvent(new CustomEvent('damage', { 
                            detail: { position: target.position, damage: dmg, isCrit: true, damageType: 'FIRE' } 
                        }));
                    }
                }
             }
        }
    }
  });

  if (!pet) return null;

  let color = '#a3e635'; // Blob Green
  if (pet.id.includes('bat')) color = '#a855f7';
  if (pet.id.includes('wolf')) color = '#60a5fa';
  if (pet.id.includes('fairy')) color = '#f472b6';
  if (pet.id.includes('dragon')) color = '#fbbf24';

  return (
      <group>
        <mesh ref={meshRef} castShadow>
             {pet.id.includes('dragon') ? (
                 // Dragon Shape
                 <dodecahedronGeometry args={[0.5, 0]} />
             ) : pet.id.includes('fairy') ? (
                 // Fairy Shape
                 <octahedronGeometry args={[0.3, 0]} />
             ) : (
                 // Default Blob/Shape
                 <sphereGeometry args={[0.4, 8, 8]} />
             )}
             <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.2} />
        </mesh>
      </group>
  );
};