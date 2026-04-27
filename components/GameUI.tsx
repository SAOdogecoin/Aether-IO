
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useGameStore, calculateItemCP, calculateTotalCP, RARITY_LEVEL_REQ } from '../store';
import { GameStatus, Upgrade, Item, Rarity, GameNotification, HeroClass, SkillLevels, ActionResult, PlayerStats } from '../types';
import { UPGRADES_POOL, ITEMS_POOL, HERO_STATS, PETS_POOL, SKILLS_INFO, ARENA_SIZE, SHOP_POSITIONS, RECYCLE_YIELDS, CRAFTING_COSTS, MATERIAL_COMBINE_COST } from '../constants';
import { 
  Heart, Zap, Sparkles, RotateCcw, 
  Backpack, Shield, Sword, Gem, X, User, Flame, Wind, ShoppingBag, Coins, Hammer, MoveRight, Activity, Magnet, Ghost, Dices, Timer, Trash2, CheckCircle2, ShieldCheck, Wand, FlaskConical, CircleDollarSign, Package,
  Crosshair, Axe, Wand2, Hexagon, Layers, BookOpen, Star, ArrowUpCircle, Trophy, RefreshCcw, Anvil, ArrowRight, Sun, Tornado, Skull, Check, AlertTriangle, Book, Search, Lock, ArrowBigRight, Menu, Play, BarChart3, ChevronRight, AlertCircle, Plus, Minus, Recycle, PenTool
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- HELPER COMPONENTS ---

const getRarityBg = (rarity?: Rarity) => {
    switch(rarity) {
        case 'MYTHIC': return 'bg-red-100';
        case 'LEGENDARY': return 'bg-yellow-100';
        case 'EPIC': return 'bg-purple-100';
        case 'RARE': return 'bg-blue-100';
        default: return 'bg-slate-200';
    }
};

const getRarityTextColor = (rarity?: Rarity) => {
    switch(rarity) {
        case 'MYTHIC': return 'text-red-600';
        case 'LEGENDARY': return 'text-yellow-600';
        case 'EPIC': return 'text-purple-600';
        case 'RARE': return 'text-blue-600';
        default: return 'text-slate-600';
    }
};

const formatStat = (key: string, value: number): string => {
    if (key === 'critRate' || key === 'dodge' || key === 'cooldownReduction' || key === 'moveSpeed' || key === 'spread') {
        return `+${(value * 100).toFixed(0)}%`;
    }
    if (key === 'critDamage' || key === 'skillDamage') {
        return `+${(value * 100).toFixed(0)}%`;
    }
    return `+${value}`;
};

const ItemIcon: React.FC<{ item: Item; size?: number }> = ({ item, size = 24 }) => {
  if (item.type === 'POTION') return <FlaskConical size={size} className="text-red-500" />;
  if (item.type === 'CORE') return <Hexagon size={size} className="text-blue-500" />;
  if (item.type === 'REVIVE') return <Heart size={size} className="text-yellow-500" fill="currentColor" />;
  
  const colorClass = item.rarity === 'MYTHIC' ? 'text-red-600' : 'text-slate-700';

  if (item.type === 'WEAPON') {
      if (item.projectileType === 'MAGIC') return <Wand2 size={size} className={colorClass} />;
      if (item.projectileType === 'ARROW') return <Crosshair size={size} className={colorClass} />;
      if (item.projectileType === 'AXE') return <Axe size={size} className={colorClass} />;
      return <Sword size={size} className={colorClass} />;
  }
  if (item.type === 'ARMOR') return <Shield size={size} className="text-blue-600" />;
  if (item.type === 'ACCESSORY') return <Gem size={size} className="text-purple-600" />;
  if (item.type === 'PET') return <Ghost size={size} className="text-pink-500" />;
  return <Package size={size} />;
};

const NotificationItem: React.FC<{ note: GameNotification; onRemove: (id: string) => void }> = React.memo(({ note, onRemove }) => {
    useEffect(() => {
        const timer = setTimeout(() => onRemove(note.id), 3000);
        return () => clearTimeout(timer);
    }, []); 

    return (
        <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.9 }}
            layout 
            className="mb-2 px-4 py-2 rounded-full bg-slate-900/90 backdrop-blur text-white shadow-2xl flex items-center gap-3 pointer-events-auto min-w-[200px] border border-white/10"
        >
            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px]`} style={{ backgroundColor: note.color, boxShadow: `0 0 10px ${note.color}` }} />
            <div className="font-bold text-sm tracking-wide">{note.message}</div>
            {note.action && (
                <button
                    onClick={() => { note.action!.onClick(); onRemove(note.id); }}
                    className="ml-auto text-[10px] bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full font-bold uppercase transition-colors"
                >
                    {note.action.label}
                </button>
            )}
        </motion.div>
    );
});

const WarningNotification: React.FC<{ note: GameNotification; onRemove: (id: string) => void }> = React.memo(({ note, onRemove }) => {
    useEffect(() => {
        const timer = setTimeout(() => onRemove(note.id), 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <motion.div
            initial={{ y: -50, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.5 }}
            className="text-3xl font-black text-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] stroke-black tracking-tighter text-center"
            style={{ WebkitTextStroke: '1px black' }}
        >
            {note.message}
        </motion.div>
    );
});

const CLASS_COLOR: Record<string, string> = {
    ARCHER:    '#22c55e',
    WIZARD:    '#3b82f6',
    BARBARIAN: '#ef4444',
};

const getRarityBgDark = (rarity?: Rarity): string => {
    switch(rarity) {
        case 'MYTHIC':    return 'rgba(220,38,38,0.18)';
        case 'LEGENDARY': return 'rgba(202,138,4,0.18)';
        case 'EPIC':      return 'rgba(147,51,234,0.18)';
        case 'RARE':      return 'rgba(59,130,246,0.18)';
        default:          return 'rgba(255,255,255,0.04)';
    }
};

const getRarityTextColorDark = (rarity?: Rarity): string => {
    switch(rarity) {
        case 'MYTHIC':    return '#f87171';
        case 'LEGENDARY': return '#fbbf24';
        case 'EPIC':      return '#c084fc';
        case 'RARE':      return '#60a5fa';
        default:          return '#94a3b8';
    }
};

const UniversalSkillSlot: React.FC<{
    icon: React.ReactNode;
    level: number;
    cooldown?: number;
    maxCooldown?: number;
    label?: string;
    desc: string;
    active: boolean;
    manaCost?: number;
    currentMana?: number;
    charges?: number;
    maxCharges?: number;
    heroClass?: string;
    isPassive?: boolean;
}> = ({ icon, level, cooldown = 0, maxCooldown = 1, label, desc, active, manaCost = 0, currentMana = 999, charges, maxCharges, heroClass, isPassive }) => {

    const actualCost = heroClass === 'WIZARD' ? Math.ceil(manaCost * 1.3) : manaCost;
    const canAfford = currentMana >= actualCost;
    const accent = heroClass ? (CLASS_COLOR[heroClass] ?? '#6366f1') : '#6366f1';

    const isRecharging = cooldown > 0;
    const isChargingType = maxCharges && maxCharges > 0;
    const showCooldownOverlay = isRecharging && (!isChargingType || (charges !== undefined && charges < maxCharges));
    const percent = Math.min(100, Math.max(0, (cooldown / maxCooldown) * 100));
    const isDimmed = !active || level === 0;

    return (
        <div className="relative group flex flex-col items-center">
            <div
                className={`w-12 h-12 md:w-13 md:h-13 rounded-xl flex items-center justify-center relative overflow-hidden transition-all
                    ${isDimmed ? 'opacity-40' : ''}
                    ${!canAfford && active && (!isChargingType || charges! > 0) ? 'grayscale' : ''}
                `}
                style={{
                    background: isDimmed ? 'rgba(10,10,10,0.85)' : 'rgba(14,14,18,0.92)',
                    border: isDimmed ? '1px solid rgba(60,60,70,0.5)' : `1px solid ${accent}55`,
                    boxShadow: !isDimmed ? `0 0 10px ${accent}22, inset 0 0 8px rgba(0,0,0,0.6)` : 'none',
                }}
            >
                <div className="scale-90 z-0">{icon}</div>

                {showCooldownOverlay && (
                    <div
                        className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
                        style={{ background: `conic-gradient(rgba(0,0,0,0.75) ${percent}%, transparent ${percent}% 100%)` }}
                    >
                        {!isChargingType && (
                            <span className="text-white font-black text-xs drop-shadow z-20">{cooldown.toFixed(1)}</span>
                        )}
                    </div>
                )}

                {!active && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <Lock size={14} className="text-gray-600" />
                    </div>
                )}

                {!canAfford && active && (!isChargingType || charges! > 0) && manaCost > 0 && (
                    <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center z-10">
                        <span className="text-blue-300 text-[9px] font-black">MP</span>
                    </div>
                )}

                {active && level > 0 && (
                    <div className="absolute bottom-0 right-0 text-[7px] px-1 py-0.5 font-bold z-20"
                         style={{ background: accent + 'cc', color: '#fff', borderTopLeftRadius: 4 }}>
                        {level}
                    </div>
                )}

                {isChargingType && active && (
                    <div className="absolute top-1 left-1 flex gap-0.5 z-20">
                        {[...Array(maxCharges)].map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < (charges || 0) ? 'bg-green-400' : 'bg-gray-700'}`} />
                        ))}
                    </div>
                )}
            </div>

            {label && (
                <div className="text-[8px] font-bold text-gray-500 mt-0.5 uppercase tracking-wider">{label}</div>
            )}

            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-40 bg-gray-950 border border-gray-700 text-xs p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center shadow-xl">
                <div className="font-bold text-white mb-0.5">{desc}</div>
                {manaCost > 0 && active && <div className="text-blue-400 text-[10px]">MP: {actualCost}</div>}
                {!active && <div className="text-gray-600 text-[10px]">Locked</div>}
            </div>
        </div>
    );
};

const EquipmentSlot: React.FC<{
    type: string;
    label: string;
    item: Item | null;
    onClick: () => void;
    onUpgrade: () => void;
    canUpgrade: boolean;
    onHover: (item: Item | null) => void;
    textColorClass?: string;
    hideUpgrade?: boolean;
}> = ({ type, label, item, onClick, onUpgrade, canUpgrade, onHover, textColorClass, hideUpgrade }) => {
    return (
        <div className="flex flex-col items-center gap-1">
            <button 
                onClick={onClick}
                onMouseEnter={() => item && onHover(item)}
                onMouseLeave={() => onHover(null)}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center relative border-b-4 active:translate-y-1 active:border-b-0 transition-all
                    ${item ? getRarityBg(item.rarity) : 'bg-slate-200'}
                    border-slate-300
                `}
            >
                {item ? <ItemIcon item={item} size={32} /> : <div className="text-slate-400 opacity-50 font-bold text-[10px]">{label}</div>}
                {item && item.level > 1 && (
                     <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-bl-lg font-bold">
                        +{item.level-1}
                     </div>
                )}
            </button>
            <div className="text-[10px] font-bold text-slate-400 uppercase">{label}</div>
        </div>
    );
};

const Minimap: React.FC = () => {
    const { minimapEnemies, playerPosition } = useGameStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, 150, 150);
        
        // Arena is ARENA_SIZE x ARENA_SIZE (120x120)
        // Map 150px = 120 units => scale = 1.25
        const scale = 150 / ARENA_SIZE;
        
        const mapX = (x: number) => (x + ARENA_SIZE/2) * scale;
        const mapZ = (z: number) => (z + ARENA_SIZE/2) * scale;
        
        // Draw Player
        ctx.fillStyle = '#3b82f6'; // Blue
        ctx.beginPath();
        ctx.arc(mapX(playerPosition.x), mapZ(playerPosition.z), 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Enemies
        minimapEnemies.forEach(e => {
            if (e.type === 2) ctx.fillStyle = '#ef4444'; // Boss
            else if (e.type === 5) ctx.fillStyle = '#a855f7'; // Elite
            else ctx.fillStyle = '#ef4444'; 
            
            ctx.beginPath();
            ctx.fillRect(mapX(e.x)-1, mapZ(e.z)-1, 2, 2);
        });
        
    }, [minimapEnemies, playerPosition]);

    return (
        <div className="absolute right-6 bottom-6 w-[150px] h-[150px] bg-slate-900/80 rounded-full border-4 border-slate-700 overflow-hidden shadow-xl pointer-events-auto">
            <canvas ref={canvasRef} width={150} height={150} />
        </div>
    );
};

export const GameUI: React.FC = () => {
  const { 
    status, health, mana, stats, score, gems, level, experience, experienceToNextLevel, skillPoints,
    inventory, maxInventorySlots, materials, equipment, setStatus, skills, skillMaxCooldowns, skillLevels, passiveSkillState,
    startGame, resetGame, applyUpgrade, selectUpgrade, upgradeOptions, equipItem, unequipItem, buyItem, upgradeItem, sellItem, sellItems, autoEquip, selectHero, hero, hpPotionCooldown, mpPotionCooldown,
    wave, waveTimer, recentRuns, bossData, gameStats,
    isInventoryOpen, isShopOpen, toggleInventory, activeShopTab, closeAllUI, openSpecificShop,
    notifications, removeNotification, upgradeSkill, toggleCharacterSheet, isCharacterSheetOpen, baseStats, activeAbilityQ, activeAbilityR,
    recycleItem, massRecycle, combineMaterials, craftItem, buyInventorySlots, actionResult, clearActionResult, massSell,
    isCodexOpen, toggleCodex, dashCharges, maxDashCharges, barrierCooldown, shieldCharges, maxShieldCharges, getManaCost
  } = useGameStore();

  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [blacksmithTab, setBlacksmithTab] = useState<'UPGRADE' | 'RECYCLE' | 'CRAFT'>('UPGRADE');
  const [selectedUpgradeItem, setSelectedUpgradeItem] = useState<Item | null>(null);
  const [panelTab, setPanelTab] = useState<'INVENTORY' | 'CRAFTING' | 'SKILLS' | 'SHOP' | 'CHARACTER'>('INVENTORY');

  const panelOpen = isInventoryOpen || isShopOpen || isCharacterSheetOpen;

  useEffect(() => {
    if (isShopOpen) {
      if (activeShopTab === 'BLACKSMITH') { setPanelTab('CRAFTING'); setBlacksmithTab('UPGRADE'); }
      else if (activeShopTab === 'SKILLS') setPanelTab('SKILLS');
      else setPanelTab('SHOP');
    } else if (isInventoryOpen) setPanelTab('INVENTORY');
    else if (isCharacterSheetOpen) setPanelTab('CHARACTER');
  }, [isShopOpen, isInventoryOpen, isCharacterSheetOpen, activeShopTab]);
  
  // Sell Dialog State
  const [sellDialogItem, setSellDialogItem] = useState<Item | null>(null);
  const [sellAmount, setSellAmount] = useState(1);

  const abilityToCheckR = equipment.weapon?.ability;

  const sortedInventory = useMemo(() => {
    return [...inventory].sort((a, b) => {
        // Sort by Rarity (Mythic > Legend > Epic > Rare > Common)
        const rarityScore = { 'MYTHIC': 5, 'LEGENDARY': 4, 'EPIC': 3, 'RARE': 2, 'COMMON': 1 };
        const rsA = rarityScore[a.rarity];
        const rsB = rarityScore[b.rarity];
        if (rsA !== rsB) return rsB - rsA;
        
        // Sort by Type (Weapon > Armor > Acc > Pet > Others)
        const typeScore = { 'WEAPON': 6, 'ARMOR': 5, 'ACCESSORY': 4, 'PET': 3, 'POTION': 2, 'CORE': 1, 'REVIVE': 0 };
        // @ts-ignore
        const tsA = typeScore[a.type] || 0;
        // @ts-ignore
        const tsB = typeScore[b.type] || 0;
        if (tsA !== tsB) return tsB - tsA;
        
        return 0;
    });
  }, [inventory]);

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          setMousePos({ x: e.clientX, y: e.clientY });
      };
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
      if (actionResult) {
          if (actionResult.success && actionResult.type === 'UPGRADE' && actionResult.item) {
              setSelectedUpgradeItem(actionResult.item);
          }
          const timer = setTimeout(() => clearActionResult(), 2000);
          return () => clearTimeout(timer);
      }
  }, [actionResult, clearActionResult]);

  const onInventoryItemClick = (item: Item) => {
      if (isShopOpen) {
          if (activeShopTab === 'BLACKSMITH') {
              if (blacksmithTab === 'RECYCLE') {
                  recycleItem(item);
              } else if (blacksmithTab === 'UPGRADE') {
                  setSelectedUpgradeItem(item);
              } else {
                  // For craft tab, usually nothing to click in inventory unless refining
              }
          } else {
              // Open Sell Dialog
              setSellDialogItem(item);
              setSellAmount(1);
          }
      } else {
          // Equip if possible
          if (item.type !== 'POTION' && item.type !== 'CORE' && item.type !== 'REVIVE') {
              equipItem(item);
          }
      }
  };
  
  const handleConfirmSell = () => {
      if (sellDialogItem) {
          sellItem(sellDialogItem, sellAmount);
          setSellDialogItem(null);
          setSellAmount(1);
      }
  };

  const hpPercent = (health / stats.maxHealth) * 100;
  const manaPercent = (mana / stats.maxMana) * 100;
  const xpPercent = (experience / experienceToNextLevel) * 100;
  const currentCP = calculateTotalCP(stats);

  const hpPotion = inventory.find(i => i.type === 'POTION' && (i.name === 'Health Potion' || i.name === 'Big Health Potion'));
  const manaPotion = inventory.find(i => i.type === 'POTION' && (i.name === 'Mana Potion' || i.name === 'Big Mana Potion'));

  let weaponAbilityDesc = "Basic Attack.";
  if (equipment.weapon?.ability === 'FIREBALL') weaponAbilityDesc = "Shoots a slow giant fireball.";
  else if (equipment.weapon?.ability === 'ARROW_RAIN') weaponAbilityDesc = "Fires waves of arrows.";
  else if (equipment.weapon?.ability === 'AXE_SPIN') weaponAbilityDesc = "Spinning blade barrier.";
  
  let qAbilityDesc = "Locked.";
  if (activeAbilityQ === 'PIERCING_SHOT') qAbilityDesc = "Massive piercing arrow.";
  else if (activeAbilityQ === 'GRAVITY_SPELL') qAbilityDesc = "Summons blackhole.";
  else if (activeAbilityQ === 'RAGE') qAbilityDesc = "Doubles Attack Speed.";

  let eAbilityDesc = "Locked. (Requires 5 SP)";
  let eAbilityIcon = <div className="text-slate-400 text-xs font-bold">LOCKED</div>;
  if (hero === 'BARBARIAN') {
      eAbilityDesc = "War Vitality: Regenerate 10 HP/s for 6s.";
      eAbilityIcon = <Heart size={28} className={skills.e > 0 ? 'text-red-500' : 'text-slate-400'} />;
  } else if (hero === 'WIZARD') {
      eAbilityDesc = "Earthwall: Create a defensive barrier for 4s.";
      eAbilityIcon = <ShieldCheck size={28} className={skills.e > 0 ? 'text-amber-700' : 'text-slate-400'} />;
  } else if (hero === 'ARCHER') {
      eAbilityDesc = "Wind Sprint: 2x Speed & Invincible for 4s.";
      eAbilityIcon = <Wind size={28} className={skills.e > 0 ? 'text-green-500' : 'text-slate-400'} />;
  }

  // --- Render Helpers for Shops/Modals ---
  
  const StatRow = ({ label, value }: { label: string, value: string }) => (
      <div className="flex justify-between items-center text-xs py-2 border-b border-slate-100 last:border-0">
          <span className="text-slate-500 font-bold uppercase tracking-wider">{label}</span>
          <span className="font-mono font-bold text-slate-800">{value}</span>
      </div>
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-10 font-sans text-slate-800 select-none">
      
      {/* WARNING NOTIFICATIONS - TOP CENTER */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center pointer-events-none z-[100] w-full">
          <AnimatePresence>
              {notifications.filter(n => n.type === 'WARNING').map((note) => (
                  <WarningNotification key={note.id} note={note} onRemove={removeNotification} />
              ))}
          </AnimatePresence>
      </div>

      {/* LOBBY / HERO SELECT */}
      {status === GameStatus.MENU && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-xl pointer-events-auto z-50">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-5xl px-8 flex flex-col items-center gap-8"
              >
                  <div className="text-center">
                      <h1 className="text-6xl font-black text-white tracking-tighter drop-shadow-lg mb-2"
                          style={{ textShadow: '0 0 40px rgba(99,102,241,0.6)' }}>
                          AETHER SURVIVOR
                      </h1>
                      <div className="text-slate-400 font-bold tracking-widest text-sm uppercase">Choose Your Hero</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
                      {([
                          { h: 'ARCHER'    as HeroClass, color: '#22c55e', glow: 'rgba(34,197,94,0.25)',  border: 'rgba(34,197,94,0.5)'  },
                          { h: 'WIZARD'    as HeroClass, color: '#3b82f6', glow: 'rgba(59,130,246,0.25)', border: 'rgba(59,130,246,0.5)' },
                          { h: 'BARBARIAN' as HeroClass, color: '#ef4444', glow: 'rgba(239,68,68,0.25)',  border: 'rgba(239,68,68,0.5)'  },
                      ]).map(({ h, color, glow, border }) => (
                          <div
                            key={h}
                            onClick={() => { selectHero(h); startGame(); }}
                            className="relative flex flex-col items-center gap-5 cursor-pointer group transition-transform hover:scale-105 h-88"
                            style={{
                              background: 'rgba(10,10,14,0.92)',
                              border: `1px solid ${border}`,
                              borderRadius: '1.5rem',
                              padding: '2rem 1.5rem',
                              boxShadow: `0 0 0 0 ${glow}`,
                              transition: 'box-shadow 0.25s, transform 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 32px 4px ${glow}, inset 0 0 40px ${glow}`)}
                            onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 0 0 0 ${glow}`)}
                          >
                              <div
                                className="w-24 h-24 rounded-2xl flex items-center justify-center mb-1 group-hover:scale-110 transition-transform"
                                style={{ background: `${color}18`, border: `1.5px solid ${color}55` }}
                              >
                                  {h === 'ARCHER'    && <Crosshair size={44} style={{ color }} />}
                                  {h === 'WIZARD'    && <Wand2     size={44} style={{ color }} />}
                                  {h === 'BARBARIAN' && <Axe       size={44} style={{ color }} />}
                              </div>

                              <div className="text-center z-10 flex-1">
                                  <h2 className="text-2xl font-black text-white mb-2 tracking-wider" style={{ textShadow: `0 0 16px ${color}88` }}>{h}</h2>
                                  <p className="text-sm text-slate-400 font-medium leading-relaxed px-2">{HERO_STATS[h].description}</p>
                              </div>

                              <div
                                className="mt-2 w-full py-3 rounded-xl font-black text-sm text-center flex items-center justify-center gap-2 transition-opacity"
                                style={{ background: color, color: '#fff', boxShadow: `0 4px 16px ${color}55` }}
                              >
                                  PLAY AS {h} <ArrowRight size={15} />
                              </div>

                              {/* Corner accent */}
                              <div className="absolute top-3 right-3 w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                          </div>
                      ))}
                  </div>

                  <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex gap-8 text-white shadow-xl">
                      <div className="flex items-center gap-3 px-4 border-r border-white/10">
                          <Trophy size={24} className="text-yellow-400" />
                          <div>
                              <div className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Total Runs</div>
                              <div className="text-xl font-black font-mono">{gameStats.totalRuns}</div>
                          </div>
                      </div>
                      <div className="flex items-center gap-3 px-4">
                          <BarChart3 size={24} className="text-blue-400" />
                          <div>
                              <div className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Highest CP</div>
                              <div className="text-xl font-black font-mono">{gameStats.highestCP.toLocaleString()}</div>
                          </div>
                      </div>
                  </div>
              </motion.div>
          </div>
      )}

      {/* GAME UI */}
      {(status === GameStatus.PLAYING || status === GameStatus.PAUSED || status === GameStatus.INVENTORY || status === GameStatus.SHOP || status === GameStatus.LEVEL_UP) && (
        <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-6 pointer-events-none">
          {/* Top Bar */}
          <div className="flex justify-between items-start pointer-events-auto w-full z-20">
             
             {/* Player Status */}
             <div className="flex flex-col gap-2 w-72">
                 <div className="bg-white/90 p-2 rounded-3xl shadow-lg border border-white flex items-center gap-3 backdrop-blur-md">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center border-2 border-slate-200">
                        {hero === 'ARCHER' && <Crosshair size={24} className="text-green-500"/>}
                        {hero === 'WIZARD' && <Wand2 size={24} className="text-blue-500"/>}
                        {hero === 'BARBARIAN' && <Axe size={24} className="text-red-500"/>}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-baseline mb-1 px-1">
                            <span className="font-black text-slate-700 text-sm tracking-tight">{hero} <span className="text-slate-400 text-xs">LVL {level}</span></span>
                            <span className="font-mono text-orange-500 font-bold text-xs">CP:{currentCP}</span>
                        </div>
                        {/* Bars */}
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-1">
                            <motion.div className="h-full bg-red-500" initial={false} animate={{ width: `${hpPercent}%` }} />
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <motion.div className="h-full bg-blue-500" initial={false} animate={{ width: `${manaPercent}%` }} />
                        </div>
                    </div>
                 </div>
                 {/* XP Bar */}
                 <div className="h-3 bg-white/50 rounded-full overflow-hidden border border-white/50 shadow-sm mx-4">
                    <motion.div className="h-full bg-yellow-400" initial={false} animate={{ width: `${xpPercent}%` }} />
                 </div>
             </div>
             
             {/* Boss / Wave Info - MOVED DOWN A BIT TO ACCOMMODATE NOTIFICATIONS */}
             <div className="flex flex-col items-center flex-1 mx-4 mt-12 relative">
                 {/* STANDARD NOTIFICATIONS (ABOVE WAVE TIMER) - Filter out Warnings */}
                 <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center pointer-events-none z-50 w-96">
                      <AnimatePresence>
                          {notifications.filter(n => n.type !== 'WARNING').map((note) => (
                              <NotificationItem key={note.id} note={note} onRemove={removeNotification} />
                          ))}
                      </AnimatePresence>
                 </div>

                 {bossData.active ? (
                     <div className="w-full max-w-md bg-white/90 rounded-2xl p-2 shadow-xl border-2 border-red-100">
                         <div className="flex justify-between text-xs font-black text-red-500 mb-1 px-2 uppercase">
                             <span>{bossData.name}</span>
                             <span>{Math.ceil(bossData.hp).toLocaleString()}</span>
                         </div>
                         <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                             <motion.div className="h-full bg-red-500" animate={{ width: `${Math.max(0, (bossData.hp / bossData.maxHp) * 100)}%` }} />
                         </div>
                     </div>
                 ) : (
                     <div className="flex flex-col items-center">
                         {waveTimer > 30 && (
                             <motion.div 
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="mb-2 px-4 py-1 bg-red-500 text-white font-black text-xs rounded-full shadow-lg border-2 border-red-400 animate-pulse"
                             >
                                 NEXT WAVE IN {(40 - waveTimer).toFixed(0)}s
                             </motion.div>
                         )}
                         <div className="bg-white/90 px-8 py-3 rounded-2xl shadow-xl flex flex-col items-center border-b-4 border-slate-200">
                             <div className="text-3xl font-black text-slate-800 tracking-tighter">WAVE {wave}</div>
                             <div className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full mt-1">
                                 <Timer size={10} /> {Math.floor(waveTimer)}s
                             </div>
                         </div>
                     </div>
                 )}
             </div>

             {/* Currency */}
             <div className="flex gap-3">
                 <div className="bg-white/90 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-slate-100">
                    <div className="bg-emerald-100 p-1 rounded-full"><Gem size={16} className="text-emerald-500" /></div>
                    <span className="font-mono font-bold text-slate-700">{gems.toLocaleString()}</span>
                 </div>
                 <div className="bg-white/90 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-slate-100">
                    <div className="bg-yellow-100 p-1 rounded-full"><Coins size={16} className="text-yellow-500" /></div>
                    <span className="font-mono font-bold text-slate-700">{score.toLocaleString()}</span>
                 </div>
             </div>
          </div>

          {/* Left Sidebar Buttons */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto z-30">
              {([
                { tab: 'CHARACTER' as const, icon: <User size={20} />, label: 'HERO',   action: () => { setPanelTab('CHARACTER'); if (!panelOpen) toggleCharacterSheet(); else if (!isCharacterSheetOpen) { closeAllUI(); setTimeout(toggleCharacterSheet, 10); } } },
                { tab: 'INVENTORY' as const, icon: <Backpack size={20} />, label: 'BAG',    action: () => { setPanelTab('INVENTORY'); if (!panelOpen) toggleInventory(); else if (!isInventoryOpen) { closeAllUI(); setTimeout(toggleInventory, 10); } } },
                { tab: 'CRAFTING'  as const, icon: <Hammer size={20} />,  label: 'FORGE',  action: () => { setPanelTab('CRAFTING');  openSpecificShop('BLACKSMITH'); } },
                { tab: 'SKILLS'    as const, icon: <BookOpen size={20} />, label: 'SKILLS', action: () => { setPanelTab('SKILLS');    openSpecificShop('SKILLS'); } },
                { tab: 'SHOP'      as const, icon: <ShoppingBag size={20} />, label: 'SHOP', action: () => { setPanelTab('SHOP');   openSpecificShop('SUPPLIES'); } },
              ]).map(({ tab, icon, label, action }) => {
                const accent = CLASS_COLOR[hero] ?? '#6366f1';
                const isActive = panelOpen && panelTab === tab;
                return (
                  <button key={tab} onClick={action}
                    className="w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all"
                    style={{
                      background: isActive ? `${accent}22` : 'rgba(10,10,14,0.85)',
                      border: isActive ? `1px solid ${accent}66` : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: isActive ? `0 0 12px ${accent}33` : 'none',
                      color: isActive ? accent : 'rgba(120,120,130,0.8)',
                    }}>
                    {icon}
                    <span className="text-[7px] font-black uppercase tracking-wider">{label}</span>
                  </button>
                );
              })}
          </div>

          {/* BOTTOM HOTBAR */}
          <div className="flex flex-col gap-2 w-full max-w-4xl mx-auto pb-4 items-center z-20 pointer-events-auto">
             <div className="flex justify-center items-end gap-2 md:gap-4">
                
                <UniversalSkillSlot 
                    icon={abilityToCheckR === 'FIREBALL' ? <Flame size={28} className="text-orange-500"/> :
                         abilityToCheckR === 'AXE_SPIN' ? <RotateCcw size={28} className="text-red-500"/> :
                         <Zap size={28} className="text-purple-500"/>}
                    level={skillLevels.weapon} cooldown={skills.r} maxCooldown={skillMaxCooldowns.r * (1 - stats.cooldownReduction)}
                    label="R" desc={weaponAbilityDesc} active={true}
                    manaCost={getManaCost('r')} currentMana={mana} heroClass={hero}
                />

                <UniversalSkillSlot 
                    icon={activeAbilityQ ? <Star size={28} className="text-yellow-500" /> : <div className="text-slate-300 font-bold text-xs">LOCK</div>}
                    level={1} cooldown={skills.q} maxCooldown={skillMaxCooldowns.q * (1 - stats.cooldownReduction)}
                    label="Q" desc={qAbilityDesc} active={!!activeAbilityQ}
                    manaCost={getManaCost('q')} currentMana={mana} heroClass={hero}
                />

                <UniversalSkillSlot 
                    icon={eAbilityIcon} level={skillLevels.special} cooldown={skills.e} maxCooldown={skillMaxCooldowns.e * (1 - stats.cooldownReduction)}
                    label="E" desc={eAbilityDesc} active={skillLevels.special > 0} 
                    manaCost={getManaCost('e')} currentMana={mana} heroClass={hero}
                />

                <div className="w-px h-12 bg-white/20 mx-1"></div>

                <UniversalSkillSlot 
                    icon={<Wind size={28} className="text-green-500" />}
                    level={skillLevels.dash} cooldown={skills.dash} maxCooldown={skillMaxCooldowns.dash * (1 - stats.cooldownReduction)}
                    label="SPACE" desc="Dash. Invincible for 0.2s." active={true}
                    manaCost={getManaCost('dash')} currentMana={mana} heroClass={hero}
                    charges={dashCharges} maxCharges={maxDashCharges}
                />

                {/* Filtered Passive Skills Display */}
                {(hero === 'WIZARD' || !SKILLS_INFO.thunder.classType) && (
                    <UniversalSkillSlot icon={<Zap size={24} className="text-yellow-500"/>} level={skillLevels.thunder} cooldown={passiveSkillState.thunderCooldown} maxCooldown={passiveSkillState.thunderMaxCooldown} desc="Thundercaller" active={skillLevels.thunder > 0} manaCost={getManaCost('thunder')} currentMana={mana} isPassive />
                )}
                
                {(hero === 'BARBARIAN' || !SKILLS_INFO.orbital.classType) && (
                    <UniversalSkillSlot icon={<Activity size={24} className="text-blue-500"/>} level={skillLevels.orbital} cooldown={passiveSkillState.orbitalCooldown} maxCooldown={passiveSkillState.orbitalMaxCooldown} desc="Orbital Blades" active={skillLevels.orbital > 0} manaCost={0} currentMana={mana} isPassive />
                )}

                {(hero === 'WIZARD' || !SKILLS_INFO.storm.classType) && (
                    <UniversalSkillSlot icon={<Tornado size={24} className="text-indigo-500"/>} level={skillLevels.storm} cooldown={passiveSkillState.stormCooldown} maxCooldown={passiveSkillState.stormMaxCooldown} desc="Storm" active={skillLevels.storm > 0} manaCost={0} currentMana={mana} isPassive />
                )}

                {(hero === 'ARCHER' || !SKILLS_INFO.burning.classType) && (
                    <UniversalSkillSlot icon={<Flame size={24} className="text-red-500"/>} level={skillLevels.burning} cooldown={passiveSkillState.burningCooldown} maxCooldown={passiveSkillState.burningMaxCooldown} desc="Burning Arrow" active={skillLevels.burning > 0} manaCost={getManaCost('burning')} currentMana={mana} isPassive />
                )}

                {(hero === 'ARCHER' || !SKILLS_INFO.freezing.classType) && (
                    <UniversalSkillSlot icon={<Gem size={24} className="text-cyan-400"/>} level={skillLevels.freezing} cooldown={passiveSkillState.freezingCooldown} maxCooldown={passiveSkillState.freezingMaxCooldown} desc="Freezing Arrow" active={skillLevels.freezing > 0} manaCost={getManaCost('freezing')} currentMana={mana} isPassive />
                )}

                {(hero === 'WIZARD' || !SKILLS_INFO.freezeSpell.classType) && (
                    <UniversalSkillSlot icon={<Zap size={24} className="text-blue-400"/>} level={skillLevels.freezeSpell} cooldown={passiveSkillState.blizzardCooldown} maxCooldown={passiveSkillState.blizzardMaxCooldown} desc="Blizzard" active={skillLevels.freezeSpell > 0} manaCost={getManaCost('freezeSpell')} currentMana={mana} isPassive />
                )}

                {(hero === 'BARBARIAN' || !SKILLS_INFO.stamp.classType) && (
                    <UniversalSkillSlot icon={<Hammer size={24} className="text-orange-500"/>} level={skillLevels.stamp} cooldown={passiveSkillState.stampCooldown} maxCooldown={passiveSkillState.stampMaxCooldown} desc="Mega Stamp" active={skillLevels.stamp > 0} manaCost={getManaCost('stamp')} currentMana={mana} isPassive />
                )}

                {/* Universal Passives */}
                <UniversalSkillSlot icon={<ShieldCheck size={24} className="text-orange-400"/>} level={skillLevels.barrier} desc="Energy Shield" cooldown={barrierCooldown} maxCooldown={Math.max(10, 48-(skillLevels.barrier * 4))} charges={shieldCharges} maxCharges={maxShieldCharges} active={skillLevels.barrier > 0} manaCost={0} currentMana={mana} isPassive />
                <UniversalSkillSlot icon={<Heart size={24} className="text-green-500"/>} level={skillLevels.regen} desc="Regen" active={skillLevels.regen > 0} manaCost={0} currentMana={mana} isPassive />
                <UniversalSkillSlot icon={<Magnet size={24} className="text-purple-500"/>} level={skillLevels.magnet} desc="Magnet" active={skillLevels.magnet > 0} manaCost={0} currentMana={mana} isPassive />

                <div className="w-px h-12 bg-white/20 mx-1"></div>

                <div className="flex gap-2">
                    <UniversalSkillSlot icon={<Heart size={20} className="text-red-500" />} level={hpPotion?.quantity || 0} cooldown={hpPotionCooldown} maxCooldown={10} desc="HP Potion" active={true} label="1" />
                    <UniversalSkillSlot icon={<FlaskConical size={20} className="text-blue-500" />} level={manaPotion?.quantity || 0} cooldown={mpPotionCooldown} maxCooldown={10} desc="Mana Potion" active={true} label="2" />
                </div>
             </div>
          </div>
          
          <Minimap />
        </div>
      )}

      {/* --- OVERLAYS --- */}
      <div className="absolute inset-0 pointer-events-none">
        <AnimatePresence>
            
            {/* LEVEL UP SCREEN */}
            {status === GameStatus.LEVEL_UP && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto">
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-8 w-full max-w-4xl px-4">
                        <div className="text-center">
                            <h2 className="text-5xl font-black text-yellow-400 mb-2 drop-shadow-xl">WAVE CLEARED!</h2>
                            <p className="text-slate-300 font-bold text-lg">Choose a Reward</p>
                        </div>
                        <div className="grid grid-cols-3 gap-6 w-full">
                            {upgradeOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => selectUpgrade(opt)}
                                    className="bg-white hover:bg-yellow-50 border-4 border-slate-200 hover:border-yellow-400 rounded-3xl p-6 flex flex-col gap-4 text-left transition-all hover:scale-105 shadow-xl group h-64"
                                >
                                    <div className="flex justify-between items-start w-full">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl 
                                            ${opt.rarity === 'COMMON' ? 'bg-slate-200 text-slate-600' :
                                              opt.rarity === 'RARE' ? 'bg-blue-100 text-blue-500' :
                                              opt.rarity === 'EPIC' ? 'bg-purple-100 text-purple-500' :
                                              'bg-yellow-100 text-yellow-600'}
                                        `}>
                                            {opt.type.includes('SKILL') ? <Star size={24}/> : <ArrowUpCircle size={24}/>}
                                        </div>
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${getRarityBg(opt.rarity)} ${getRarityTextColor(opt.rarity)}`}>
                                            {opt.rarity}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="font-black text-xl text-slate-800 leading-tight mb-1">{opt.name}</div>
                                        <div className="text-xs text-slate-500 font-medium leading-relaxed">{opt.description}</div>
                                    </div>
                                    <div className="mt-auto w-full text-center py-2 bg-slate-100 rounded-xl font-bold text-slate-400 group-hover:bg-yellow-400 group-hover:text-black transition-colors">
                                        SELECT
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* INVENTORY SIDEBAR */}
            {isInventoryOpen && (
                <motion.div 
                    key="inventory-modal"
                    initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="absolute left-0 top-0 bottom-0 w-[420px] bg-slate-50 border-r border-slate-200 shadow-2xl flex flex-col pointer-events-auto z-40"
                >
                    <div className="bg-orange-400 p-6 flex justify-between items-center text-white shadow-lg z-10">
                        <div className="flex items-center gap-3">
                            <Backpack size={28} />
                            <h2 className="text-2xl font-black tracking-tight">BAG</h2>
                        </div>
                        <button onClick={toggleInventory} className="bg-white/20 p-2 rounded-full hover:bg-white/30"><X size={24}/></button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar">
                        <div className="grid grid-cols-4 gap-3 mb-6">
                            <EquipmentSlot type="WEAPON" label="Weapon" item={equipment.weapon} onClick={() => unequipItem('weapon')} onUpgrade={() => {}} canUpgrade={false} onHover={setHoveredItem} textColorClass={getRarityTextColor(equipment.weapon?.rarity)} hideUpgrade />
                            <EquipmentSlot type="ARMOR" label="Armor" item={equipment.armor} onClick={() => unequipItem('armor')} onUpgrade={() => {}} canUpgrade={false} onHover={setHoveredItem} textColorClass={getRarityTextColor(equipment.armor?.rarity)} hideUpgrade />
                            <EquipmentSlot type="ACCESSORY" label="Accessory" item={equipment.accessory} onClick={() => unequipItem('accessory')} onUpgrade={() => {}} canUpgrade={false} onHover={setHoveredItem} textColorClass={getRarityTextColor(equipment.accessory?.rarity)} hideUpgrade />
                            <EquipmentSlot type="PET" label="Pet" item={equipment.pet} onClick={() => unequipItem('pet')} onUpgrade={() => {}} canUpgrade={false} onHover={setHoveredItem} textColorClass={getRarityTextColor(equipment.pet?.rarity)} hideUpgrade />
                        </div>

                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">Storage ({inventory.length}/{maxInventorySlots})</span>
                                <button onClick={() => autoEquip()} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full hover:bg-slate-200">AUTO EQUIP</button>
                            </div>
                            <div className="grid grid-cols-5 gap-2 content-start">
                                {sortedInventory.map((item) => {
                                    const locked = RARITY_LEVEL_REQ[item.rarity] > level;
                                    return (
                                        <button
                                            key={item.id} 
                                            onClick={() => !locked && onInventoryItemClick(item)}
                                            onMouseEnter={() => setHoveredItem(item)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                            className={`aspect-square rounded-xl flex items-center justify-center relative group transition-all border-b-4 active:border-b-0 active:translate-y-1
                                                ${getRarityBg(item.rarity)} border-slate-200
                                                ${hoveredItem?.id === item.id ? 'scale-105 z-10 shadow-lg' : ''}
                                                ${locked ? 'grayscale opacity-50' : ''}
                                                ${selectedUpgradeItem?.id === item.id && activeShopTab === 'BLACKSMITH' ? 'ring-4 ring-red-500' : ''}
                                            `}
                                        >
                                            <ItemIcon item={item} size={20} />
                                            {(item.quantity || 1) > 1 && (
                                                <div className="absolute bottom-0 right-0 bg-slate-800 text-[9px] px-1 text-white font-bold rounded-tl-lg">
                                                    {item.quantity}
                                                </div>
                                            )}
                                            {locked && <Lock size={12} className="absolute top-1 left-1 text-red-500" />}
                                        </button>
                                    );
                                })}
                                {[...Array(Math.max(0, maxInventorySlots - inventory.length))].map((_, i) => (
                                    <div key={`empty-${i}`} className="aspect-square bg-slate-100 rounded-xl border border-slate-200 border-dashed" />
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* CHARACTER SHEET MODAL */}
            {isCharacterSheetOpen && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white w-[500px] rounded-3xl shadow-2xl overflow-hidden pointer-events-auto border border-slate-100"
                    >
                        <div className="bg-blue-500 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-3">
                                <User size={28} />
                                <div>
                                    <h2 className="text-2xl font-black leading-none">{hero}</h2>
                                    <span className="text-blue-100 text-xs font-bold">LEVEL {level}</span>
                                </div>
                            </div>
                            <button onClick={toggleCharacterSheet} className="bg-white/20 p-2 rounded-full hover:bg-white/30"><X size={24}/></button>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-6">
                                <StatRow label="Damage" value={Math.floor(stats.damage).toString()} />
                                <StatRow label="Health" value={`${Math.floor(health)}/${stats.maxHealth}`} />
                                <StatRow label="Defense" value={stats.defense.toFixed(1)} />
                                <StatRow label="Mana" value={`${Math.floor(mana)}/${stats.maxMana}`} />
                                <StatRow label="Speed" value={stats.moveSpeed.toFixed(1)} />
                                <StatRow label="Regen" value={`${stats.regen.toFixed(1)}/s`} />
                                <StatRow label="Crit Rate" value={`${(stats.critRate * 100).toFixed(0)}%`} />
                                <StatRow label="Crit Dmg" value={`${(stats.critDamage * 100).toFixed(0)}%`} />
                                <StatRow label="Attack Spd" value={stats.fireRate.toFixed(2)} />
                                <StatRow label="Cooldown" value={`-${(stats.cooldownReduction * 100).toFixed(0)}%`} />
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                                <span className="font-bold text-slate-400 text-sm">TOTAL COMBAT POWER</span>
                                <span className="font-black text-2xl text-orange-500">{currentCP.toLocaleString()}</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* SELL DIALOG POPUP */}
            {sellDialogItem && (
                <div className="absolute inset-0 flex items-center justify-center z-[80] bg-black/40 backdrop-blur-sm pointer-events-auto">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }} 
                        animate={{ scale: 1, opacity: 1 }} 
                        className="bg-white p-6 rounded-3xl shadow-2xl w-96 text-center border-4 border-slate-100"
                    >
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 ${getRarityBg(sellDialogItem.rarity)} border-4 border-white shadow-lg`}>
                            <ItemIcon item={sellDialogItem} size={40} />
                        </div>
                        
                        <h3 className={`font-black text-xl mb-1 ${getRarityTextColor(sellDialogItem.rarity)}`}>
                            {sellDialogItem.name} {sellDialogItem.level > 1 && <span className="text-amber-500">+{sellDialogItem.level-1}</span>}
                        </h3>
                        
                        {/* High Value Warning */}
                        {(sellDialogItem.rarity === 'EPIC' || sellDialogItem.rarity === 'LEGENDARY' || sellDialogItem.rarity === 'MYTHIC' || sellDialogItem.level >= 5) && (
                            <div className="bg-red-50 text-red-500 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1 mb-4">
                                <AlertTriangle size={12} /> HIGH VALUE ITEM
                            </div>
                        )}

                        {/* Quantity Selector */}
                        {(sellDialogItem.quantity || 1) > 1 && (
                            <div className="flex items-center justify-center gap-4 mb-6 mt-2">
                                <button 
                                    onClick={() => setSellAmount(Math.max(1, sellAmount - 1))}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                                >
                                    <Minus size={16} />
                                </button>
                                <div className="font-black text-2xl w-12">{sellAmount}</div>
                                <button 
                                    onClick={() => setSellAmount(Math.min((sellDialogItem.quantity || 1), sellAmount + 1))}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                                >
                                    <Plus size={16} />
                                </button>
                                <button 
                                    onClick={() => setSellAmount(sellDialogItem.quantity || 1)}
                                    className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
                                >
                                    MAX
                                </button>
                            </div>
                        )}

                        <div className="bg-slate-50 p-4 rounded-xl mb-6">
                            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Total Value</div>
                            <div className="text-3xl font-black text-amber-500 flex items-center justify-center gap-2">
                                <Coins size={24} /> 
                                {Math.floor(sellDialogItem.price * 0.3 * sellAmount).toLocaleString()}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setSellDialogItem(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-500">Cancel</button>
                            <button onClick={handleConfirmSell} className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-white shadow-lg shadow-red-200">
                                SELL
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* SHOP MODAL */}
            {isShopOpen && (
                <motion.div 
                    key="shop-modal"
                    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="absolute right-0 top-0 bottom-0 w-[500px] bg-slate-50 border-l border-slate-200 shadow-2xl flex flex-col pointer-events-auto z-40"
                >
                    {/* Header Color based on Tab */}
                    <div className={`p-6 flex justify-between items-center text-white shadow-lg z-10 transition-colors
                        ${activeShopTab === 'SKILLS' ? 'bg-pink-500' : activeShopTab === 'BLACKSMITH' ? 'bg-red-500' : 'bg-blue-500'}
                    `}>
                        <div className="flex items-center gap-3">
                            {activeShopTab === 'SKILLS' ? <BookOpen size={28} /> : activeShopTab === 'BLACKSMITH' ? <Hammer size={28} /> : <ShoppingBag size={28} />}
                            <h2 className="text-2xl font-black tracking-tight">{activeShopTab}</h2>
                        </div>
                        <div className="flex gap-2 text-xs font-bold bg-black/20 px-3 py-1 rounded-full">
                            <span className="text-yellow-300 flex items-center gap-1"><Coins size={12}/> {score.toLocaleString()}</span>
                            {activeShopTab === 'SKILLS' && <span className="text-pink-200 flex items-center gap-1 border-l border-white/20 pl-2"><Star size={12}/> {skillPoints} SP</span>}
                        </div>
                        <button onClick={closeAllUI} className="bg-white/20 p-2 rounded-full hover:bg-white/30"><X size={24}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
                        {/* SKILLS SHOP */}
                        {activeShopTab === 'SKILLS' && (
                            <div className="space-y-4">
                                <div className="text-slate-500 text-xs font-bold uppercase mb-2">Class Skills ({hero})</div>
                                {Object.entries(SKILLS_INFO).map(([key, info]) => {
                                    // @ts-ignore
                                    if (info.classType && info.classType !== hero) return null;
                                    
                                    const skillKey = key as keyof SkillLevels;
                                    const lvl = skillLevels[skillKey];
                                    let cost = lvl + 1;
                                    if (key === 'special') cost = 5;
                                    if (key === 'dash' || key === 'barrier') cost = lvl + 2;
                                    const canAfford = skillPoints >= cost;
                                    const isMax = lvl >= 5;
                                    
                                    return (
                                        <div key={key} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                                            <div className="w-12 h-12 bg-pink-50 text-pink-500 rounded-xl flex items-center justify-center shrink-0">
                                                <Star size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-slate-800">{info.name}</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lvl > 0 ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-400'}`}>LVL {lvl}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 leading-tight mt-1">{info.description}</div>
                                            </div>
                                            <button 
                                                onClick={() => upgradeSkill(skillKey)}
                                                disabled={!canAfford || isMax}
                                                className={`px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95
                                                    ${isMax ? 'bg-slate-100 text-slate-400' : canAfford ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-slate-200 text-slate-400'}
                                                `}
                                            >
                                                {isMax ? 'MAX' : `${cost} SP`}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* SUPPLIES & PETS SHOP (GRID) */}
                        {(activeShopTab === 'SUPPLIES' || activeShopTab === 'PETS') && (
                            <div className="flex flex-col gap-6">
                                <div className="grid grid-cols-5 gap-2 content-start">
                                    {(activeShopTab === 'SUPPLIES' ? ITEMS_POOL.filter(i => i.type === 'POTION' || i.type === 'CORE' || i.type === 'REVIVE') : PETS_POOL).map(item => (
                                        <button 
                                            key={item.id} 
                                            onClick={() => buyItem(item)}
                                            onMouseEnter={() => setHoveredItem(item)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                            className={`aspect-square bg-white rounded-xl border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center relative group
                                                ${score < item.price ? 'opacity-50 grayscale' : 'hover:border-blue-300'}
                                                ${getRarityBg(item.rarity)}
                                            `}
                                        >
                                            <div className="mb-2"><ItemIcon item={item} size={20} /></div>
                                            <div className="absolute top-1 right-1 text-[8px] font-bold text-yellow-500 bg-yellow-50 px-1 rounded border border-yellow-200">{item.price}</div>
                                        </button>
                                    ))}
                                    {/* Fill empty slots to maintain 50-slot look */}
                                    {[...Array(Math.max(0, 50 - (activeShopTab === 'SUPPLIES' ? ITEMS_POOL.filter(i => i.type === 'POTION' || i.type === 'CORE' || i.type === 'REVIVE').length : PETS_POOL.length)))].map((_, i) => (
                                        <div key={`empty-shop-${i}`} className="aspect-square bg-slate-100 rounded-xl border border-slate-200 border-dashed" />
                                    ))}
                                </div>
                                {activeShopTab === 'SUPPLIES' && (
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 mt-2">
                                        <div className="font-bold text-slate-400 text-xs mb-2">QUICK SELL (FROM INVENTORY)</div>
                                        <div className="flex gap-2">
                                            <button onClick={() => massSell('COMMON')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl text-xs font-bold">ALL COMMON</button>
                                            <button onClick={() => massSell('RARE')} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-3 rounded-xl text-xs font-bold">ALL RARE</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* BLACKSMITH SHOP */}
                        {activeShopTab === 'BLACKSMITH' && (
                            <div className="flex flex-col gap-4 h-full">
                                <div className="flex bg-slate-200 p-1 rounded-xl">
                                    {(['UPGRADE', 'RECYCLE', 'CRAFT'] as const).map(tab => (
                                        <button 
                                            key={tab} 
                                            onClick={() => { setBlacksmithTab(tab); setSelectedUpgradeItem(null); }}
                                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${blacksmithTab === tab ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                                {blacksmithTab === 'UPGRADE' && (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                        {selectedUpgradeItem ? (
                                            <div className="w-full bg-white p-6 rounded-3xl shadow-lg border border-slate-100 flex flex-col items-center gap-4">
                                                <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center border-4 border-slate-100"><ItemIcon item={selectedUpgradeItem} size={40}/></div>
                                                <div>
                                                    <div className="font-black text-xl text-slate-800">{selectedUpgradeItem.name}</div>
                                                    <div className="text-sm font-bold text-slate-400">Level {selectedUpgradeItem.level} <span className="text-green-500">→ {selectedUpgradeItem.level + 1}</span></div>
                                                </div>
                                                
                                                <div className="w-full h-px bg-slate-100 my-2" />
                                                
                                                <div className="grid grid-cols-2 w-full gap-2 text-xs">
                                                    <div className="bg-slate-50 p-2 rounded-lg">
                                                        <div className="text-slate-400 font-bold uppercase">Cost</div>
                                                        <div className="font-mono font-black text-yellow-500">{Math.floor(selectedUpgradeItem.price * selectedUpgradeItem.level * 0.5)} G</div>
                                                    </div>
                                                    <div className="bg-slate-50 p-2 rounded-lg">
                                                        <div className="text-slate-400 font-bold uppercase">Cores</div>
                                                        <div className="font-mono font-black text-blue-500">{Math.ceil(selectedUpgradeItem.level / 2)}</div>
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={() => upgradeItem(selectedUpgradeItem)}
                                                    className="w-full bg-red-500 text-white py-4 rounded-xl font-bold shadow-red-200 shadow-lg hover:bg-red-600 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-2"
                                                >
                                                    <Hammer size={18} /> FORGE
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-slate-400 text-sm font-bold flex flex-col items-center gap-4 opacity-50">
                                                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center"><Anvil size={40}/></div>
                                                Select an item from your Inventory (Left) to Upgrade.
                                            </div>
                                        )}
                                    </div>
                                )}
                                {blacksmithTab === 'RECYCLE' && (
                                    <div className="flex-1 flex flex-col gap-4">
                                        {/* Material Wallet */}
                                        <div className="grid grid-cols-5 gap-1 bg-slate-100 p-2 rounded-xl">
                                            {(['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'] as Rarity[]).map(r => (
                                                <div key={r} className={`flex flex-col items-center p-2 rounded-lg ${getRarityBg(r)}`}>
                                                    <span className={`text-[8px] font-black ${getRarityTextColor(r)}`}>{r.substring(0,3)}</span>
                                                    <span className="font-mono font-bold text-xs text-slate-800">{materials[r]}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {selectedUpgradeItem ? (
                                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-3">
                                                <div className="text-xs text-slate-400 font-bold uppercase">Selected Item</div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getRarityBg(selectedUpgradeItem.rarity)}`}><ItemIcon item={selectedUpgradeItem} size={20}/></div>
                                                    <div className="text-sm font-bold text-slate-700">{selectedUpgradeItem.name}</div>
                                                </div>
                                                <button 
                                                    onClick={() => recycleItem(selectedUpgradeItem)}
                                                    className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 flex items-center justify-center gap-2"
                                                >
                                                    <Recycle size={16} /> Recycle (+{RECYCLE_YIELDS[selectedUpgradeItem.rarity]} {selectedUpgradeItem.rarity})
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-slate-200 text-center text-xs text-slate-400 font-bold py-8">
                                                Select item from Inventory to Recycle
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <div className="text-xs font-bold text-slate-400 uppercase">Mass Recycle</div>
                                            <div className="flex gap-2">
                                                <button onClick={() => massRecycle('COMMON')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-lg text-[10px] font-bold">ALL COMMON</button>
                                                <button onClick={() => massRecycle('RARE')} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-lg text-[10px] font-bold">ALL RARE</button>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mt-auto">
                                            <div className="text-xs font-bold text-slate-400 uppercase">Material Conversion</div>
                                            {(['COMMON', 'RARE', 'EPIC', 'LEGENDARY'] as Rarity[]).map((r, i) => {
                                                const nextRarity = (['RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'] as Rarity[])[i];
                                                return (
                                                    <button 
                                                        key={r}
                                                        onClick={() => combineMaterials(r)}
                                                        className="w-full flex justify-between items-center bg-white border border-slate-100 px-3 py-2 rounded-lg hover:bg-slate-50 active:scale-95 transition-transform"
                                                    >
                                                        <span className="text-[10px] font-bold text-slate-500">{MATERIAL_COMBINE_COST} {r} <span className="text-slate-300">→</span> 1 {nextRarity}</span>
                                                        <RefreshCcw size={12} className="text-slate-400" />
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                                {blacksmithTab === 'CRAFT' && (
                                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                        <div className="text-center text-xs text-slate-400 font-bold mb-4">Craft random items using Shards</div>
                                        <div className="space-y-3">
                                            {(['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'] as Rarity[]).map(r => (
                                                <button 
                                                    key={r}
                                                    onClick={() => craftItem(r)}
                                                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group active:scale-95
                                                        ${materials[r] >= CRAFTING_COSTS[r] ? 'bg-white border-slate-100 hover:border-slate-300' : 'bg-slate-50 border-transparent opacity-60'}
                                                    `}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getRarityBg(r)}`}>
                                                            <PenTool size={20} className={getRarityTextColor(r)} />
                                                        </div>
                                                        <div className="text-left">
                                                            <div className={`font-black text-sm ${getRarityTextColor(r)}`}>{r} ITEM</div>
                                                            <div className="text-[10px] font-bold text-slate-400">Random {r} Equipment</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`font-black font-mono ${materials[r] >= CRAFTING_COSTS[r] ? 'text-slate-800' : 'text-red-500'}`}>
                                                            {CRAFTING_COSTS[r]} Shards
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-400">Own: {materials[r]}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* HOVER TOOLTIP */}
            {hoveredItem && !sellDialogItem && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="fixed z-[60] bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 w-64 pointer-events-none"
                    style={{ 
                        left: Math.min(window.innerWidth - 280, mousePos.x + 20), 
                        top: Math.min(window.innerHeight - 200, mousePos.y + 20) 
                    }}
                >
                    <div className="flex gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getRarityBg(hoveredItem.rarity)}`}>
                            <ItemIcon item={hoveredItem} size={24} />
                        </div>
                        <div>
                            <div className={`font-black text-sm ${getRarityTextColor(hoveredItem.rarity)}`}>
                                {hoveredItem.name} {hoveredItem.level > 1 && <span className="text-amber-500">+{hoveredItem.level-1}</span>}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">{hoveredItem.rarity} {hoveredItem.type}</div>
                        </div>
                    </div>
                    <div className="h-px bg-slate-100 w-full mb-3" />
                    <div className="text-xs text-slate-600 font-medium mb-3">{hoveredItem.description}</div>
                    
                    {hoveredItem.stats && (
                        <div className="grid grid-cols-2 gap-1 mb-2">
                            {Object.entries(hoveredItem.stats).map(([k, v]) => (
                                <div key={k} className="flex justify-between text-[10px]">
                                    <span className="text-slate-400 font-bold capitalize">{k}</span>
                                    <span className="text-slate-800 font-mono">{formatStat(k, v as number)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="text-right text-xs font-black text-amber-500 mt-2">Sell: {Math.floor(hoveredItem.price * 0.3)} G</div>
                </motion.div>
            )}

            {/* GAME OVER SCREEN - FIXED Z-INDEX & POINTER EVENTS */}
            {status === GameStatus.GAME_OVER && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto">
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }} 
                        animate={{ scale: 1, opacity: 1 }} 
                        className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md w-full border-4 border-slate-100"
                    >
                        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 border-4 border-red-50">
                            <Skull size={48} />
                        </div>
                        <h2 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">DEFEATED</h2>
                        <p className="text-slate-500 font-bold mb-8">You survived until <span className="text-blue-500">Wave {wave}</span></p>
                        
                        <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase">Total Gold Earned</span>
                                <span className="text-lg font-mono font-black text-amber-500">+{score.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase">Runs Completed</span>
                                <span className="text-lg font-mono font-black text-slate-800">{gameStats.totalRuns}</span>
                            </div>
                        </div>

                        <button 
                            onClick={resetGame}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-transform"
                        >
                            RETURN TO MENU
                        </button>
                    </motion.div>
                </div>
            )}

        </AnimatePresence>
      </div>
    </div>
  );
};
