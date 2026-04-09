export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface SlimeState {
  id: string;
  name: string;
  level: number;
  hp: number;
  position: Vector3Like;
}

export interface WorldState {
  gold: number;
  stage: number;
  lastTick: number;
}

export interface GameState {
  version: number;
  world: WorldState;
  slimes: SlimeState[];
}

export interface RuntimeStats {
  fps: number;
  deltaMs: number;
  elapsedMs: number;
}

export interface GameLoopContext {
  update: (deltaSeconds: number, elapsedSeconds: number) => void;
  render: () => void;
}
