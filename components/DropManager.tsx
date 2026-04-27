
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Color, Vector3 } from 'three';
import { Text } from '@react-three/drei';
import { useGameStore } from '../store';
import { COLORS, INVENTORY_LIMIT } from '../constants';
import { GameStatus, Item } from '../types';

const dummy = new Object3D();
const tempColor = new Color();
const tempVec = new Vector3();

interface ItemDropProps {
  id: number;
  item: Item;
  position: Vector3;
}

// Individual Component for Item Drops to support Text Labels
const ItemDrop: React.FC<ItemDropProps> = ({ id, item, position }) => {
    const meshRef = useRef<any>(null);
    const geometryRef = useRef<any>(null);
    const { playerPosition, collectDrop, stats, status, inventory, equipment } = useGameStore();
    const localPos = useRef(position.clone());
    const rotation = useRef(Math.random() * Math.PI);

    useFrame((state, delta) => {
        if (status !== GameStatus.PLAYING || !meshRef.current) return;

        // Magnet Logic (Modified for Inventory Limit)
        const distToPlayer = localPos.current.distanceTo(playerPosition);
        
        // Check if we can pick it up
        const isStackable = item.type === 'POTION' || item.type === 'CORE' || item.type === 'REVIVE';
        const hasStack = inventory.some(i => i.name === item.name);
        // Can pickup if inventory has space OR if we already have a stack of this item
        const canPickUp = inventory.length < INVENTORY_LIMIT || (isStackable && hasStack);

        // Check for Pet Collector
        let effectiveMagnetRange = stats.magnetRadius;
        if (equipment.pet && equipment.pet.petSkill === 'COLLECT') {
            effectiveMagnetRange = Math.max(stats.magnetRadius, 20);
        }

        // SNAP LOGIC: If very close, accelerate drastically to ensure pickup
        if (distToPlayer < 2.0 && canPickUp) {
             tempVec.subVectors(playerPosition, localPos.current).normalize();
             // Very high speed to snap
             localPos.current.add(tempVec.multiplyScalar(40 * delta));
        }
        else if (distToPlayer < effectiveMagnetRange && canPickUp) {
            tempVec.subVectors(playerPosition, localPos.current).normalize();
            const speed = 15 + (effectiveMagnetRange - distToPlayer) * 3;
            localPos.current.add(tempVec.multiplyScalar(speed * delta));
        }

        rotation.current += delta;
        
        // Move Group
        meshRef.current.position.copy(localPos.current);
        meshRef.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 3 + id) * 0.3;
        
        // Rotate child mesh only
        if (geometryRef.current) {
            geometryRef.current.rotation.y = rotation.current;
        }

        // Pickup Threshold increased to 2.0 to catch fast moving items
        if (distToPlayer < 2.0 && canPickUp) {
            collectDrop(id);
        }
    });

    let color = 'white'; // Default white (Common, Potions, Cores)
    let glow = false;

    // Only color Rare and up
    switch(item.rarity) {
        case 'MYTHIC': color = COLORS.rarityMythic; glow = true; break;
        case 'LEGENDARY': color = COLORS.rarityLegendary; glow = true; break;
        case 'EPIC': color = COLORS.rarityEpic; glow = true; break;
        case 'RARE': color = COLORS.rarityRare; glow = true; break;
        case 'COMMON': color = 'white'; break;
    }
    
    if (item.type === 'POTION' || item.type === 'CORE') {
        color = 'white';
        glow = false;
    }

    return (
        <group ref={meshRef} position={position}>
            {/* Rotating Item Mesh */}
            <group ref={geometryRef}>
                <mesh scale={0.6}>
                    <dodecahedronGeometry args={[1, 0]} />
                    <meshStandardMaterial color={color} emissive={glow ? color : 'black'} emissiveIntensity={glow ? 0.5 : 0} roughness={0.2} metalness={0.8} />
                </mesh>
            </group>
            
            {/* 2D Text Label - Always Straight */}
            <Text
                position={[0, 1.5, 0]}
                fontSize={0.8}
                color={color}
                outlineWidth={0.05}
                outlineColor="black"
                anchorX="center"
                anchorY="middle"
                billboard
                renderOrder={999} 
                depthTest={false} // Ensures text is drawn on top of 3D geometry if overlapping
            >
                {item.name}
            </Text>
        </group>
    )
}

export const DropManager: React.FC = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const { drops, playerPosition, collectDrop, status, stats, equipment } = useGameStore();

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING || !meshRef.current) return;

    let instanceIndex = 0;

    // Pet Collection Logic check
    let effectiveMagnetRange = stats.magnetRadius;
    if (equipment.pet && equipment.pet.petSkill === 'COLLECT') {
        effectiveMagnetRange = Math.max(stats.magnetRadius, 20);
    }

    drops.forEach((drop) => {
        // Skip items, handled by ItemDrop component
        if (drop.type === 'ITEM') return;

        // Limit simple drops rendering count for performance
        if (instanceIndex >= 200) return;

        // Magnet Logic for Instanced Drops (XP/Gold always magnetizes)
        const distToPlayer = drop.position.distanceTo(playerPosition);
        
        // Snap Logic for Orbs
        if (distToPlayer < 2.0) {
             tempVec.subVectors(playerPosition, drop.position).normalize();
             drop.position.add(tempVec.multiplyScalar(40 * delta));
        }
        else if (distToPlayer < effectiveMagnetRange) {
            tempVec.subVectors(playerPosition, drop.position).normalize();
            const speed = 15 + (effectiveMagnetRange - distToPlayer) * 3;
            drop.position.add(tempVec.multiplyScalar(speed * delta));
        }

        drop.rotation += delta;
        dummy.position.copy(drop.position);
        dummy.position.y = 1 + Math.sin(state.clock.elapsedTime * 3 + drop.id) * 0.3;
        dummy.rotation.set(0, drop.rotation, 0);

        if (drop.type === 'GOLD') {
            dummy.scale.set(0.4, 0.4, 0.4);
            tempColor.set('#fbbf24');
        } else if (drop.type === 'XP') {
            if (drop.orbMultiplier === 10) {
                dummy.scale.set(0.35, 0.35, 0.35);
                tempColor.set('#000000');
            } else {
                dummy.scale.set(0.25, 0.25, 0.25);
                tempColor.set('#ec4899');
            }
        }

        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(instanceIndex, dummy.matrix);
        meshRef.current!.setColorAt(instanceIndex, tempColor);
        
        instanceIndex++;

        // Pickup Logic
        if (distToPlayer < 2.0) {
            collectDrop(drop.id);
        }
    });

    // Hide remaining instances
    for (let i = instanceIndex; i < 200; i++) {
        dummy.position.set(0, -100, 0);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <>
        {/* Simple Drops (XP/Gold) via InstancedMesh for Performance */}
        <instancedMesh ref={meshRef} args={[undefined, undefined, 200]} frustumCulled={false}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial vertexColors emissive="white" emissiveIntensity={0.5} roughness={0.2} metalness={0.8} />
        </instancedMesh>

        {/* Complex Drops (Items) via React Components to support Text */}
        {drops.filter(d => d.type === 'ITEM' && d.item).map(drop => (
            <ItemDrop key={drop.id} id={drop.id} item={drop.item!} position={drop.position} />
        ))}
    </>
  );
};
