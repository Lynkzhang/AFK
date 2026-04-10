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
  position: Position;
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

export type ItemType = 'mutation-catalyst' | 'stat-booster' | 'rare-essence';

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
}
