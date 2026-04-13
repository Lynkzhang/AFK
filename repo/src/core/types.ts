export enum Rarity {
  Common = 'Common',
  Uncommon = 'Uncommon',
  Rare = 'Rare',
  Epic = 'Epic',
  Legendary = 'Legendary',
}

export interface Stats {
  health: number;
  attack: number;
  defense: number;
  speed: number;
  mut: number;
}

export interface Trait {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  effect: string;
}

export interface Skill {
  id: string;
  name: string;
  type: 'attack' | 'defense' | 'support' | 'heal';
  targetType: string;
  damage: number;
  cooldown: number;
}

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Slime {
  id: string;
  name: string;
  stats: Stats;
  traits: Trait[];
  skills: Skill[];
  rarity: Rarity;
  generation: number;
  parentId: string | null;
  color: string;
  equippedAccessoryId?: string;
  position: Position;
  splitAccumulatedMs?: number;
}

export interface BreedingGround {
  id: string;
  name: string;
  level: number;
  capacity: number;
  slimes: Slime[];
  facilityLevel: number;
}

export interface Facility {
  id: string;
  name: string;
  level: number;
  active: boolean;
  effect: string;
  upgradeCost: number;
  maxLevel: number;
}

export interface StageProgress {
  stars: 0 | 1 | 2 | 3;
}

export type ItemType = 'mutation-catalyst' | 'stat-booster' | 'rare-essence' | 'split-accelerator';

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  quantity: number;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currencyType: 'gold' | 'crystal';
  itemType: ItemType;
}

// Quest Types

export type QuestCategory = 'daily' | 'achievement' | 'bounty';
export type QuestStatus = 'active' | 'completed' | 'claimed';

export interface QuestReward {
  gold?: number;
  crystal?: number;
  items?: { type: ItemType; quantity: number }[];
}

export interface QuestTemplate {
  id: string;
  name: string;
  description: string;
  category: QuestCategory;
  conditionKey: string;
  targetValue: number;
  reward: QuestReward;
  bountyCriteria?: {
    minRarity?: Rarity;
    minTotalStats?: number;
    requiredTraitId?: string;
  };
}

export interface QuestProgress {
  questId: string;
  currentValue: number;
  status: QuestStatus;
}

export interface CodexData {
  unlockedRarities: string[];
  unlockedTraits: string[];
  unlockedSkills: string[];
}

// Accessory Types
export type AccessoryKind = 'stat' | 'tendency' | 'rare';

export interface AccessoryEffect {
  statBonuses?: Partial<Record<keyof Stats, number>>;
  tendencyBias?: string;
  description: string;
}

export interface Accessory {
  id: string;
  templateId: string;
  name: string;
  kind: AccessoryKind;
  rarity: Rarity;
  effect: AccessoryEffect;
}

export interface AccessoryTemplate {
  id: string;
  name: string;
  kind: AccessoryKind;
  rarity: Rarity;
  effect: AccessoryEffect;
  shopPrice?: number;
  shopCurrency?: 'gold' | 'crystal';
}

export type ArenaId = 'grassland' | 'fire-land' | 'ice-cave' | 'mystic-forest';

export interface Arena {
  id: ArenaId;
  name: string;
  description: string;
  price: number;
  currencyType: 'gold' | 'crystal';
  owned: boolean;
  statBonus: Partial<Record<keyof Stats, number>>;
  mutationBias: {
    preferTraitIds?: string[];
    preferSkillTypes?: string[];
    rarityWeightBonus?: number;
  };
}

export interface MutationModifiers {
  statBonuses: Partial<Record<keyof Stats, number>>;
  preferTraitIds: string[];
  preferSkillTypes: string[];
  rarityWeightBonus: number;
}

export interface FeatureUnlocks {
  breeding: boolean;
  cull: boolean;
  sell: boolean;
  archive: boolean;
  battle: boolean;
  facility: boolean;
  shop: boolean;
  quest: boolean;
  codex: boolean;
  arena: boolean;
  accessories: boolean;
}

export interface OnboardingState {
  currentStep: string | null;
  completedSteps: string[];
  unlocks: FeatureUnlocks;
}

export interface GameState {
  slimes: Slime[];
  breedingGrounds: BreedingGround[];
  facilities: Facility[];
  currency: number;
  crystal: number;
  timestamp: number;
  stageProgress: Record<string, StageProgress>;
  archivedSlimes: Slime[];
  archiveCapacity: number;
  items: Item[];
  unlockedChapters: number;
  quests: QuestProgress[];
  questDailyRefreshTime: number;
  questCounters: Record<string, number>;
  codex: CodexData;
  arenas: Arena[];
  activeArenaId: ArenaId;
  accessories: Accessory[];
  onboarding: OnboardingState;
  activeBuffs: {
    mutationCatalystActive: boolean;
    rareEssenceActive: boolean;
    splitFieldAcceleratorUntil?: number;
  };
}
