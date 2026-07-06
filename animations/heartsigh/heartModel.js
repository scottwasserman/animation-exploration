import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createAortaFire, findVesselOpenings, updateAortaFire } from './aortaFire.js';

const heartMaterial = new THREE.MeshStandardMaterial({
  color: 0x080808,
  metalness: 0.12,
  roughness: 0.58,
  side: THREE.FrontSide,
});

const innerShellMaterial = new THREE.MeshStandardMaterial({
  color: 0x060606,
  metalness: 0.08,
  roughness: 0.7,
  side: THREE.BackSide,
});

const box = new THREE.Box3();
const size = new THREE.Vector3();
const center = new THREE.Vector3();
const samplePoint = new THREE.Vector3();

function updateBounds(object) {
  box.makeEmpty();
  object.updateMatrixWorld(true);

  object.traverse((child) => {
    if (!child.isMesh || !child.geometry || child.userData.innerShell) return;
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

function detectLongAxis() {
  if (size.y >= size.x && size.y >= size.z) return 'y';
  if (size.x >= size.z) return 'x';
  return 'z';
}

function frameHeart(heart) {
  heart.position.set(0, 0, 0);
  heart.rotation.set(0, 0, 0);
  heart.scale.set(1, 1, 1);
  heart.updateMatrixWorld(true);

  updateBounds(heart);

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  heart.scale.setScalar(2.6 / maxDim);
  heart.updateMatrixWorld(true);

  updateBounds(heart);
  heart.position.sub(center);
}

function addInnerShell(heart) {
  heart.traverse((child) => {
    if (!child.isMesh || child.userData.innerShell) return;

    const shell = new THREE.Mesh(child.geometry, innerShellMaterial);
    shell.userData.innerShell = true;
    shell.scale.setScalar(0.993);
    shell.renderOrder = -1;
    child.add(shell);
  });
}

function gaussian(phase, centerPoint, width) {
  return Math.exp(-((phase - centerPoint) ** 2) / width);
}

function heartbeatCycle(phase) {
  const lub = gaussian(phase, 0.055, 0.0011);
  const dub = gaussian(phase, 0.33, 0.0016) * 0.28;
  const diastoleFill = phase > 0.18
    ? (1 - Math.exp(-(((phase - 0.18) / 0.42) ** 1.35))) * 0.12
    : 0;

  const contraction = THREE.MathUtils.clamp(lub + dub * 0.35, 0, 1);
  const expansion = diastoleFill;

  return { phase, contraction, expansion, dub };
}

export function getHeartbeatState(elapsed) {
  const bpm = 72;
  const phase = ((elapsed * bpm) / 60) % 1;
  return heartbeatCycle(phase);
}

function applyAxisScale(target, longAxis, longScale, wideScale) {
  const scales = { x: wideScale, y: wideScale, z: wideScale };
  scales[longAxis] = longScale;
  target.set(scales.x, scales.y, scales.z);
}

export async function createHeartModel(url) {
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });

  const heart = gltf.scene;
  heart.traverse((child) => {
    if (!child.isMesh) return;
    child.material = heartMaterial;
    child.castShadow = true;
    child.receiveShadow = true;
  });

  frameHeart(heart);
  addInnerShell(heart);
  updateBounds(heart);

  const beatGroup = new THREE.Group();
  beatGroup.add(heart);

  const pivot = new THREE.Group();
  pivot.add(beatGroup);

  pivot.userData.beatGroup = beatGroup;
  pivot.userData.longAxis = detectLongAxis();
  pivot.userData.restSize = size.clone();
  pivot.userData.fire = createAortaFire(beatGroup, findVesselOpenings(heart));

  return pivot;
}

export function updateHeartPulse(pivot, elapsed, dt = 1 / 60) {
  const beatGroup = pivot.userData.beatGroup;
  if (!beatGroup) return;

  const heartbeat = getHeartbeatState(elapsed);
  const { contraction, expansion, dub } = heartbeat;
  const longAxis = pivot.userData.longAxis ?? 'y';

  const longScale = 1 - contraction * 0.085 + expansion * 0.05;
  const wideScale = 1 + contraction * 0.055 - expansion * 0.025;
  applyAxisScale(beatGroup.scale, longAxis, longScale, wideScale);

  const twistAmount = contraction * 0.11 - dub * 0.035 + expansion * 0.015;
  const rockAmount = -contraction * 0.06 + dub * 0.018;

  if (longAxis === 'y') {
    beatGroup.rotation.set(rockAmount, 0, twistAmount);
  } else if (longAxis === 'x') {
    beatGroup.rotation.set(0, twistAmount, rockAmount);
  } else {
    beatGroup.rotation.set(rockAmount, twistAmount, 0);
  }

  const apexLift = contraction * 0.045 - expansion * 0.02;
  const forwardThrust = contraction * 0.022 - dub * 0.01;
  beatGroup.position.set(0, apexLift, forwardThrust);

  beatGroup.updateMatrixWorld(true);
  updateAortaFire(pivot.userData.fire, dt, heartbeat);
}
