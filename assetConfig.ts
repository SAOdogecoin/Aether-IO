// ============================================================
// ASSET CONFIGURATION
// All files live in public/assets/characters/ (as uploaded).
// Flip flags to `true` to activate each asset category.
// ============================================================

export const ASSET_FLAGS = {
  usePlayerModels:  true,
  useEnemyModels:   true,
  useWeapons:       true,   // .bin files uploaded — weapons active
  useForestMap:     true,
  useGuiAssets:     false,
};

// ── Hero character models ──────────────────────────────────────
export const CHARACTER_PATHS: Record<string, string> = {
  ARCHER:    '/assets/characters/Ranger.glb',
  WIZARD:    '/assets/characters/Mage.glb',
  BARBARIAN: '/assets/characters/Barbarian.glb',
};

export const CHARACTER_TEXTURES: Record<string, string> = {
  ARCHER:    '/assets/characters/ranger_texture.png',
  WIZARD:    '/assets/characters/mage_texture.png',
  BARBARIAN: '/assets/characters/barbarian_texture.png',
};

// ── Hero animation rigs ────────────────────────────────────────
export const ANIM_RIGS = {
  movementBasic:    '/assets/characters/Rig_Medium_MovementBasic.glb',
  movementAdvanced: '/assets/characters/Rig_Medium_MovementAdvanced.glb',
  combatMelee:      '/assets/characters/Rig_Medium_CombatMelee.glb',
  combatRanged:     '/assets/characters/Rig_Medium_CombatRanged.glb',
  general:          '/assets/characters/Rig_Medium_General.glb',
  special:          '/assets/characters/Rig_Medium_Special.glb',
  simulation:       '/assets/characters/Rig_Medium_Simulation.glb',
  tools:            '/assets/characters/Rig_Medium_Tools.glb',
};

// Rig packs loaded per hero class
export const HERO_RIGS: Record<string, string[]> = {
  ARCHER:    [ANIM_RIGS.movementBasic, ANIM_RIGS.combatRanged,  ANIM_RIGS.general],
  WIZARD:    [ANIM_RIGS.movementBasic, ANIM_RIGS.combatRanged,  ANIM_RIGS.general, ANIM_RIGS.special],
  BARBARIAN: [ANIM_RIGS.movementBasic, ANIM_RIGS.combatMelee,   ANIM_RIGS.general, ANIM_RIGS.movementAdvanced],
};

// ── Skeleton enemy animation rigs ──────────────────────────────
// These are the skeleton-specific rigs (different skeleton from heroes).
export const SKELETON_ANIM_RIGS = {
  movementBasic: '/assets/characters/Skeleton_Rig_Medium_MovementBasic.glb',
  general:       '/assets/characters/Skeleton_Rig_Medium_General.glb',
};

// ── Enemy models ───────────────────────────────────────────────
// type 0=slime, 1=orc, 2=boss, 3=shooter, 4=speedy, 5=elite, 6=slow
export const ENEMY_PATHS: Record<number, string> = {
  0: '/assets/characters/Skeleton_Minion.glb',
  1: '/assets/characters/Skeleton_Warrior.glb',
  2: '/assets/characters/Skeleton_Warrior.glb',
  3: '/assets/characters/Skeleton_Rogue.glb',
  4: '/assets/characters/Skeleton_Rogue.glb',
  5: '/assets/characters/Skeleton_Mage.glb',
  6: '/assets/characters/Skeleton_Mage.glb',
};

export const ENEMY_TEXTURE = '/assets/characters/skeleton_texture.png';

// ── Weapon models ──────────────────────────────────────────────
// GLTF files — require companion .bin files in the same folder.
// Upload the matching .bin files (bow.bin, staff.bin, etc.) then
// set ASSET_FLAGS.useWeapons = true.
export const WEAPON_PATHS = {
  // Archer
  bow:                '/assets/characters/bow.gltf',
  quiver:             '/assets/characters/quiver.gltf',
  arrow_bow:          '/assets/characters/arrow_bow.gltf',
  crossbow:           '/assets/characters/crossbow_1handed.gltf',
  arrow_crossbow:     '/assets/characters/arrow_crossbow.gltf',
  // Wizard
  staff:              '/assets/characters/staff.gltf',
  wand:               '/assets/characters/wand.gltf',
  // Barbarian
  axe_1h:             '/assets/characters/axe_1handed.gltf',
  axe_2h:             '/assets/characters/axe_2handed.gltf',
  sword_1h:           '/assets/characters/sword_1handed.gltf',
};

// Which weapon each hero holds in their right hand
export const HERO_WEAPON: Record<string, keyof typeof WEAPON_PATHS> = {
  ARCHER:    'bow',
  WIZARD:    'staff',
  BARBARIAN: 'axe_2h',
};

// ── Skeleton enemy weapons ─────────────────────────────────────
export const SKELETON_WEAPON_PATHS = {
  axe:    '/assets/characters/Skeleton_Axe.gltf',
  arrow:  '/assets/characters/Skeleton_Arrow.gltf',
  shield: '/assets/characters/Skeleton_Shield_Large_A.gltf',
  staff:  '/assets/characters/Skeleton_Staff.gltf',
};

// Right-hand bone name hints (tried in order, case-insensitive)
// Models use dot-notation: handslot.r / hand.r
export const HAND_BONE_HINTS = [
  'handslot.r', 'hand.r', 'wrist.r',
  'hand_r', 'Hand_R', 'RightHand', 'mixamorig:RightHand',
  'Bip01_R_Hand', 'right_hand', 'R_Hand', 'weapon_r',
];

// Left-hand bone name hints (for shields / off-hand)
export const OFF_HAND_BONE_HINTS = [
  'handslot.l', 'hand.l', 'wrist.l',
  'hand_l', 'Hand_L', 'LeftHand', 'mixamorig:LeftHand',
  'Bip01_L_Hand', 'left_hand', 'L_Hand', 'weapon_l',
];

// ── Mannequin reference skeletons ──────────────────────────────
// Mannequin_Medium: base skeleton matching Ranger/Mage/Barbarian + Rig_Medium_* anims
// Mannequin_Large:  base skeleton for larger characters (potential boss use)
export const MANNEQUIN_PATHS = {
  medium: '/assets/characters/Mannequin_Medium.glb',
  large:  '/assets/characters/Mannequin_Large.glb',
};

// ── Forest environment props ───────────────────────────────────
const C = '/assets/characters/'; // all assets share this base path for now
export const ENV_PATHS = {
  // Trees (4 variants)
  tree1:    `${C}Tree_1_A_Color1.gltf`,
  tree2:    `${C}Tree_2_B_Color1.gltf`,
  tree3:    `${C}Tree_3_C_Color1.gltf`,
  treeBare1:`${C}Tree_Bare_1_A_Color1.gltf`,
  treeBare2:`${C}Tree_Bare_2_C_Color1.gltf`,
  // Rocks
  rock1:    `${C}Rock_1_A_Color1.gltf`,
  rock2:    `${C}Rock_2_B_Color1.gltf`,
  // Bushes (complete .gltf + .bin pairs only)
  bush1:    `${C}Bush_1_A_Color1.gltf`,
  bush2:    `${C}Bush_2_A_Color1.gltf`,
  bush3:    `${C}Bush_3_A_Color1.gltf`,
  // Grass
  grass1:   `${C}Grass_1_A_Color1.gltf`,
  grass2:   `${C}Grass_2_B_Color1.gltf`,
};

// ── Map ────────────────────────────────────────────────────────
export const MAP_PATHS = {
  forest: '/assets/map/forest.glb',
};

// ── GUI textures ───────────────────────────────────────────────
export const GUI_PATHS = {
  healthBar: '/assets/gui/health_bar.png',
  manaBar:   '/assets/gui/mana_bar.png',
  xpBar:     '/assets/gui/xp_bar.png',
  panel:     '/assets/gui/frame_panel.png',
  button:    '/assets/gui/button_base.png',
  iconSlot:  '/assets/gui/icon_slot.png',
};
