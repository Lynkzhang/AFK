import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GameState } from '../types';

interface SlimeVisual {
  mesh: THREE.Mesh;
  baseY: number;
  phase: number;
}

export class SceneManager {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly slimeVisuals = new Map<string, SlimeVisual>();

  constructor(private readonly container: HTMLElement) {
    this.scene.background = new THREE.Color(0x1f2330);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.set(6, 7, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.initLights();
    this.initGrid();
    window.addEventListener('resize', this.onResize);
  }

  private initLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(6, 10, 4);
    this.scene.add(ambient, directional);
  }

  private initGrid(): void {
    const grid = new THREE.GridHelper(16, 16, 0x5f6b84, 0x3d465b);
    this.scene.add(grid);
  }

  sync(state: GameState): void {
    const currentIds = new Set(state.slimes.map((slime) => slime.id));
    for (const [id, visual] of this.slimeVisuals) {
      if (!currentIds.has(id)) {
        this.scene.remove(visual.mesh);
        visual.mesh.geometry.dispose();
        (visual.mesh.material as THREE.MeshStandardMaterial).dispose();
        this.slimeVisuals.delete(id);
      }
    }

    for (const slime of state.slimes) {
      if (!this.slimeVisuals.has(slime.id)) {
        const geometry = new THREE.SphereGeometry(0.5, 24, 24);
        const material = new THREE.MeshStandardMaterial({ color: slime.color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(slime.position.x, slime.position.y, slime.position.z);
        this.scene.add(mesh);
        this.slimeVisuals.set(slime.id, {
          mesh,
          baseY: slime.position.y,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
  }

  update(state: GameState, elapsedTime: number): void {
    this.sync(state);

    for (const slime of state.slimes) {
      const visual = this.slimeVisuals.get(slime.id);
      if (!visual) continue;

      visual.mesh.position.x = slime.position.x;
      visual.mesh.position.z = slime.position.z;
      visual.mesh.position.y = visual.baseY + Math.abs(Math.sin(elapsedTime * 2 + visual.phase)) * 0.3;
    }

    this.controls.update();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private onResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };
}
