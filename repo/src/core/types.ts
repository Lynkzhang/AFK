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
}

export interface GameState {
  slimes: Slime[];
  breedingGrounds: BreedingGround[];
  facilities: Facility[];
  currency: number;
  timestamp: number;
}
