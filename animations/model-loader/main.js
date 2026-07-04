import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const overlay = document.getElementById('overlay');
const statusEl = document.getElementById('status');
const fileInput = document.getElementById('model-input');

const DEFAULT_MODEL_URL = new URL('./assets/3d_scanned_face.glb', import.meta.url).href;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.01,
  1000,
);
camera.position.set(0, 0.5, 4);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const keyLight = new THREE.DirectionalLight(0xfff2ea, 1.1);
keyLight.position.set(2, 3, 4);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x8eb4ff, 0.45);
fillLight.position.set(-3, 1, 2);
scene.add(fillLight);

const gridHelper = new THREE.GridHelper(6, 24, 0x2a3348, 0x151820);
gridHelper.position.y = -0.001;
scene.add(gridHelper);

const modelGroup = new THREE.Group();
scene.add(modelGroup);

const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();

let currentModel = null;
let mixer = null;
let hasInteracted = false;
let isDragging = false;
let shiftDrag = false;
let lastX = 0;
let lastY = 0;

const targetRotation = new THREE.Euler(0, 0, 0, 'YXZ');
const currentRotation = new THREE.Euler(0, 0, 0, 'YXZ');
const targetPosition = new THREE.Vector3(0, 0, 0);
const currentPosition = new THREE.Vector3(0, 0, 0);
let targetZoom = 4;
const autoRotateSpeed = 0.08;
const box = new THREE.Box3();
const size = new THREE.Vector3();
const center = new THREE.Vector3();

function setStatus(message, { error = false } = {}) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', error);
  statusEl.classList.toggle('hidden', !message);
}

function hideOverlay() {
  if (hasInteracted) return;
  hasInteracted = true;
  overlay?.classList.add('hidden');
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.dispose();
        }
        material.dispose();
      }
    }
  });
}

function clearModel() {
  if (mixer) {
    mixer.stopAllAction();
    mixer = null;
  }

  if (currentModel) {
    modelGroup.remove(currentModel);
    disposeObject(currentModel);
    currentModel = null;
  }
}

function updateObjectBounds(object) {
  box.makeEmpty();
  object.updateMatrixWorld(true);

  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    child.geometry.computeBoundingBox();
    const meshBox = child.geometry.boundingBox.clone();
    meshBox.applyMatrix4(child.matrixWorld);
    box.union(meshBox);
  });

  if (box.isEmpty()) {
    box.setFromObject(object);
  }

  box.getSize(size);
  box.getCenter(center);
}

function frameModel(object) {
  object.position.set(0, 0, 0);
  object.rotation.set(0, 0, 0);
  object.scale.set(1, 1, 1);
  object.updateMatrixWorld(true);

  updateObjectBounds(object);

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  object.scale.setScalar(4.5 / maxDim);
  object.updateMatrixWorld(true);

  updateObjectBounds(object);
  object.position.sub(center);
  object.updateMatrixWorld(true);

  updateObjectBounds(object);
  object.position.y -= box.min.y;
  object.updateMatrixWorld(true);

  updateObjectBounds(object);

  const fovRadians = camera.fov * (Math.PI / 180);
  const fitDistance = Math.max(
    size.y / (2 * Math.tan(fovRadians / 2)),
    size.x / (2 * Math.tan(fovRadians / 2) * camera.aspect),
  ) * 1.15;

  targetRotation.set(0, 0, 0);
  currentRotation.set(0, 0, 0);
  targetPosition.set(center.x, center.y, center.z);
  currentPosition.copy(targetPosition);
  targetZoom = fitDistance;
  camera.position.z = fitDistance;
}

function applyDefaultMaterial(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.material = new THREE.MeshStandardMaterial({
      color: 0xb8c8e8,
      metalness: 0.15,
      roughness: 0.55,
    });
  });
}

async function loadGltf(url) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(url, resolve, undefined, reject);
  });
}

async function loadObj(url) {
  return new Promise((resolve, reject) => {
    objLoader.load(url, resolve, undefined, reject);
  });
}

async function displayModel(loadedObject, animations, label) {
  currentModel = loadedObject;
  modelGroup.add(currentModel);
  frameModel(currentModel);

  if (animations.length > 0) {
    mixer = new THREE.AnimationMixer(currentModel);
    for (const clip of animations) {
      mixer.clipAction(clip).play();
    }
  }

  const animationNote = animations.length > 0 ? ` · ${animations.length} animation(s)` : '';
  setStatus(`Loaded ${label}${animationNote}`);
}

async function loadModelFromUrl(url, label) {
  clearModel();
  setStatus(`Loading ${label}…`);

  try {
    const gltf = await loadGltf(url);
    await displayModel(gltf.scene, gltf.animations, label);
  } catch (error) {
    console.error(error);
    setStatus(`Failed to load ${label}`, { error: true });
  }
}

async function loadModelFromFile(file) {
  if (!file) return;

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!['glb', 'gltf', 'obj'].includes(extension)) {
    setStatus('Unsupported format. Use GLB, glTF, or OBJ.', { error: true });
    return;
  }

  clearModel();
  setStatus(`Loading ${file.name}…`);
  hideOverlay();

  const objectUrl = URL.createObjectURL(file);

  try {
    let loadedObject;
    let animations = [];

    if (extension === 'obj') {
      loadedObject = await loadObj(objectUrl);
      applyDefaultMaterial(loadedObject);
    } else {
      const gltf = await loadGltf(objectUrl);
      loadedObject = gltf.scene;
      animations = gltf.animations;
    }

    await displayModel(loadedObject, animations, file.name);
  } catch (error) {
    console.error(error);
    setStatus(`Failed to load ${file.name}`, { error: true });
  } finally {
    URL.revokeObjectURL(objectUrl);
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
  targetRotation.x = THREE.MathUtils.clamp(targetRotation.x, -Math.PI * 0.48, Math.PI * 0.48);
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
    targetZoom = THREE.MathUtils.clamp(targetZoom + event.deltaY * 0.006, 1.5, 20);
    hideOverlay();
  },
  { passive: false },
);

window.addEventListener('keydown', (event) => {
  if (event.key === 'Shift') shiftDrag = isDragging;
  hideOverlay();
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'Shift') shiftDrag = false;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

fileInput.addEventListener('change', (event) => {
  const [file] = event.target.files;
  loadModelFromFile(file);
  event.target.value = '';
});

window.addEventListener('dragover', (event) => {
  event.preventDefault();
  document.body.classList.add('drag-active');
});

window.addEventListener('dragleave', (event) => {
  if (event.relatedTarget) return;
  document.body.classList.remove('drag-active');
});

window.addEventListener('drop', (event) => {
  event.preventDefault();
  document.body.classList.remove('drag-active');
  const [file] = event.dataTransfer.files;
  loadModelFromFile(file);
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (mixer) mixer.update(delta);

  if (!isDragging && currentModel) {
    targetRotation.y += delta * autoRotateSpeed;
  }

  currentRotation.x = THREE.MathUtils.lerp(currentRotation.x, targetRotation.x, 0.12);
  currentRotation.y = THREE.MathUtils.lerp(currentRotation.y, targetRotation.y, 0.12);
  currentPosition.lerp(targetPosition, 0.12);
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZoom, 0.12);
  camera.lookAt(currentPosition);

  modelGroup.rotation.set(currentRotation.x, currentRotation.y, 0);
  modelGroup.position.copy(currentPosition);

  renderer.render(scene, camera);
}

setStatus('Loading 3d_scanned_face.glb…');
loadModelFromUrl(DEFAULT_MODEL_URL, '3d_scanned_face.glb');
animate();
