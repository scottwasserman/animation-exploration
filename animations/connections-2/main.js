import * as THREE from 'three';

const overlay = document.getElementById('overlay');
const resetButton = document.getElementById('reset-grid');

const GRID_SIZE = 10;
const NEURON_COUNT = GRID_SIZE * GRID_SIZE * GRID_SIZE;
const SPACING = 0.38;
const LINK_RADIUS = 0.028;
const MOVE_INTERVAL = 0.32;

const lerpPos = new THREE.Vector3();
const displayStart = new THREE.Vector3();
const displayEnd = new THREE.Vector3();
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
const edgeNodes = [];

function decodeNeuronIndex(neuronIndexValue) {
  const x = neuronIndexValue % GRID_SIZE;
  const y = Math.floor(neuronIndexValue / GRID_SIZE) % GRID_SIZE;
  const z = Math.floor(neuronIndexValue / (GRID_SIZE * GRID_SIZE));
  return { x, y, z };
}

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

for (let i = 0; i < NEURON_COUNT; i += 1) {
  const { x, y, z } = decodeNeuronIndex(i);
  if (
    x === 0 ||
    x === GRID_SIZE - 1 ||
    y === 0 ||
    y === GRID_SIZE - 1 ||
    z === 0 ||
    z === GRID_SIZE - 1
  ) {
    edgeNodes.push(i);
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

const trailConnections = [];
const trailKeys = new Set();
let walkColorIndex = 0;
let walker = null;
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

function connectionKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function nextWalkColor() {
  const color = new THREE.Color();
  color.setHSL((walkColorIndex * 0.618033988749895) % 1, 0.72, 0.58);
  walkColorIndex += 1;
  return color;
}

function createLinkMaterial(color) {
  return new THREE.MeshBasicMaterial({
    color: color.clone(),
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
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

function isEdgeNode(neuronIndexValue) {
  const { x, y, z } = decodeNeuronIndex(neuronIndexValue);
  return (
    x === 0 ||
    x === GRID_SIZE - 1 ||
    y === 0 ||
    y === GRID_SIZE - 1 ||
    z === 0 ||
    z === GRID_SIZE - 1
  );
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

function pickRandomNeighbor(current, except) {
  const neighbors = getNeighborIndices(current).filter((node) => node !== except);
  if (neighbors.length === 0) return null;
  return neighbors[Math.floor(Math.random() * neighbors.length)];
}

function pickStartNeighbor(start) {
  const neighbors = getNeighborIndices(start);
  const inward = neighbors.filter((node) => !isEdgeNode(node));
  const pool = inward.length > 0 ? inward : neighbors;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getRandomEdgeNode() {
  return edgeNodes[Math.floor(Math.random() * edgeNodes.length)];
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

function createConnectionMesh(a, b, color) {
  getNeuronPosition(a, startPos);
  getNeuronPosition(b, endPos);
  linkDirection.subVectors(endPos, startPos);
  const length = linkDirection.length();
  if (length < 0.001) return null;

  linkDirection.divideScalar(length);
  midpoint.copy(startPos).add(endPos).multiplyScalar(0.5);

  const mesh = new THREE.Mesh(linkTemplate.clone(), createLinkMaterial(color));
  mesh.position.copy(midpoint);
  mesh.scale.set(1, length, 1);
  orientLink(mesh, linkDirection);
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;
  connectionsGroup.add(mesh);

  return mesh;
}

function updateConnectionMeshFromPositions(mesh, aPos, bPos) {
  linkDirection.subVectors(bPos, aPos);
  const length = linkDirection.length();
  if (length < 0.001) return false;

  linkDirection.divideScalar(length);
  midpoint.copy(aPos).add(bPos).multiplyScalar(0.5);

  mesh.position.copy(midpoint);
  mesh.scale.set(1, length, 1);
  orientLink(mesh, linkDirection);
  return true;
}

function updateConnectionMesh(connection, a, b) {
  if (!connection.mesh) return false;

  getNeuronPosition(a, startPos);
  getNeuronPosition(b, endPos);
  return updateConnectionMeshFromPositions(connection.mesh, startPos, endPos);
}

function updateConnectionMeshInterpolated(connection, fromNode, toNode, nextNode, t) {
  if (!connection.mesh) return false;

  getNeuronPosition(fromNode, startPos);
  getNeuronPosition(toNode, endPos);
  getNeuronPosition(nextNode, lerpPos);

  displayStart.copy(startPos).lerp(endPos, t);
  displayEnd.copy(endPos).lerp(lerpPos, t);
  return updateConnectionMeshFromPositions(connection.mesh, displayStart, displayEnd);
}

function createConnection(a, b, color) {
  const mesh = createConnectionMesh(a, b, color);
  if (!mesh) return null;

  return { a, b, mesh, color };
}

function removeConnection(connection) {
  if (!connection?.mesh) return;

  connectionsGroup.remove(connection.mesh);
  connection.mesh.geometry.dispose();
  connection.mesh.material.dispose();
  connection.mesh = null;
}

function addTrailSegment(a, b, color) {
  const key = connectionKey(a, b);
  if (trailKeys.has(key)) return null;

  const mesh = createConnectionMesh(a, b, color);
  if (!mesh) return null;

  trailKeys.add(key);
  const segment = { a, b, mesh, color };
  trailConnections.push(segment);
  return segment;
}

function clearTrail() {
  for (const connection of trailConnections) {
    removeConnection(connection);
  }
  trailConnections.length = 0;
  trailKeys.clear();
}

function commitActiveConnection(walkerState) {
  if (!walkerState?.connection?.mesh) return;

  const { a, b, color, mesh } = walkerState.connection;
  const key = connectionKey(a, b);
  if (!trailKeys.has(key)) {
    trailKeys.add(key);
    trailConnections.push({ a, b, mesh, color });
  } else {
    removeConnection(walkerState.connection);
  }

  walkerState.connection = null;
}

function startNewWalk(elapsed) {
  const start = getRandomEdgeNode();
  const first = pickStartNeighbor(start);
  if (first === null) {
    walker = null;
    return;
  }

  const second = pickRandomNeighbor(first, start);
  if (second === null) {
    walker = null;
    return;
  }

  const color = nextWalkColor();

  addTrailSegment(start, first, color);

  const connection = createConnection(start, first, color);
  if (!connection) {
    walker = null;
    return;
  }

  walker = {
    start,
    from: start,
    to: first,
    next: second,
    connection,
    color,
    stepStart: elapsed,
    visitedInterior: !isEdgeNode(first),
  };
}

function completeWalkStep(elapsed) {
  if (!walker) return;

  const head = walker.next ?? walker.to;
  addTrailSegment(walker.to, head, walker.color);

  if (!isEdgeNode(head)) {
    walker.visitedInterior = true;
  }

  const reachedFarEdge =
    walker.visitedInterior && isEdgeNode(head) && head !== walker.start;

  const upcoming = reachedFarEdge ? null : pickRandomNeighbor(head, walker.to);

  if (reachedFarEdge || upcoming === null) {
    commitActiveConnection(walker);
    startNewWalk(elapsed);
    return;
  }

  walker.from = walker.to;
  walker.to = head;
  walker.next = upcoming;
  walker.stepStart = elapsed;
}

function updateWalker(elapsed) {
  if (!walker) {
    startNewWalk(elapsed);
    return;
  }

  const stepT = Math.min(1, (elapsed - walker.stepStart) / MOVE_INTERVAL);

  if (walker.next === null) {
    updateConnectionMesh(walker.connection, walker.from, walker.to);
  } else {
    updateConnectionMeshInterpolated(
      walker.connection,
      walker.from,
      walker.to,
      walker.next,
      stepT,
    );
  }

  if (stepT < 1) return;

  completeWalkStep(elapsed);
}

function resetGrid() {
  if (walker) {
    commitActiveConnection(walker);
  }
  walker = null;
  clearTrail();
  walkColorIndex = 0;

  targetRotation.set(0, 0, 0);
  currentRotation.set(0, 0, 0);
  targetPosition.set(0, 0, 0);
  currentPosition.set(0, 0, 0);
  targetZoom = 9;
  autoYawOffset = 0;

  startNewWalk(clock.elapsedTime);
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

    updateWalker(elapsed);

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
    console.error(error);
  }
}

animate();
