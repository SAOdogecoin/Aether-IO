// ============================================================
// ASSET CONFIGURATION
// All files live in public/assets/characters/ (as uploaded).
// Flip flags to `true` to activate each asset category.
// ============================================================

export const ASSET_FLAGS = {
  usePlayerModels:  true,   // Barbarian / Mage / Ranger GLBs
  useEnemyModels:   true,   // Skeleton variants
  useForestMap:     false,  // no map GLB uploaded yet
  useGuiAssets:     false,  // no GUI assets uploaded yet
};

// ── Hero character models ─────────────────────────────────────
// ARCHER  → Ranger.glb
// WIZARD  → Mage.glb
// BARBARIAN → Barbarian.glb
export const CHARACTER_PATHS: Record<string, string> = {
  ARCHER:    '/assets/characters/Ranger.glb',
  WIZARD:    '/assets/characters/Mage.glb',
  BARBARIAN: '/assets/characters/Barbarian.glb',
};

// Texture maps baked alongside each character model
export const CHARACTER_TEXTURES: Record<string, string> = {
  ARCHER:    '/assets/characters/ranger_texture.png',
  WIZARD:    '/assets/characters/mage_texture.png',
  BARBARIAN: '/assets/characters/barbarian_texture.png',
};

// ── Animation rigs (separate GLBs, same skeleton as heroes) ──
// Each rig GLB contains a set of animation clips.
// The loader merges clips from all relevant rigs at runtime.
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

// Which rig packs each hero loads (keeps preload count reasonable)
export const HERO_RIGS: Record<string, string[]> = {
  ARCHER:    [ANIM_RIGS.movementBasic, ANIM_RIGS.combatRanged,  ANIM_RIGS.general],
  WIZARD:    [ANIM_RIGS.movementBasic, ANIM_RIGS.combatRanged,  ANIM_RIGS.general, ANIM_RIGS.special],
  BARBARIAN: [ANIM_RIGS.movementBasic, ANIM_RIGS.combatMelee,   ANIM_RIGS.general, ANIM_RIGS.movementAdvanced],
};

// ── Enemy models ──────────────────────────────────────────────
// type 0 = slime   → Skeleton_Minion
// type 1 = orc     → Skeleton_Warrior
// type 2 = boss    → Skeleton_Warrior (scaled up by EnemyManager)
// type 3 = shooter → Skeleton_Rogue
// type 4 = speedy  → Skeleton_Rogue
// type 5 = elite   → Skeleton_Mage
// type 6 = slow shooter → Skeleton_Mage
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

// ── Map ───────────────────────────────────────────────────────
export const MAP_PATHS = {
  forest: '/assets/map/forest.glb',   // not uploaded yet
};

// ── GUI textures ──────────────────────────────────────────────
export const GUI_PATHS = {
  healthBar: '/assets/gui/health_bar.png',
  manaBar:   '/assets/gui/mana_bar.png',
  xpBar:     '/assets/gui/xp_bar.png',
  panel:     '/assets/gui/frame_panel.png',
  button:    '/assets/gui/button_base.png',
  iconSlot:  '/assets/gui/icon_slot.png',
};

// ── Animation clip name hints ─────────────────────────────────
// Update these to match the exact names inside your GLBs if the
// defaults don't fire.  Open a .glb in https://gltf.report/ to
// inspect clip names without code.
export const PLAYER_ANIM_NAMES = {
  idle:    'Idle',
  run:     'Run',
  attack:  'Attack',
  dash:    'Dash',
  die:     'Death',
  levelUp: 'Victory',
  rage:    'Rage',
};

export const ENEMY_ANIM_NAMES = {
  idle:   'Idle',
  walk:   'Walk',
  attack: 'Attack',
  die:    'Death',
  stun:   'Stun',
};
