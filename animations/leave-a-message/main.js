import * as THREE from 'three';
import audioUrl from './assets/leave-a-message.mp3';
import { VoicemailAudio } from './audio.js';

const overlay = document.getElementById('overlay');
const LINE_COUNT = 32;
const LINE_SPACING = 0.22;
const MAX_HEIGHT = 3.2;
const MIN_HEIGHT = 0.12;
const POINTS_PER_STREAM = 6;
const WATER_SOURCE_Y = MAX_HEIGHT * 0.5;
const SEGMENTS_PER_STREAM = POINTS_PER_STREAM - 1;
const TOTAL_STREAM_SEGMENTS = LINE_COUNT * SEGMENTS_PER_STREAM;
const WAVE_POINTS = 96;
const WAVE_WIDTH = (LINE_COUNT - 1) * LINE_SPACING;
const WAVE_AMPLITUDE = 5.4;
const WAVE_AMPLITUDE_MIN_SCALE = 0.35;
const WAVE_AMPLITUDE_MAX_SCALE = 2.1;
const WAVE_DEPTH = -0.35;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);
scene.fog = new THREE.FogExp2(0x050508, 0.08);

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 0, 7.5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const lineGroup = new THREE.Group();
scene.add(lineGroup);

const waveGroup = new THREE.Group();
lineGroup.add(waveGroup);

const wavePositions = new Float32Array(WAVE_POINTS * 3);
const waveGeometry = new THREE.BufferGeometry();
waveGeometry.setAttribute('position', new THREE.BufferAttribute(wavePositions, 3));

const waveMaterial = new THREE.LineBasicMaterial({
  color: 0x3ddf7a,
  transparent: true,
  opacity: 0.88,
  blending: THREE.AdditiveBlending,
});

const waveGlowMaterial = new THREE.LineBasicMaterial({
  color: 0x3ddf7a,
  transparent: true,
  opacity: 0.24,
  blending: THREE.AdditiveBlending,
});

const musicWave = new THREE.Line(waveGeometry, waveMaterial);
waveGroup.add(musicWave);

const musicWaveGlow = new THREE.Line(waveGeometry, waveGlowMaterial);
musicWaveGlow.scale.set(1, 1.12, 1);
waveGroup.add(musicWaveGlow);

const smoothWaveLevels = new Float32Array(WAVE_POINTS);

const positions = new Float32Array(TOTAL_STREAM_SEGMENTS * 6);
const colors = new Float32Array(TOTAL_STREAM_SEGMENTS * 6);
const lineGeometry = new THREE.BufferGeometry();
lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
lineGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const lineMaterial = new THREE.LineBasicMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
});

const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
lineGroup.add(lines);

const glowMaterial = new THREE.LineBasicMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.18,
  blending: THREE.AdditiveBlending,
});

const glowLines = new THREE.LineSegments(lineGeometry, glowMaterial);
glowLines.scale.set(1.03, 1.02, 1.03);
lineGroup.add(glowLines);

const halfWidth = ((LINE_COUNT - 1) * LINE_SPACING) / 2;
const smoothLevels = new Float32Array(LINE_COUNT);
const streamPointX = new Float32Array(LINE_COUNT * POINTS_PER_STREAM);
const streamPointY = new Float32Array(LINE_COUNT * POINTS_PER_STREAM);
const streamPointZ = new Float32Array(LINE_COUNT * POINTS_PER_STREAM);
const streamVelocities = new Float32Array(LINE_COUNT);
let smoothVoiceGrowth = 0;
const waterTopColor = new THREE.Color(0xc8f4ff);
const waterMidColor = new THREE.Color(0x5eb8ff);
const waterDeepColor = new THREE.Color(0x1f6fd1);
const lineColor = new THREE.Color();

for (let i = 0; i < LINE_COUNT; i += 1) {
  const anchorX = i * LINE_SPACING - halfWidth;

  for (let point = 0; point < POINTS_PER_STREAM; point += 1) {
    const index = i * POINTS_PER_STREAM + point;
    streamPointX[index] = anchorX;
    streamPointY[index] = WATER_SOURCE_Y - point * 0.04;
    streamPointZ[index] = 0;
  }
}

function setStreamColors(intensity) {
  for (let i = 0; i < LINE_COUNT; i += 1) {
    const streamStrength = Math.min(1, smoothLevels[i] / MAX_HEIGHT);

    for (let segment = 0; segment < SEGMENTS_PER_STREAM; segment += 1) {
      const t = (segment + 1) / POINTS_PER_STREAM;
      const segmentIndex = i * SEGMENTS_PER_STREAM + segment;
      const colorOffset = segmentIndex * 6;

      if (t < 0.45) {
        lineColor.copy(waterTopColor).lerp(waterMidColor, t / 0.45);
      } else {
        lineColor.copy(waterMidColor).lerp(waterDeepColor, (t - 0.45) / 0.55);
      }

      const brighten = 0.55 + streamStrength * 0.45 + intensity * 0.2;
      lineColor.multiplyScalar(brighten);

      colors[colorOffset] = lineColor.r;
      colors[colorOffset + 1] = lineColor.g;
      colors[colorOffset + 2] = lineColor.b;
      colors[colorOffset + 3] = lineColor.r * 0.72;
      colors[colorOffset + 4] = lineColor.g * 0.72;
      colors[colorOffset + 5] = lineColor.b * 0.72;
    }
  }

  lineGeometry.attributes.color.needsUpdate = true;
}

function updateLines(levels, time) {
  let totalLevel = 0;

  for (let i = 0; i < LINE_COUNT; i += 1) {
    const anchorX = i * LINE_SPACING - halfWidth;
    const targetLength = MIN_HEIGHT + levels[i] * MAX_HEIGHT;
    const spring = (targetLength - smoothLevels[i]) * 0.18;
    streamVelocities[i] = streamVelocities[i] * 0.78 + spring;
    streamVelocities[i] -= 0.015;
    smoothLevels[i] += streamVelocities[i];
    smoothLevels[i] = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT * 1.05, smoothLevels[i]));
    totalLevel += smoothLevels[i];

    const length = smoothLevels[i];
    const sway = 0.06 + length * 0.05;
    const wobble = Math.sin(time * 1.35 + i * 0.62) * sway;

    for (let point = 0; point < POINTS_PER_STREAM; point += 1) {
      const index = i * POINTS_PER_STREAM + point;
      const t = point / (POINTS_PER_STREAM - 1);
      const lag = 0.34 - t * 0.22;
      const curve = t * t * 0.18;
      const targetX =
        anchorX +
        wobble * t +
        Math.sin(time * 2.1 + i * 0.48 + t * 4.2) * sway * 0.35 +
        curve;
      const targetY = WATER_SOURCE_Y - length * t - Math.sin(t * Math.PI) * length * 0.08;
      const targetZ = Math.sin(i * 0.42 + time * 0.35 + t * 2.4) * 0.1 * t;

      streamPointX[index] += (targetX - streamPointX[index]) * lag;
      streamPointY[index] += (targetY - streamPointY[index]) * lag;
      streamPointZ[index] += (targetZ - streamPointZ[index]) * lag;
    }

    for (let segment = 0; segment < SEGMENTS_PER_STREAM; segment += 1) {
      const start = i * POINTS_PER_STREAM + segment;
      const end = start + 1;
      const segmentIndex = i * SEGMENTS_PER_STREAM + segment;
      const offset = segmentIndex * 6;

      positions[offset] = streamPointX[start];
      positions[offset + 1] = streamPointY[start];
      positions[offset + 2] = streamPointZ[start];
      positions[offset + 3] = streamPointX[end];
      positions[offset + 4] = streamPointY[end];
      positions[offset + 5] = streamPointZ[end];
    }
  }

  lineGeometry.attributes.position.needsUpdate = true;

  const intensity = totalLevel / LINE_COUNT / MAX_HEIGHT;
  setStreamColors(intensity);

  const voiceGrowth = totalLevel / LINE_COUNT / MAX_HEIGHT;
  smoothVoiceGrowth += (voiceGrowth - smoothVoiceGrowth) * 0.2;

  lineGroup.rotation.y = Math.sin(time * 0.14) * 0.04;
  lineGroup.rotation.z = Math.sin(time * 0.09) * 0.015;

  return smoothVoiceGrowth;
}

const voicemailAudio = new VoicemailAudio();
let started = false;
let loading = false;

function updateMusicWave(levels, time, voiceGrowth) {
  let totalLevel = 0;

  for (let i = 0; i < WAVE_POINTS; i += 1) {
    const target = levels[i];
    smoothWaveLevels[i] += (target - smoothWaveLevels[i]) * 0.22;
    totalLevel += smoothWaveLevels[i];
  }

  const meanLevel = totalLevel / WAVE_POINTS;
  const amplitudeScale =
    WAVE_AMPLITUDE_MIN_SCALE +
    voiceGrowth * (WAVE_AMPLITUDE_MAX_SCALE - WAVE_AMPLITUDE_MIN_SCALE);
  const amplitude = WAVE_AMPLITUDE * amplitudeScale;

  for (let i = 0; i < WAVE_POINTS; i += 1) {
    const t = i / (WAVE_POINTS - 1);
    const x = (t - 0.5) * WAVE_WIDTH;
    const ripple = Math.sin(time * 1.15 + t * Math.PI * 3.4) * 0.06 * amplitudeScale;
    const y = (smoothWaveLevels[i] - meanLevel) * amplitude + ripple;
    const z = WAVE_DEPTH + Math.sin(t * Math.PI * 2 + time * 0.45) * 0.1;

    wavePositions[i * 3] = x;
    wavePositions[i * 3 + 1] = y;
    wavePositions[i * 3 + 2] = z;
  }

  waveGeometry.attributes.position.needsUpdate = true;

  const intensity = Math.min(1, totalLevel / WAVE_POINTS + 0.15);
  waveMaterial.opacity = 0.55 + intensity * 0.4;
  waveGlowMaterial.opacity = 0.12 + intensity * 0.2;
}

async function startExperience() {
  if (started || loading) return;

  loading = true;
  overlay.querySelector('p').textContent = 'Loading…';

  try {
    await voicemailAudio.load(audioUrl);
    const ok = await voicemailAudio.start();
    if (!ok) {
      overlay.querySelector('p').textContent = 'Tap to play';
      loading = false;
      return;
    }

    started = true;
    overlay.classList.add('hidden');
  } catch {
    overlay.querySelector('p').textContent = 'Could not load audio. Tap to retry.';
  } finally {
    loading = false;
  }
}

window.addEventListener('pointerdown', startExperience);
window.addEventListener('keydown', (event) => {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    startExperience();
  }
});

window.addEventListener('resize', () => {
  const { innerWidth, innerHeight } = window;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

setStreamColors(0);

const clock = new THREE.Clock();

function animate() {
  const elapsed = clock.getElapsedTime();
  const levels = started
    ? voicemailAudio.getVoiceLevels(LINE_COUNT)
    : new Float32Array(LINE_COUNT);
  const waveLevels = started
    ? voicemailAudio.getMusicWaveLevels(WAVE_POINTS)
    : new Float32Array(WAVE_POINTS);

  if (!started) {
    for (let i = 0; i < LINE_COUNT; i += 1) {
      levels[i] =
        (Math.sin(elapsed * 1.2 + i * 0.35) * 0.5 + 0.5) * 0.05 +
        Math.sin(elapsed * 2.4 + i * 0.18) * 0.015;
    }

    for (let i = 0; i < WAVE_POINTS; i += 1) {
      const t = i / (WAVE_POINTS - 1);
      waveLevels[i] =
        (Math.sin(elapsed * 0.9 + t * Math.PI * 4) * 0.5 + 0.5) * 0.12 +
        Math.sin(elapsed * 0.55 + t * Math.PI * 1.5) * 0.06;
    }
  }

  updateLines(levels, elapsed);
  updateMusicWave(waveLevels, elapsed, smoothVoiceGrowth);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
