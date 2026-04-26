

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { Vector3, Group } from 'three';
import { useGameStore } from '../store';
import { GameStatus } from '../types';
import { COLORS } from '../constants';

const ShopBuilding: React.FC<{
    position: [number, number, number];
    label: string;
    color: string;
    onClick: () => void;
    icon: string;
}> = ({ position, label, color, onClick, icon }) => {
    const groupRef = useRef<Group>(null);
    const { playerPosition } = useGameStore();

    useFrame((state) => {
        if (!groupRef.current) return;
        
        // Floating label
        const dist = playerPosition.distanceTo(new Vector3(...position));
        if (dist < 8) {
            groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.2;
        } else {
            groupRef.current.position.y = 0;
        }
    });

    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            {/* Base */}
            <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                <boxGeometry args={[4, 3, 4]} />
                <meshStandardMaterial color="#475569" roughness={0.8} />
            </mesh>
            
            {/* Roof */}
            <mesh position={[0, 4, 0]}>
                <coneGeometry args={[3.5, 2.5, 4]} />
                <meshStandardMaterial color={color} />
            </mesh>
            
            {/* Door */}
            <mesh position={[0, 1, 2.1]}>
                <boxGeometry args={[1.5, 2, 0.2]} />
                <meshStandardMaterial color="#1e293b" />
            </mesh>

            {/* Label */}
            <group ref={groupRef}>
                <Text
                    position={[0, 6.5, 0]}
                    fontSize={1.2}
                    color="white"
                    outlineWidth={0.1}
                    outlineColor="black"
                    anchorX="center"
                    anchorY="middle"
                    billboard
                >
                    {icon}
                </Text>
                <Text
                    position={[0, 5.5, 0]}
                    fontSize={0.6}
                    color="white"
                    outlineWidth={0.05}
                    outlineColor="black"
                    anchorX="center"
                    anchorY="middle"
                    billboard
                >
                    {label}
                </Text>
            </group>
            
            {/* Interaction Ring on Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                <ringGeometry args={[3.5, 3.8, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.5} />
            </mesh>
        </group>
    );
};

export const ShopStructures: React.FC = () => {
    const { openSpecificShop, status } = useGameStore();

    if (status !== GameStatus.PLAYING && status !== GameStatus.PAUSED && status !== GameStatus.SHOP) return null;

    return (
        <group>
            {/* Supplies Shop */}
            <ShopBuilding 
                position={[-24, 0, -18]} 
                label="SUPPLIES" 
                color="#3b82f6" 
                onClick={() => openSpecificShop('SUPPLIES')}
                icon="⚗️"
            />

            {/* Blacksmith Shop - Replaces SkillHouse logic, central location */}
            <ShopBuilding 
                position={[-8, 0, -22]} 
                label="BLACKSMITH" 
                color="#ef4444" 
                onClick={() => openSpecificShop('BLACKSMITH')}
                icon="🔨"
            />

            {/* Pets Shop */}
            <ShopBuilding 
                position={[8, 0, -22]} 
                label="PETS" 
                color="#10b981" 
                onClick={() => openSpecificShop('PETS')}
                icon="👻"
            />
        </group>
    );
};