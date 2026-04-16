export interface GameLoopOptions {
  update: (deltaTime: number, elapsedTime: number) => void;
  render: () => void;
}

export class GameLoop {
  private readonly update: GameLoopOptions['update'];
  private readonly render: GameLoopOptions['render'];
  private running = false;
  private lastTime = 0;
  private elapsedTime = 0;

  constructor(options: GameLoopOptions) {
    this.update = options.update;
    this.render = options.render;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
  }

  private tick = (time: number): void => {
    if (!this.running) return;

    // Clamp delta to [0, 0.1] to prevent negative deltas (timer jitter) or
    // huge deltas (tab was backgrounded).
    const rawDelta = (time - this.lastTime) / 1000;
    const deltaTime = Math.max(0, Math.min(0.1, rawDelta));
    this.lastTime = time;
    this.elapsedTime = Math.max(0, this.elapsedTime + deltaTime);

    this.update(deltaTime, this.elapsedTime);
    this.render();

    requestAnimationFrame(this.tick);
  };
}
