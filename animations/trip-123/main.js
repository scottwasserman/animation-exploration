import * as THREE from 'three';
import { vertexShader, fragmentShader } from './shaders/index.js';

const overlay = document.getElementById('overlay');

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
document.body.appendChild(renderer.domElement);

const uniforms = {
  uTime: { value: 0 },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  uPulse: { value: 0 },
};

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
});

const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(mesh);

const targetMouse = new THREE.Vector2(0.5, 0.5);
const smoothMouse = new THREE.Vector2(0.5, 0.5);
let pulse = 0;
let hasInteracted = false;

function setMouseFromEvent(event) {
  const x = event.clientX / window.innerWidth;
  const y = 1 - event.clientY / window.innerHeight;
  targetMouse.set(x, y);

  if (!hasInteracted) {
    hasInteracted = true;
    overlay.classList.add('hidden');
  }
}

window.addEventListener('pointermove', setMouseFromEvent);
window.addEventListener('pointerdown', (event) => {
  pulse = 1;
  setMouseFromEvent(event);
});

// Fade the intro chrome so the stereogram can take over
window.setTimeout(() => {
  if (!hasInteracted) {
    hasInteracted = true;
    overlay.classList.add('hidden');
  }
}, 2800);

window.addEventListener('resize', () => {
  const { innerWidth, innerHeight } = window;
  renderer.setSize(innerWidth, innerHeight);
  uniforms.uResolution.value.set(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
let timeOffset = 0;

// Dev/debug: window.__tripTime = seconds to jump the morph cycle
Object.defineProperty(window, '__tripTime', {
  get() {
    return uniforms.uTime.value;
  },
  set(value) {
    timeOffset = Number(value) - clock.getElapsedTime();
  },
});

function animate() {
  uniforms.uTime.value = clock.getElapsedTime() + timeOffset;

  smoothMouse.lerp(targetMouse, 0.07);
  uniforms.uMouse.value.copy(smoothMouse);

  pulse *= 0.9;
  uniforms.uPulse.value = pulse;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
