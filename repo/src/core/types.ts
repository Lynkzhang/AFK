export enum Rarity {
  Common = 'Common',
  Rare = 'Rare',
  Epic = 'Epic',
}

export interface Stats {
  health: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface Trait {
  id: string;
  name: string;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  power: number;
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
  assignedSlimeIds: string[];
}

export interface Facility {
  id: string;
  name: string;
  level: number;
  active: boolean;
}

export interface GameState {
  slimes: Slime[];
  breedingGrounds: BreedingGround[];
  facilities: Facility[];
  currency: number;
  timestamp: number;
}
