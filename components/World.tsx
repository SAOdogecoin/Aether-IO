

import React, { useRef, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Plane, Grid } from '@react-three/drei';
import { Player } from './Player';
import { EnemyManager } from './EnemyManager';
import { CrateManager } from './CrateManager';
import { Environment } from './Environment';
import { DropManager } from './DropManager';
import { EnemyBulletManager } from './EnemyBulletManager';
import { SkillManager } from './SkillManager';
import { DamageTextManager } from './DamageTextManager';
import { Pet } from './Pet';
import { ARENA_SIZE, COLORS } from '../constants';
import { useGameStore } from '../store';
import { GameStatus, BulletData, EnemyData } from '../types';
import * as THREE from 'three';
import { SpatialHashGrid } from '../utils/SpatialHashGrid';

const MAX_ENEMIES = 400;

export const World: React.FC = () => {
  // OPTIMIZATION: Only subscribe to status to prevent re-renders on every frame (timer updates)
  const status = useGameStore(state => state.status);
  
  // Data Refs for high-performance shared state
  const bulletsDataRef = useRef<BulletData[]>([]);
  const enemyBulletsDataRef = useRef<BulletData[]>([]);
  
  // LIFTED: Enemies Data Ref (Single Source of Truth)
  const enemiesDataRef = useRef<EnemyData[]>(
    new Array(MAX_ENEMIES).fill(0).map((_, i) => ({
      id: i,
      active: false,
      type: 0,
      health: 100,
      maxHealth: 100,
      position: new THREE.Vector3(),
      speed: 5,
      radius: 0.8,
      scale: 1,
      state: 'CHASE',
      stateTimer: 0,
      activeTimer: 0
    } as EnemyData))
  );

  // OPTIMIZATION: Spatial Hash Grid (Cell Size 10)
  const spatialGrid = useRef(new SpatialHashGrid(10));
  
  // Shared ref for aiming target (mouse position in world)
  const targetPosRef = useRef(new THREE.Vector3());

  // Earthwall visual ref
  const earthwallRef = useRef<THREE.Mesh>(null);

  // RESET ENEMIES ON MENU
  useEffect(() => {
    if (status === GameStatus.MENU) {
        // Reset enemies so next run starts clean
        enemiesDataRef.current.forEach(e => {
            e.active = false;
        });
        // Resetting bullets is handled by their Managers remounting, but good practice to clear references
        bulletsDataRef.current.forEach(b => b.active = false);
        enemyBulletsDataRef.current.forEach(b => b.active = false);
    }
  }, [status]);

  useFrame((state) => {
      // Access transient state directly to avoid re-rendering the component tree
      const { earthwall } = useGameStore.getState();

      if (earthwall.active && earthwallRef.current) {
          earthwallRef.current.position.copy(earthwall.position);
          earthwallRef.current.scale.set(earthwall.radius, 1, earthwall.radius);
          // Gently pulsate
          const s = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.05;
          earthwallRef.current.scale.multiplyScalar(s);
          earthwallRef.current.visible = true;
      } else if (earthwallRef.current) {
          earthwallRef.current.visible = false;
      }
  });

  return (
    <group>
      {/* Distance fog — dark forest green, aggressive past the tree boundary */}
      {/* (Removed: replaced by MOBA-style fog overlay in GameUI) */}

      {/* RPG Lighting - Day Mode */}
      <ambientLight intensity={1.0} color="#ffffff" />
      <directionalLight
        position={[60, 80, 40]}
        intensity={2.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        color="#fffbeb" // Warm sun
      >
        <orthographicCamera attach="shadow-camera" args={[-80, 80, 80, -80]} />
      </directionalLight>

      {/* Ground & Environment */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[ARENA_SIZE * 3, ARENA_SIZE * 3]} />
        <meshStandardMaterial color={COLORS.ground} roughness={1} metalness={0} />
      </mesh>

      {/* Dark wall cylinder just outside the tree ring — seen from inside */}
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[ARENA_SIZE / 2 - 2, ARENA_SIZE / 2 - 2, 18, 80, 1, true]} />
        <meshBasicMaterial color="#010a01" side={THREE.BackSide} transparent opacity={0.95} />
      </mesh>

      <Environment />

      {/* Earthwall Visual */}
      <mesh ref={earthwallRef} visible={false}>
          <cylinderGeometry args={[1, 1, 3, 16, 1, true]} />
          <meshStandardMaterial color="#78350f" side={THREE.DoubleSide} transparent opacity={0.7} />
      </mesh>

      {/* Game Logic Entities */}
      {(status === GameStatus.PLAYING || status === GameStatus.PAUSED || status === GameStatus.LEVEL_UP || status === GameStatus.GAME_OVER || status === GameStatus.INVENTORY || status === GameStatus.SHOP) && (
        <>
          <Suspense fallback={null}>
            <Player
              bulletsDataRef={bulletsDataRef}
              enemyBulletsDataRef={enemyBulletsDataRef}
              targetPosRef={targetPosRef}
              enemiesDataRef={enemiesDataRef}
              spatialGrid={spatialGrid}
            />
          </Suspense>
          <Pet />
          <EnemyManager 
            bulletsDataRef={bulletsDataRef} 
            enemyBulletsDataRef={enemyBulletsDataRef}
            enemiesDataRef={enemiesDataRef}
            spatialGrid={spatialGrid}
          />
          <EnemyBulletManager enemyBulletsDataRef={enemyBulletsDataRef} />
          <CrateManager bulletsDataRef={bulletsDataRef} />
          <DropManager />
          <SkillManager 
            enemyBulletsDataRef={enemyBulletsDataRef} 
            bulletsDataRef={bulletsDataRef}
            targetPosRef={targetPosRef}
            enemiesDataRef={enemiesDataRef}
          />
          <DamageTextManager />
        </>
      )}
    </group>
  );
};