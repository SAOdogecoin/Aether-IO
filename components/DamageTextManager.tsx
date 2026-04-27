import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { Vector3, Group } from 'three';
import { useGameStore } from '../store';
import { GameStatus } from '../types';

const MAX_TEXTS = 50; // Increased limit for AOE

interface DamageText {
  id: number;
  position: Vector3;
  velocity: Vector3;
  life: number;
  text: string;
  color: string;
  scale: number;
  active: boolean;
}

export const DamageTextManager: React.FC = () => {
  const { status } = useGameStore();
  const groupRef = useRef<Group>(null);
  
  // Use a ref to store state to avoid re-renders
  const textsRef = useRef<DamageText[]>(
    new Array(MAX_TEXTS).fill(0).map((_, i) => ({
      id: i,
      position: new Vector3(),
      velocity: new Vector3(),
      life: 0,
      text: '',
      color: 'white',
      scale: 1,
      active: false
    }))
  );

  useEffect(() => {
    const handleDamage = (e: CustomEvent) => {
      const { position, damage, isCrit, isPlayer, isDoT, damageType } = e.detail;
      const text = textsRef.current.find(t => !t.active);

      if (text) {
        text.active = true;
        text.position.copy(position).add(new Vector3(0, 1.5 + Math.random(), 0));
        text.velocity.set((Math.random() - 0.5) * 2, 4, (Math.random() - 0.5) * 2);
        text.life = 0.8;
        text.text = Math.round(damage).toString();

        if (isPlayer) {
            text.color = '#ff0000';
            text.scale = 1.2;
        } else {
            if (damageType === 'FIRE') text.color = '#ef4444';
            else if (damageType === 'ICE') text.color = '#3b82f6';
            else if (damageType === 'POISON') text.color = '#22c55e';
            else if (damageType === 'MAGIC') text.color = '#d8b4fe';
            else if (damageType === 'PHYSICAL') text.color = isCrit ? '#facc15' : 'white';
            else text.color = isCrit ? '#facc15' : 'white';

            if (!damageType && isDoT) text.color = '#f97316';

            text.scale = isCrit ? 1.5 : 0.8;
        }
      }
    };

    const handleLootText = (e: CustomEvent) => {
      const { position, text: label, color } = e.detail;
      const text = textsRef.current.find(t => !t.active);
      if (text) {
        text.active = true;
        text.position.copy(position);
        text.velocity.set((Math.random() - 0.5) * 1.5, 3, (Math.random() - 0.5) * 1.5);
        text.life = 1.4;
        text.text = label;
        text.color = color;
        text.scale = 1.3;
      }
    };

    const handleSkillError = (e: CustomEvent) => {
      const { position, text: label } = e.detail;
      const text = textsRef.current.find(t => !t.active);
      if (text) {
        text.active = true;
        text.position.copy(position).add(new Vector3(0, 2, 0));
        text.velocity.set(0, 1, 0);
        text.life = 0.8;
        text.text = label;
        text.color = '#ef4444';
        text.scale = 1.2;
      }
    };

    window.addEventListener('damage', handleDamage as EventListener);
    window.addEventListener('loot-text', handleLootText as EventListener);
    window.addEventListener('skill-error', handleSkillError as EventListener);
    return () => {
      window.removeEventListener('damage', handleDamage as EventListener);
      window.removeEventListener('loot-text', handleLootText as EventListener);
      window.removeEventListener('skill-error', handleSkillError as EventListener);
    };
  }, []);

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;
    if (!groupRef.current) return;

    // Update pool
    textsRef.current.forEach((text, i) => {
      const mesh = groupRef.current!.children[i];
      if (!mesh) return;

      if (text.active) {
        text.life -= delta;
        text.velocity.y -= 15 * delta; // Gravity
        text.position.add(text.velocity.clone().multiplyScalar(delta));
        
        if (text.life <= 0) {
            text.active = false;
            mesh.visible = false;
        } else {
            mesh.visible = true;
            mesh.position.copy(text.position);
            mesh.lookAt(state.camera.position);
            
            // Fade out scale effect
            const lifeScale = Math.min(1, text.life * 3);
            const currentScale = text.scale * lifeScale;
            mesh.scale.set(currentScale, currentScale, currentScale);
        }
      } else {
        mesh.visible = false;
      }
    });
  });
  
  // Hacky Re-render trigger to update text colors
  const [_, setTick] = useState(0);
  useEffect(() => {
      const handle = () => setTick(t => t+1);
      window.addEventListener('damage', handle);
      return () => window.removeEventListener('damage', handle);
  }, []);

  return (
    <group ref={groupRef}>
      {textsRef.current.map((t, i) => (
         <Text
           key={i}
           position={[0, -100, 0]}
           fontSize={1.8}
           color={t.color} // Reactive prop
           outlineWidth={0.08}
           outlineColor="black"
           anchorX="center"
           anchorY="middle"
           visible={false} // Default hidden
         >
           {t.text} {/* Reactive prop */}
         </Text>
      ))}
    </group>
  );
};