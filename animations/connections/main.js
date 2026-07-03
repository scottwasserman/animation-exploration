import * as THREE from 'three';

const overlay = document.getElementById('overlay');
const resetButton = document.getElementById('reset-grid');
const statusEl = document.getElementById('status');

const GRID_SIZE = 10;
const NEURON_COUNT = GRID_SIZE * GRID_SIZE * GRID_SIZE;
const SPACING = 0.38;
const LINK_RADIUS = 0.028;
const MAX_CONNECTIONS = 2500;
const CONNECT_INTERVAL = 0.45;
const DISCONNECT_INTERVAL = 1.4;
const WARN_DURATION = 0.85;

const GREEN = new THREE.Color(0x44ff88);
const RED = new THREE.Color(0xff3d4f);
const blendColor = new THREE.Color();
const startPos = new THREE.Vector3();
const endPos = new THREE.Vector3();
const midpoint = new THREE.Vector3();
const linkDirection = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 0.5, 9);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const gridGroup = new THREE.Group();
scene.add(gridGroup);

const neuronPositions = new Float32Array(NEURON_COUNT * 3);
const halfSpan = ((GRID_SIZE - 1) * SPACING) / 2;

let index = 0;
for (let z = 0; z < GRID_SIZE; z += 1) {
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const offset = index * 3;
      neuronPositions[offset] = x * SPACING - halfSpan;
      neuronPositions[offset + 1] = y * SPACING - halfSpan;
      neuronPositions[offset + 2] = z * SPACING - halfSpan;
      index += 1;
    }
  }
}

const neuronGeometry = new THREE.BufferGeometry();
neuronGeometry.setAttribute('position', new THREE.BufferAttribute(neuronPositions, 3));

gridGroup.add(
  new THREE.Points(
    neuronGeometry,
    new THREE.PointsMaterial({
      color: 0x9ec8ff,
      size: 0.09,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  ),
);

const connectionsGroup = new THREE.Group();
connectionsGroup.renderOrder = 10;
gridGroup.add(connectionsGroup);

const linkTemplate = new THREE.CylinderGeometry(LINK_RADIUS, LINK_RADIUS, 1, 12);

const connectionMap = new Map();
const links = [];
let hasInteracted = false;
let isDragging = false;
let shiftDrag = false;
let altDrag = false;
let lastX = 0;
let lastY = 0;

const targetRotation = new THREE.Euler(0, 0, 0, 'YXZ');
const currentRotation = new THREE.Euler(0, 0, 0, 'YXZ');
const targetPosition = new THREE.Vector3(0, 0, 0);
const currentPosition = new THREE.Vector3(0, 0, 0);
let targetZoom = 9;
let autoYawOffset = 0;
const autoRotateSpeed = 0.14;
let lastConnectAt = -CONNECT_INTERVAL;
let lastDisconnectAt = 0;

function createLinkMaterial() {
  return new THREE.MeshBasicMaterial({
    color: GREEN.clone(),
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

function connectionKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function getNeuronPosition(neuronIndex, target) {
  const offset = neuronIndex * 3;
  return target.set(
    neuronPositions[offset],
    neuronPositions[offset + 1],
    neuronPositions[offset + 2],
  );
}

function neuronIndex(x, y, z) {
  return x + y * GRID_SIZE + z * GRID_SIZE * GRID_SIZE;
}

function decodeNeuronIndex(neuronIndexValue) {
  const x = neuronIndexValue % GRID_SIZE;
  const y = Math.floor(neuronIndexValue / GRID_SIZE) % GRID_SIZE;
  const z = Math.floor(neuronIndexValue / (GRID_SIZE * GRID_SIZE));
  return { x, y, z };
}

function getNeighborIndices(neuronIndexValue) {
  const { x, y, z } = decodeNeuronIndex(neuronIndexValue);
  const neighbors = [];
  const steps = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];

  for (const [dx, dy, dz] of steps) {
    const nx = x + dx;
    const ny = y + dy;
    const nz = z + dz;
    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && nz >= 0 && nz < GRID_SIZE) {
      neighbors.push(neuronIndex(nx, ny, nz));
    }
  }

  return neighbors;
}

function orientLink(mesh, direction) {
  if (direction.y > 0.999) {
    mesh.quaternion.identity();
    return;
  }

  if (direction.y < -0.999) {
    mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    return;
  }

  mesh.quaternion.setFromUnitVectors(up, direction);
}

function createConnectionMesh(a, b) {
  getNeuronPosition(a, startPos);
  getNeuronPosition(b, endPos);
  linkDirection.subVectors(endPos, startPos);
  const length = linkDirection.length();
  if (length < 0.001) return null;

  linkDirection.divideScalar(length);
  midpoint.copy(startPos).add(endPos).multiplyScalar(0.5);

  const mesh = new THREE.Mesh(linkTemplate.clone(), createLinkMaterial());
  mesh.position.copy(midpoint);
  mesh.scale.set(1, length, 1);
  orientLink(mesh, linkDirection);
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;
  connectionsGroup.add(mesh);

  return mesh;
}

function addConnection(a, b) {
  const key = connectionKey(a, b);
  if (connectionMap.has(key) || links.length >= MAX_CONNECTIONS) {
    return false;
  }

  const mesh = createConnectionMesh(a, b);
  if (!mesh) return false;

  const connection = {
    key,
    a,
    b,
    state: 'active',
    deathTimer: 0,
    mesh,
  };

  connectionMap.set(key, connection);
  links.push(connection);
  return true;
}

function removeConnection(connection) {
  connectionMap.delete(connection.key);

  if (connection.mesh) {
    connectionsGroup.remove(connection.mesh);
    connection.mesh.geometry.dispose();
    connection.mesh.material.dispose();
    connection.mesh = null;
  }

  const slot = links.indexOf(connection);
  if (slot !== -1) {
    links.splice(slot, 1);
  }
}

function tryAddRandomConnection() {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const a = Math.floor(Math.random() * NEURON_COUNT);
    const neighbors = getNeighborIndices(a);
    if (neighbors.length === 0) continue;

    const b = neighbors[Math.floor(Math.random() * neighbors.length)];
    if (addConnection(a, b)) {
      return true;
    }
  }

  return false;
}

function tryStartDisconnect() {
  const active = links.filter((connection) => connection.state === 'active' && connection.mesh);
  if (active.length === 0) return false;

  const connection = active[Math.floor(Math.random() * active.length)];
  connection.state = 'dying';
  connection.deathTimer = 0;
  return true;
}

function updateConnectionStates(delta) {
  const toRemove = [];

  for (const connection of links) {
    if (connection.state !== 'dying' || !connection.mesh) continue;

    connection.deathTimer += delta;
    const t = Math.min(1, connection.deathTimer / WARN_DURATION);
    blendColor.copy(GREEN).lerp(RED, t);
    connection.mesh.material.color.copy(blendColor);

    if (connection.deathTimer >= WARN_DURATION) {
      toRemove.push(connection);
    }
  }

  for (const connection of toRemove) {
    removeConnection(connection);
  }
}

function updateStatus() {
  if (!statusEl) return;
  statusEl.textContent = `Links: ${links.length}`;
}

function reportError(error) {
  if (!statusEl) return;
  statusEl.textContent = `Error: ${error.message}`;
}

function resetGrid() {
  while (links.length > 0) {
    removeConnection(links[links.length - 1]);
  }

  connectionMap.clear();
  updateStatus();

  targetRotation.set(0, 0, 0);
  currentRotation.set(0, 0, 0);
  targetPosition.set(0, 0, 0);
  currentPosition.set(0, 0, 0);
  targetZoom = 9;
  autoYawOffset = 0;
  lastConnectAt = -CONNECT_INTERVAL;
  lastDisconnectAt = 0;
}

function hideOverlay() {
  if (hasInteracted) return;
  hasInteracted = true;
  overlay?.classList.add('hidden');
}

function onPointerDown(event) {
  if (event.button !== 0) return;
  isDragging = true;
  shiftDrag = event.shiftKey;
  altDrag = event.altKey;
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

  if (event.altKey || altDrag) {
    targetPosition.z -= dy * 0.004;
    return;
  }

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

resetButton?.addEventListener('click', (event) => {
  event.stopPropagation();
  resetGrid();
  hideOverlay();
});

resetButton?.addEventListener('pointerdown', (event) => {
  event.stopPropagation();
});

window.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    targetZoom = THREE.MathUtils.clamp(targetZoom + event.deltaY * 0.006, 4, 18);
    hideOverlay();
  },
  { passive: false },
);

window.addEventListener('keydown', (event) => {
  if (event.key === 'Shift') shiftDrag = isDragging;
  if (event.key === 'Alt') altDrag = isDragging;
  hideOverlay();
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'Shift') shiftDrag = false;
  if (event.key === 'Alt') altDrag = false;
});

window.addEventListener('resize', () => {
  const { innerWidth, innerHeight } = window;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  try {
    const delta = clock.getDelta();
    const elapsed = clock.elapsedTime;

    updateConnectionStates(delta);

    if (elapsed - lastConnectAt >= CONNECT_INTERVAL) {
      lastConnectAt = elapsed;
      tryAddRandomConnection();
    }

    if (elapsed - lastDisconnectAt >= DISCONNECT_INTERVAL) {
      lastDisconnectAt = elapsed;
      tryStartDisconnect();
    }

    updateStatus();

    const autoTilt = Math.sin(elapsed * 0.11) * 0.18;
    if (!isDragging) {
      autoYawOffset += delta * autoRotateSpeed;
    }

    currentRotation.x = THREE.MathUtils.lerp(currentRotation.x, targetRotation.x, 0.12);
    currentRotation.y = THREE.MathUtils.lerp(currentRotation.y, targetRotation.y, 0.12);
    currentPosition.lerp(targetPosition, 0.12);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZoom, 0.12);
    camera.lookAt(currentPosition);

    gridGroup.rotation.set(
      currentRotation.x + autoTilt,
      currentRotation.y + autoYawOffset,
      0,
    );
    gridGroup.position.copy(currentPosition);

    renderer.render(scene, camera);
  } catch (error) {
    reportError(error);
    console.error(error);
  }
}

updateStatus();
animate();
