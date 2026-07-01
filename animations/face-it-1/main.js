import * as THREE from 'three';
import { createFaceMesh, updateFacePulse } from './faceMesh.js';

const overlay = document.getElementById('overlay');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  50,
);
camera.position.set(0, 0, 3.1);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const keyLight = new THREE.DirectionalLight(0xfff2ea, 1.15);
keyLight.position.set(1.2, 1.4, 2.4);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x8eb4ff, 0.35);
fillLight.position.set(-1.5, 0.2, 1.2);
scene.add(fillLight);

const faceGroup = new THREE.Group();
scene.add(faceGroup);

let faceMesh = null;
let hasInteracted = false;
let isDragging = false;
let shiftDrag = false;
let lastX = 0;
let lastY = 0;

const targetRotation = new THREE.Euler(0.02, 0, 0, 'YXZ');
const currentRotation = new THREE.Euler(0.02, 0, 0, 'YXZ');
const targetPosition = new THREE.Vector3(0, 0, 0);
const currentPosition = new THREE.Vector3(0, 0, 0);
let targetZoom = 3.1;
const autoRotateSpeed = 0.1;

async function initFace() {
  faceMesh = await createFaceMesh(new URL('./assets/face.png', import.meta.url).href);
  faceGroup.add(faceMesh);
}

function hideOverlay() {
  if (!hasInteracted) {
    hasInteracted = true;
    overlay.classList.add('hidden');
  }
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
    targetZoom = THREE.MathUtils.clamp(targetZoom + event.deltaY * 0.0025, 1.8, 5.5);
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
  const { innerWidth, innerHeight } = window;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  const dt = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  if (!isDragging) {
    targetRotation.y += autoRotateSpeed * dt;
  }

  currentRotation.x = THREE.MathUtils.lerp(currentRotation.x, targetRotation.x, 0.12);
  currentRotation.y = THREE.MathUtils.lerp(currentRotation.y, targetRotation.y, 0.12);
  currentPosition.lerp(targetPosition, 0.12);
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZoom, 0.12);

  faceGroup.rotation.copy(currentRotation);
  faceGroup.position.copy(currentPosition);
  faceGroup.position.y += Math.sin(elapsed * 0.9) * 0.01;

  if (faceMesh) {
    updateFacePulse(faceMesh, elapsed);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

initFace().then(animate);
