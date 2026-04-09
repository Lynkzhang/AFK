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

    const deltaTime = (time - this.lastTime) / 1000;
    this.lastTime = time;
    this.elapsedTime += deltaTime;

    this.update(deltaTime, this.elapsedTime);
    this.render();

    requestAnimationFrame(this.tick);
  };
}
