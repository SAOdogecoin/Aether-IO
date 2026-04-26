// ============================================================
// ASSET CONFIGURATION
// ============================================================
// Set each flag to `true` once the corresponding files are
// present in public/assets/.  Leaving a flag false falls back
// to the original procedural geometry — the game always runs.
// ============================================================

export const ASSET_FLAGS = {
  usePlayerModels:  false,   // characters/  GLB or FBX per hero
  useEnemyModels:   false,   // enemies/      GLB or FBX per type
  useForestMap:     false,   // map/          forest.glb (full scene)
  useGuiAssets:     false,   // gui/          PNG textures for UI
};

// --------------- Character models (one file per hero class) ---------------
// Supported extensions: .glb  |  .fbx
export const CHARACTER_PATHS: Record<string, string> = {
  ARCHER:    '/assets/characters/archer.glb',
  WIZARD:    '/assets/characters/wizard.glb',
  BARBARIAN: '/assets/characters/barbarian.glb',
};

// --------------- Enemy models (keyed by enemy type number) ----------------
// type 0 = slime, 1 = orc, 2 = boss, 3 = shooter,
// type 4 = speedy, 5 = elite_shooter, 6 = slow_shooter
export const ENEMY_PATHS: Record<number, string> = {
  0: '/assets/enemies/slime.glb',
  1: '/assets/enemies/orc.glb',
  2: '/assets/enemies/boss.glb',
  3: '/assets/enemies/shooter.glb',
  4: '/assets/enemies/speedy.glb',
  5: '/assets/enemies/elite_shooter.glb',
  6: '/assets/enemies/slow_shooter.glb',
};

// --------------- Map -------------------------------------------------------
export const MAP_PATHS = {
  forest: '/assets/map/forest.glb',
};

// --------------- GUI textures (PNG) ----------------------------------------
export const GUI_PATHS = {
  healthBar:  '/assets/gui/health_bar.png',
  manaBar:    '/assets/gui/mana_bar.png',
  xpBar:      '/assets/gui/xp_bar.png',
  panel:      '/assets/gui/frame_panel.png',
  button:     '/assets/gui/button_base.png',
  iconSlot:   '/assets/gui/icon_slot.png',
  portrait:   '/assets/gui/portrait.png',
};

// --------------- Animation clip names -------------------------------------
// These must match the clip names baked into your FBX/GLB files exactly.
// Update them once you know the actual names exported from your 3-D tool.
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
