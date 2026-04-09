import * as THREE from 'three';
import type { GameState } from './types';

export interface ThreeSceneController {
  mount: (container: HTMLElement) => void;
  updateFromState: (state: GameState, elapsedSeconds: number) => void;
  render: () => void;
  resize: () => void;
}

export function createThreeScene(): ThreeSceneController {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0f172a');

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 3, 7);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const ambient = new THREE.AmbientLight('#ffffff', 0.6);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight('#ffffff', 1.2);
  directional.position.set(4, 6, 2);
  scene.add(directional);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(8, 64),
    new THREE.MeshStandardMaterial({ color: '#14532d' }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const slimeMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 32, 24),
    new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.45, metalness: 0.05 }),
  );
  slimeMesh.position.y = 0.8;
  scene.add(slimeMesh);

  let host: HTMLElement | null = null;

  function resize(): void {
    if (!host) return;
    const { clientWidth, clientHeight } = host;
    if (clientWidth <= 0 || clientHeight <= 0) return;
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight, false);
  }

  return {
    mount(container) {
      host = container;
      container.appendChild(renderer.domElement);
      resize();
      window.addEventListener('resize', resize);
    },
    updateFromState(state, elapsedSeconds) {
      const slime = state.slimes[0];
      if (slime) {
        slimeMesh.position.x = slime.position.x;
        slimeMesh.position.z = slime.position.z;
      }
      slimeMesh.scale.y = 0.9 + Math.sin(elapsedSeconds * 4) * 0.1;
      slimeMesh.rotation.y = elapsedSeconds * 0.6;
    },
    render() {
      renderer.render(scene, camera);
    },
    resize,
  };
}
