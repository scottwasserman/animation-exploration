import * as THREE from 'three';
import { createHeartModel, updateHeartPulse } from './heartModel.js';

const overlay = document.getElementById('overlay');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8a8a8a);

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 0.15, 3.4);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.32));
const keyLight = new THREE.DirectionalLight(0xfff8f0, 0.88);
keyLight.position.set(2.5, 4, 3.5);
keyLight.castShadow = true;
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0xdde4ff, 0.55);
rimLight.position.set(-3, 1.5, -2);
scene.add(rimLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.28);
fillLight.position.set(-1.5, -0.5, 3);
scene.add(fillLight);

const heartGroup = new THREE.Group();
scene.add(heartGroup);

let heartModel = null;
let hasInteracted = false;
let isDragging = false;
let shiftDrag = false;
let lastX = 0;
let lastY = 0;

const targetRotation = new THREE.Euler(-0.08, 0.35, 0, 'YXZ');
const currentRotation = new THREE.Euler(-0.08, 0.35, 0, 'YXZ');
const targetPosition = new THREE.Vector3(0, 0, 0);
const currentPosition = new THREE.Vector3(0, 0, 0);
let targetZoom = 3.4;
const autoRotateSpeed = 0.06;

function hideOverlay() {
  if (hasInteracted) return;
  hasInteracted = true;
  overlay?.classList.add('hidden');
}

function onPointerDown(event) {
  if (event.button !== 0) return;
  isDragging = true;
  shiftDrag = event.shiftKey;
  lastX = event.clientX;
  lastY = event.clientY;
  renderer.domElement.setPointerCapture(event.pointerId);
  hideOverlay();
}

function onPointerMove(event) {
  if (!isDragging) return;

  const dx = event.clientX - lastX;
  const dy = event.clientY - lastY;
  lastX = event.clientX;
  lastY = event.clientY;

  if (event.shiftKey || shiftDrag) {
    targetPosition.x += dx * 0.004;
    targetPosition.y -= dy * 0.004;
    return;
  }

  targetRotation.y += dx * 0.006;
  targetRotation.x += dy * 0.006;
  targetRotation.x = THREE.MathUtils.clamp(targetRotation.x, -0.75, 0.75);
}

function onPointerUp(event) {
  isDragging = false;
  renderer.domElement.releasePointerCapture(event.pointerId);
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('pointermove', onPointerMove);
renderer.domElement.addEventListener('pointerup', onPointerUp);
renderer.domElement.addEventListener('pointercancel', onPointerUp);

window.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    targetZoom = THREE.MathUtils.clamp(targetZoom + event.deltaY * 0.0025, 2, 6);
    hideOverlay();
  },
  { passive: false },
);

window.addEventListener('keydown', (event) => {
  if (event.key === 'Shift') shiftDrag = isDragging;
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'Shift') shiftDrag = false;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  if (!isDragging) {
    targetRotation.y += autoRotateSpeed * dt;
  }

  currentRotation.x = THREE.MathUtils.lerp(currentRotation.x, targetRotation.x, 0.12);
  currentRotation.y = THREE.MathUtils.lerp(currentRotation.y, targetRotation.y, 0.12);
  currentPosition.lerp(targetPosition, 0.12);
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZoom, 0.12);
  camera.lookAt(currentPosition);

  heartGroup.rotation.copy(currentRotation);
  heartGroup.position.copy(currentPosition);

  if (heartModel) {
    updateHeartPulse(heartModel, elapsed, dt);
  }

  renderer.render(scene, camera);
}

createHeartModel(new URL('./assets/heart.glb', import.meta.url).href)
  .then((heart) => {
    heartModel = heart;
    heartGroup.add(heartModel);
    animate();
  })
  .catch((error) => {
    console.error(error);
  });
