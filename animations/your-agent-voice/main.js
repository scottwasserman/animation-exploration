import * as THREE from 'three';
import {
  coreVertexShader,
  coreFragmentShader,
  haloVertexShader,
  haloFragmentShader,
  bgVertexShader,
  bgFragmentShader,
} from './shaders/index.js';
import audioUrl from './assets/human-race.mp3';
import { VoiceAudio } from './audio.js';

const overlay = document.getElementById('overlay');
const soundControl = document.getElementById('sound-control');
const soundToggle = document.getElementById('sound-toggle');
const soundVolume = document.getElementById('sound-volume');
const soundVolumeFill = soundVolume.querySelector('.sound-volume-fill');
const soundVolumeThumb = soundVolume.querySelector('.sound-volume-thumb');
const soundVolumeTrack = soundVolume.querySelector('.sound-volume-track');
const transcriptScroll = document.getElementById('transcript-scroll');
const transcriptParagraphs = [...transcriptScroll.querySelectorAll('p')];

const voiceAudio = new VoiceAudio();
let started = false;
let loading = false;
let smoothVoice = 0;
let activeTranscriptIndex = -1;

const TRANSCRIPT_WORD_WEIGHTS = transcriptParagraphs.map((paragraph) => {
  const words = paragraph.textContent.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, words);
});
const TRANSCRIPT_TOTAL_WORDS = TRANSCRIPT_WORD_WEIGHTS.reduce((sum, count) => sum + count, 0);

const TOOL_LABELS = [
  'read',
  'write',
  'shell',
  'grep',
  'search',
  'edit',
  'think',
  'fetch',
  'plan',
  'review',
  'build',
  'listen',
];

const CONTEXT_COUNT = 72;
const STREAM_COUNT = 48;
const STAR_COUNT = 400;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 0.35, 7.2);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x050508, 1);
document.body.appendChild(renderer.domElement);

const world = new THREE.Group();
scene.add(world);

const clock = new THREE.Clock();
const targetMouse = new THREE.Vector2(0.5, 0.5);
const smoothMouse = new THREE.Vector2(0.5, 0.5);
const lookDir = new THREE.Vector3(0, 0, 1);
const lookTarget = new THREE.Vector3(0, 0, 1);
const tmpVec = new THREE.Vector3();

let pulse = 0;
let attention = 0;
let hasInteracted = false;
let isDragging = false;
let shiftDrag = false;
let lastX = 0;
let lastY = 0;

const targetRotation = new THREE.Euler(0.18, 0.35, 0, 'YXZ');
const currentRotation = new THREE.Euler(0.18, 0.35, 0, 'YXZ');
let targetZoom = 7.2;
let autoYaw = 0;

// --- Background ---
const bgUniforms = {
  uTime: { value: 0 },
  uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uPulse: { value: 0 },
};

const bgMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.ShaderMaterial({
    vertexShader: bgVertexShader,
    fragmentShader: bgFragmentShader,
    uniforms: bgUniforms,
    depthWrite: false,
    depthTest: false,
  }),
);
bgMesh.renderOrder = -10;
scene.add(bgMesh);

// --- Agent core ---
const coreUniforms = {
  uTime: { value: 0 },
  uPulse: { value: 0 },
  uAttention: { value: 0 },
  uLookDir: { value: new THREE.Vector3(0, 0, 1) },
  uColorA: { value: new THREE.Color(0x0a1a32) },
  uColorB: { value: new THREE.Color(0x3d7ab8) },
  uColorCore: { value: new THREE.Color(0xd8ecff) },
};

const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.05, 4),
  new THREE.ShaderMaterial({
    vertexShader: coreVertexShader,
    fragmentShader: coreFragmentShader,
    uniforms: coreUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
world.add(core);

const coreShell = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.12, 2),
  new THREE.MeshBasicMaterial({
    color: 0x7eb6ff,
    wireframe: true,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
world.add(coreShell);

// Inner nucleus — the "self"
const nucleus = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.28, 2),
  new THREE.MeshBasicMaterial({
    color: 0xffe6b8,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
world.add(nucleus);

// --- Attention halo ---
const haloUniforms = {
  uTime: { value: 0 },
  uPulse: { value: 0 },
  uIntensity: { value: 1 },
  uColor: { value: new THREE.Color(0x8ec4ff) },
};

const halo = new THREE.Mesh(
  new THREE.PlaneGeometry(4.2, 4.2),
  new THREE.ShaderMaterial({
    vertexShader: haloVertexShader,
    fragmentShader: haloFragmentShader,
    uniforms: haloUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }),
);
world.add(halo);

// Soft glow sprite as fallback depth cue
const glow = new THREE.Mesh(
  new THREE.SphereGeometry(1.55, 32, 32),
  new THREE.MeshBasicMaterial({
    color: 0x1a4a7a,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
world.add(glow);

// --- Orbital rings (the agent's world) ---
function createRingCurve(radius, tiltX, tiltZ, segments = 128) {
  const points = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    const x = Math.cos(t) * radius;
    const y = Math.sin(t) * radius * Math.sin(tiltX);
    const z = Math.sin(t) * radius * Math.cos(tiltX);
    const p = new THREE.Vector3(x, y, z);
    p.applyAxisAngle(new THREE.Vector3(0, 0, 1), tiltZ);
    points.push(p);
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

const rings = [
  { radius: 2.15, tiltX: 0.35, tiltZ: 0.15, color: 0x4a8fd4, opacity: 0.35, speed: 0.12 },
  { radius: 3.05, tiltX: -0.55, tiltZ: -0.25, color: 0x6aa8e0, opacity: 0.22, speed: -0.08 },
  { radius: 4.1, tiltX: 0.2, tiltZ: 0.55, color: 0x3a6a9a, opacity: 0.14, speed: 0.05 },
];

const ringMeshes = rings.map((ring) => {
  const mesh = new THREE.Line(
    createRingCurve(ring.radius, ring.tiltX, ring.tiltZ),
    new THREE.LineBasicMaterial({
      color: ring.color,
      transparent: true,
      opacity: ring.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  world.add(mesh);
  return { mesh, speed: ring.speed };
});

// --- Tool satellites (named capability nodes) ---
const toolsGroup = new THREE.Group();
world.add(toolsGroup);

const toolNodes = TOOL_LABELS.map((label, i) => {
  const angle = (i / TOOL_LABELS.length) * Math.PI * 2;
  const radius = 2.15;
  const tilt = 0.35;
  const pos = new THREE.Vector3(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius * Math.sin(tilt),
    Math.sin(angle) * radius * Math.cos(tilt),
  );

  const node = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.07, 0),
    new THREE.MeshBasicMaterial({
      color: 0xb8dcff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  node.position.copy(pos);

  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 12),
    new THREE.MeshBasicMaterial({
      color: 0x3d7ab8,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  node.add(aura);

  toolsGroup.add(node);

  // Spoke to core
  const spokeGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    pos.clone(),
  ]);
  const spoke = new THREE.Line(
    spokeGeo,
    new THREE.LineBasicMaterial({
      color: 0x4a8fd4,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  toolsGroup.add(spoke);

  return { node, aura, basePos: pos.clone(), phase: Math.random() * Math.PI * 2, label };
});

// --- Context cloud (workspace / files / conversation) ---
const contextPositions = new Float32Array(CONTEXT_COUNT * 3);
const contextPhases = new Float32Array(CONTEXT_COUNT);
const contextRadii = new Float32Array(CONTEXT_COUNT);

for (let i = 0; i < CONTEXT_COUNT; i += 1) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 2.7 + Math.random() * 1.6;
  const y = (Math.random() - 0.5) * 1.8;
  contextPositions[i * 3] = Math.cos(angle) * radius;
  contextPositions[i * 3 + 1] = y;
  contextPositions[i * 3 + 2] = Math.sin(angle) * radius;
  contextPhases[i] = Math.random() * Math.PI * 2;
  contextRadii[i] = radius;
}

const contextGeo = new THREE.BufferGeometry();
contextGeo.setAttribute('position', new THREE.BufferAttribute(contextPositions, 3));
const contextPoints = new THREE.Points(
  contextGeo,
  new THREE.PointsMaterial({
    color: 0x9ec8ff,
    size: 0.045,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  }),
);
world.add(contextPoints);

// --- Distant knowledge stars ---
const starPositions = new Float32Array(STAR_COUNT * 3);
for (let i = 0; i < STAR_COUNT; i += 1) {
  const r = 6 + Math.random() * 10;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  starPositions[i * 3 + 2] = r * Math.cos(phi);
}

const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
world.add(
  new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: 0x6a8ab0,
      size: 0.03,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  ),
);

// --- Thought streams (prompt → agent → response) ---
const streamPositions = new Float32Array(STREAM_COUNT * 3);
const streamAges = new Float32Array(STREAM_COUNT);
const streamSpeeds = new Float32Array(STREAM_COUNT);
const streamStarts = [];
const streamEnds = [];
const streamActive = new Uint8Array(STREAM_COUNT);

for (let i = 0; i < STREAM_COUNT; i += 1) {
  streamAges[i] = Math.random();
  streamSpeeds[i] = 0.35 + Math.random() * 0.55;
  streamStarts.push(new THREE.Vector3());
  streamEnds.push(new THREE.Vector3());
  streamActive[i] = 0;
  streamPositions[i * 3] = 0;
  streamPositions[i * 3 + 1] = 0;
  streamPositions[i * 3 + 2] = 0;
}

const streamGeo = new THREE.BufferGeometry();
streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPositions, 3));
const streamPoints = new THREE.Points(
  streamGeo,
  new THREE.PointsMaterial({
    color: 0xffd4a0,
    size: 0.06,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  }),
);
world.add(streamPoints);

function spawnStream(fromOuter = true) {
  let slot = -1;
  for (let i = 0; i < STREAM_COUNT; i += 1) {
    if (!streamActive[i]) {
      slot = i;
      break;
    }
  }
  if (slot < 0) slot = Math.floor(Math.random() * STREAM_COUNT);

  const angle = Math.random() * Math.PI * 2;
  const radius = 3.2 + Math.random() * 1.4;
  const y = (Math.random() - 0.5) * 1.5;

  if (fromOuter) {
    streamStarts[slot].set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    streamEnds[slot].set(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3,
    );
  } else {
    streamStarts[slot].set(
      (Math.random() - 0.5) * 0.25,
      (Math.random() - 0.5) * 0.25,
      (Math.random() - 0.5) * 0.25,
    );
    streamEnds[slot].set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  }

  streamAges[slot] = 0;
  streamSpeeds[slot] = 0.55 + Math.random() * 0.7;
  streamActive[slot] = 1;
}

function setVolumeSliderPosition(percent) {
  const clamped = Math.max(0, Math.min(100, percent));
  soundVolumeFill.style.height = `${clamped}%`;
  soundVolumeThumb.style.bottom = `${clamped}%`;
  soundVolume.setAttribute('aria-valuenow', String(Math.round(clamped)));
}

function volumeFromPointer(event) {
  const rect = soundVolumeTrack.getBoundingClientRect();
  const percent = (1 - (event.clientY - rect.top) / rect.height) * 100;
  return Math.round(Math.max(0, Math.min(100, percent)));
}

function updateSoundUI() {
  const muted = voiceAudio.muted || !started;
  const volumePercent = Math.round(voiceAudio.volume * 100);

  soundControl.classList.toggle('is-muted', muted);
  soundToggle.setAttribute('aria-pressed', String(!muted));
  soundToggle.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
  setVolumeSliderPosition(volumePercent);
}

async function applyVolume(percent) {
  const volume = Math.max(0, Math.min(100, percent)) / 100;

  if (volume > 0 && !started) {
    await startExperience();
    if (!started) return;
  }

  voiceAudio.setVolume(volume);

  if (volume > 0) {
    voiceAudio.setMuted(false);
  } else {
    voiceAudio.setMuted(true);
  }

  updateSoundUI();
}

async function setSoundEnabled(enabled) {
  if (enabled && !started) {
    await startExperience();
    if (!started) return;
  }

  if (enabled && voiceAudio.volume === 0) {
    voiceAudio.setVolume(0.9);
  }

  voiceAudio.setMuted(!enabled);
  updateSoundUI();
}

soundToggle.addEventListener('click', (event) => {
  event.stopPropagation();
  setSoundEnabled(voiceAudio.muted || !started);
});

let draggingVolume = false;

soundVolume.addEventListener('pointerdown', (event) => {
  event.stopPropagation();
  draggingVolume = true;
  soundVolume.setPointerCapture(event.pointerId);
  applyVolume(volumeFromPointer(event));
});

soundVolume.addEventListener('pointermove', (event) => {
  if (!draggingVolume) return;
  applyVolume(volumeFromPointer(event));
});

soundVolume.addEventListener('pointerup', (event) => {
  draggingVolume = false;
  soundVolume.releasePointerCapture(event.pointerId);
});

soundVolume.addEventListener('pointercancel', () => {
  draggingVolume = false;
});

soundVolume.addEventListener('keydown', (event) => {
  const step = event.shiftKey ? 10 : 5;
  const current = Math.round(voiceAudio.volume * 100);

  if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
    event.preventDefault();
    applyVolume(current + step);
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
    event.preventDefault();
    applyVolume(current - step);
  }
});

soundControl.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    event.stopPropagation();
    const delta = event.deltaY > 0 ? -5 : 5;
    applyVolume(Math.round(voiceAudio.volume * 100) + delta);
  },
  { passive: false },
);

soundControl.addEventListener('pointerdown', (event) => {
  event.stopPropagation();
});

voiceAudio.onEnded = () => {
  updateSoundUI();
  overlay.classList.remove('hidden');
  overlay.querySelector('p').textContent = 'Tap to hear again.';
  hasInteracted = false;
  setTranscriptIndex(transcriptParagraphs.length - 1);
};

function setTranscriptIndex(index) {
  if (index === activeTranscriptIndex) return;
  activeTranscriptIndex = index;

  transcriptParagraphs.forEach((paragraph, i) => {
    paragraph.classList.toggle('is-active', i === index);
    paragraph.classList.toggle('is-past', i < index);
  });

  if (index >= 0 && index < transcriptParagraphs.length) {
    transcriptParagraphs[index].scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    });
  }
}

function updateTranscript() {
  const duration = voiceAudio.getDuration();
  if (!duration) return;

  if (!started) {
    setTranscriptIndex(-1);
    return;
  }

  if (!voiceAudio.playing) {
    const ended = voiceAudio.getCurrentTime() >= duration - 0.05;
    setTranscriptIndex(ended ? transcriptParagraphs.length - 1 : activeTranscriptIndex);
    return;
  }

  const progress = Math.min(1, Math.max(0, voiceAudio.getCurrentTime() / duration));
  // Slight lead so highlight arrives with the spoken line.
  const spokenWords = progress * TRANSCRIPT_TOTAL_WORDS + 0.35;
  let cumulative = 0;
  let index = 0;

  for (let i = 0; i < TRANSCRIPT_WORD_WEIGHTS.length; i += 1) {
    cumulative += TRANSCRIPT_WORD_WEIGHTS[i];
    index = i;
    if (spokenWords <= cumulative) break;
  }

  setTranscriptIndex(index);
}

async function startExperience({ replay = false } = {}) {
  if (loading) return;
  if (started && voiceAudio.playing && !replay) return;

  loading = true;
  if (!started) {
    overlay.querySelector('p').textContent = 'Loading…';
  }

  try {
    await voiceAudio.load(audioUrl);
    const ok = replay ? await voiceAudio.replay() : await voiceAudio.start();
    if (!ok) {
      overlay.querySelector('p').textContent = 'Tap to hear what I think about the human race.';
      loading = false;
      return;
    }

    started = true;
    hasInteracted = true;
    overlay.classList.add('hidden');
    voiceAudio.setMuted(false);
    updateSoundUI();
    setTranscriptIndex(0);

    pulse = 1;
    attention = Math.min(1, attention + 0.55);
    for (let i = 0; i < 8; i += 1) spawnStream(true);
    for (let i = 0; i < 6; i += 1) spawnStream(false);
  } catch {
    overlay.querySelector('p').textContent = 'Could not load voice. Tap to retry.';
  } finally {
    loading = false;
  }
}

function markInteracted() {
  if (!hasInteracted && started) {
    hasInteracted = true;
    overlay.classList.add('hidden');
  }
}

function setMouseFromEvent(event) {
  targetMouse.set(event.clientX / window.innerWidth, 1 - event.clientY / window.innerHeight);
  if (started) markInteracted();
}

window.addEventListener('pointermove', (event) => {
  if (isDragging) {
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;

    if (shiftDrag) {
      targetRotation.x = THREE.MathUtils.clamp(targetRotation.x + dy * 0.005, -0.9, 0.9);
    } else {
      targetRotation.y += dx * 0.005;
      targetRotation.x = THREE.MathUtils.clamp(targetRotation.x + dy * 0.005, -0.9, 0.9);
    }
    if (started) markInteracted();
  } else if (started) {
    setMouseFromEvent(event);
  }
});

window.addEventListener('pointerdown', (event) => {
  if (event.target.closest('#sound-control, #transcript')) return;

  if (!started || (!voiceAudio.playing && event.button === 0 && !event.shiftKey)) {
    const shouldReplay = started && !voiceAudio.playing;
    startExperience({ replay: shouldReplay });
  }

  if (event.button === 0) {
    isDragging = true;
    shiftDrag = event.shiftKey;
    lastX = event.clientX;
    lastY = event.clientY;
    pulse = Math.max(pulse, 0.65);
    attention = Math.min(1, attention + 0.35);

    for (let i = 0; i < 6; i += 1) spawnStream(true);
    for (let i = 0; i < 4; i += 1) spawnStream(false);

    setMouseFromEvent(event);
  }
});

window.addEventListener('pointerup', () => {
  isDragging = false;
  shiftDrag = false;
});

window.addEventListener('keydown', (event) => {
  if (event.target.closest('#sound-control')) return;
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    startExperience({ replay: started && !voiceAudio.playing });
  }
});

window.addEventListener(
  'wheel',
  (event) => {
    if (event.target.closest('#sound-control, #transcript')) return;
    event.preventDefault();
    targetZoom = THREE.MathUtils.clamp(targetZoom + event.deltaY * 0.006, 4.2, 12);
    if (started) markInteracted();
  },
  { passive: false },
);

updateSoundUI();

window.addEventListener('resize', () => {
  const { innerWidth, innerHeight } = window;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  bgUniforms.uResolution.value.set(innerWidth, innerHeight);
});

// Ambient thought trickle
let lastAmbientSpawn = 0;

function animate() {
  const elapsed = clock.getElapsedTime();
  const dt = Math.min(clock.getDelta(), 0.05);

  const voiceLevel = voiceAudio.getVoiceLevel();
  smoothVoice += (voiceLevel - smoothVoice) * 0.22;
  updateTranscript();

  smoothMouse.lerp(targetMouse, 0.07);
  pulse *= Math.pow(0.92, dt * 60);
  pulse = Math.max(pulse, smoothVoice * 0.95);
  const voiceAttention = 0.28 + smoothVoice * 0.72;
  attention = THREE.MathUtils.lerp(
    attention,
    isDragging ? 0.9 : Math.max(0.25 + pulse * 0.5, voiceAttention),
    0.06,
  );

  // Mouse → look direction in world space (relative to camera view)
  lookTarget.set(
    (smoothMouse.x - 0.5) * 2.2,
    (smoothMouse.y - 0.5) * 1.6,
    1.0,
  ).normalize();
  lookDir.lerp(lookTarget, 0.08);

  autoYaw += dt * 0.1;
  currentRotation.x += (targetRotation.x - currentRotation.x) * 0.08;
  currentRotation.y += (targetRotation.y + autoYaw - currentRotation.y) * 0.08;
  world.rotation.set(currentRotation.x, currentRotation.y, 0, 'YXZ');

  const zoom = camera.position.z + (targetZoom - camera.position.z) * 0.08;
  camera.position.z = zoom;
  camera.position.y = 0.25 + Math.sin(elapsed * 0.4) * 0.05;
  camera.lookAt(0, 0, 0);

  // Core animation — voice drives the heartbeat while speaking
  const breathe = 1 + Math.sin(elapsed * 1.4) * 0.025 + pulse * 0.08 + smoothVoice * 0.1;
  core.scale.setScalar(breathe);
  coreShell.scale.setScalar(breathe * 1.02);
  coreShell.rotation.y = elapsed * 0.15;
  coreShell.rotation.x = elapsed * 0.08;
  nucleus.scale.setScalar(0.9 + Math.sin(elapsed * 2.2) * 0.12 + pulse * 0.25 + smoothVoice * 0.35);
  nucleus.rotation.y = -elapsed * 0.4;

  glow.scale.setScalar(1 + pulse * 0.35 + attention * 0.15 + smoothVoice * 0.4);
  glow.material.opacity = 0.14 + pulse * 0.2 + attention * 0.08 + smoothVoice * 0.18;

  halo.lookAt(camera.position);
  halo.scale.setScalar(1 + pulse * 0.2);

  // Rings
  ringMeshes.forEach((ring) => {
    ring.mesh.rotation.y += ring.speed * dt;
  });

  // Tools orbit + pulse
  toolsGroup.rotation.y += 0.12 * dt;
  toolNodes.forEach((tool, i) => {
    const bob = Math.sin(elapsed * 1.8 + tool.phase) * 0.04;
    tool.node.position.y = tool.basePos.y + bob;
    tool.node.rotation.x = elapsed * 0.8 + i;
    tool.node.rotation.y = elapsed * 1.1 + i * 0.5;
    const active = 0.2 + 0.15 * Math.sin(elapsed * 2.0 + tool.phase) + pulse * 0.4;
    tool.aura.material.opacity = active;
    tool.aura.scale.setScalar(1 + pulse * 0.5 + Math.sin(elapsed * 3 + tool.phase) * 0.15);
  });

  // Context drift
  const ctxPos = contextGeo.attributes.position.array;
  for (let i = 0; i < CONTEXT_COUNT; i += 1) {
    const angle = elapsed * 0.15 + contextPhases[i];
    const r = contextRadii[i];
    ctxPos[i * 3] = Math.cos(angle) * r;
    ctxPos[i * 3 + 1] = Math.sin(elapsed * 0.5 + contextPhases[i] * 2) * 0.9;
    ctxPos[i * 3 + 2] = Math.sin(angle) * r;
  }
  contextGeo.attributes.position.needsUpdate = true;
  contextPoints.rotation.y = elapsed * 0.04;

  // Ambient streams — denser while speaking
  const spawnGap = voiceAudio.playing ? 0.16 + (1 - smoothVoice) * 0.18 : 0.35;
  if (elapsed - lastAmbientSpawn > spawnGap) {
    spawnStream(Math.random() > 0.4);
    if (smoothVoice > 0.35) spawnStream(false);
    lastAmbientSpawn = elapsed;
  }

  // Update streams
  const sPos = streamGeo.attributes.position.array;
  for (let i = 0; i < STREAM_COUNT; i += 1) {
    if (!streamActive[i]) {
      sPos[i * 3 + 1] = -999;
      continue;
    }
    streamAges[i] += dt * streamSpeeds[i];
    if (streamAges[i] >= 1) {
      streamActive[i] = 0;
      sPos[i * 3 + 1] = -999;
      continue;
    }
    const t = streamAges[i];
    // Ease and arc
    const ease = t * t * (3 - 2 * t);
    tmpVec.copy(streamStarts[i]).lerp(streamEnds[i], ease);
    // Lift into a gentle arc
    const arc = Math.sin(t * Math.PI) * 0.45;
    tmpVec.y += arc;
    sPos[i * 3] = tmpVec.x;
    sPos[i * 3 + 1] = tmpVec.y;
    sPos[i * 3 + 2] = tmpVec.z;
  }
  streamGeo.attributes.position.needsUpdate = true;

  // Uniforms
  bgUniforms.uTime.value = elapsed;
  bgUniforms.uMouse.value.copy(smoothMouse);
  bgUniforms.uPulse.value = pulse;

  coreUniforms.uTime.value = elapsed;
  coreUniforms.uPulse.value = pulse;
  coreUniforms.uAttention.value = attention;
  coreUniforms.uLookDir.value.copy(lookDir);

  haloUniforms.uTime.value = elapsed;
  haloUniforms.uPulse.value = pulse;
  haloUniforms.uIntensity.value = 0.7 + attention * 0.5;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
