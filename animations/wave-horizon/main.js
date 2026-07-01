import * as THREE from 'three';
import { vertexShader, fragmentShader } from './shaders/index.js';
import { PeakDetector } from './waveSampling.js';
import { WaveAudio } from './audio.js';

const overlay = document.getElementById('overlay');
const soundControl = document.getElementById('sound-control');
const soundToggle = document.getElementById('sound-toggle');
const soundVolume = document.getElementById('sound-volume');
const soundVolumeFill = soundVolume.querySelector('.sound-volume-fill');
const soundVolumeTrack = soundVolume.querySelector('.sound-volume-track');
const soundVolumeThumb = soundVolume.querySelector('.sound-volume-thumb');

const scene = new THREE.Scene();

const fogColor = new THREE.Color(0x1a2848);
scene.fog = new THREE.Fog(fogColor, 18, 65);
scene.background = createSkyGradient(fogColor);

const camera = new THREE.PerspectiveCamera(
  48,
  window.innerWidth / window.innerHeight,
  0.1,
  120,
);
camera.position.set(0, 2.2, 14);
camera.lookAt(0, 0.4, -28);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const uniforms = {
  uTime: { value: 0 },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uPulse: { value: 0 },
  uCrashX: { value: 0 },
  uCrashZ: { value: -12 },
  uLeftColor: { value: new THREE.Color(0xff3d1f) },
  uRightColor: { value: new THREE.Color(0x1a9bff) },
  uCrashColor: { value: new THREE.Color(0xd070ff) },
  uHorizonSurgeColor: { value: new THREE.Color(0xa8eeff) },
  uFogColor: { value: fogColor },
  uFogNear: { value: 18 },
  uFogFar: { value: 65 },
};

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  side: THREE.DoubleSide,
});

if (renderer.capabilities.isWebGL2 === false) {
  overlay.querySelector('p').textContent = 'WebGL is required to view this animation.';
}

const geometry = new THREE.PlaneGeometry(90, 90, 220, 220);
geometry.rotateX(-Math.PI / 2);
geometry.translate(0, 0, -12);

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

addHorizonLine(scene, fogColor);

const targetMouse = new THREE.Vector2(0.5, 0.5);
const smoothMouse = new THREE.Vector2(0.5, 0.5);
let pulse = 0;
let hasInteracted = false;

const peakDetector = new PeakDetector();
const waveAudio = new WaveAudio();

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
  const muted = waveAudio.muted || !waveAudio.enabled;
  const volumePercent = Math.round(waveAudio.volume * 100);

  soundControl.classList.toggle('is-muted', muted);
  soundToggle.setAttribute('aria-pressed', String(!muted));
  soundToggle.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
  setVolumeSliderPosition(volumePercent);
}

async function applyVolume(percent) {
  const volume = Math.max(0, Math.min(100, percent)) / 100;

  if (volume > 0 && !waveAudio.enabled) {
    const ok = await waveAudio.init();
    if (!ok) return;
  }

  waveAudio.setVolume(volume);

  if (volume > 0) {
    waveAudio.setMuted(false);
  } else {
    waveAudio.setMuted(true);
  }

  updateSoundUI();
}

async function setSoundEnabled(enabled) {
  if (enabled && !waveAudio.enabled) {
    const ok = await waveAudio.init();
    if (!ok) return;
  }

  if (enabled && waveAudio.volume === 0) {
    waveAudio.setVolume(0.75);
  }

  waveAudio.setMuted(!enabled);
  updateSoundUI();
}

function unlockAudio() {
  if (!waveAudio.enabled) {
    setSoundEnabled(true);
  }
}

soundToggle.addEventListener('click', () => {
  setSoundEnabled(waveAudio.muted || !waveAudio.enabled);
});

let draggingVolume = false;

soundVolume.addEventListener('pointerdown', (event) => {
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
  const current = Math.round(waveAudio.volume * 100);

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
    const delta = event.deltaY > 0 ? -5 : 5;
    applyVolume(Math.round(waveAudio.volume * 100) + delta);
  },
  { passive: false },
);

updateSoundUI();

function setMouseFromEvent(event) {
  targetMouse.set(
    event.clientX / window.innerWidth,
    1 - event.clientY / window.innerHeight,
  );

  if (!hasInteracted) {
    hasInteracted = true;
    overlay.classList.add('hidden');
  }
}

window.addEventListener('pointermove', setMouseFromEvent);
window.addEventListener('pointerdown', (event) => {
  pulse = 1;
  unlockAudio();
  setMouseFromEvent(event);
});
window.addEventListener('keydown', unlockAudio);

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
  uniforms.uTime.value = elapsed;

  smoothMouse.lerp(targetMouse, 0.07);
  uniforms.uMouse.value.copy(smoothMouse);

  pulse *= 0.9;
  uniforms.uPulse.value = pulse;

  uniforms.uCrashX.value =
    Math.sin(elapsed * 0.18) * 5.0 +
    Math.sin(elapsed * 0.05 + 1.2) * 3.0 +
    Math.sin(elapsed * 0.31 + 2.7) * 1.5;

  uniforms.uCrashZ.value =
    -12 +
    Math.sin(elapsed * 0.15 + 0.8) * 4.5 +
    Math.sin(elapsed * 0.04) * 2.5 +
    Math.cos(elapsed * 0.27 + 1.1) * 1.8;

  peakDetector.update(
    elapsed,
    uniforms.uCrashX.value,
    uniforms.uCrashZ.value,
    dt,
    (intensity, isSurge) => waveAudio.playPeak(intensity, isSurge),
  );

  camera.position.x = Math.sin(elapsed * 0.12) * 0.35;
  camera.position.y = 2.2 + Math.sin(elapsed * 0.18) * 0.08;
  camera.lookAt(0, 0.35, -28);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

function createSkyGradient(horizonColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#060b18');
  gradient.addColorStop(0.45, '#0f1a35');
  gradient.addColorStop(0.72, horizonColor.getStyle());
  gradient.addColorStop(1, '#243a62');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addHorizonLine(scene, color) {
  const horizonMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(0xffffff).lerp(color, 0.35),
    transparent: true,
    opacity: 0.55,
  });

  const points = [];
  for (let i = -50; i <= 50; i += 1) {
    points.push(new THREE.Vector3(i, 0.02, -42));
  }

  const horizon = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), horizonMaterial);
  scene.add(horizon);
}
