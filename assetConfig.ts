// ============================================================
// ASSET CONFIGURATION
// All files live in public/assets/characters/ (as uploaded).
// Flip flags to `true` to activate each asset category.
// ============================================================

export const ASSET_FLAGS = {
  usePlayerModels:  true,
  useEnemyModels:   true,
  useWeapons:       false,  // flip true once .bin companion files are uploaded
  useForestMap:     false,
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

// Common hand bone name patterns — the loader tries each until one matches
export const HAND_BONE_HINTS = [
  'hand_r', 'Hand_R', 'RightHand', 'mixamorig:RightHand',
  'Bip01_R_Hand', 'right_hand', 'R_Hand', 'weapon_r',
];

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
