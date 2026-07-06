import * as THREE from 'three';
import { createFlameMaterial, createSmokeMaterial } from './fireShaders.js';

const FLAME_COUNT = 640;
const SMOKE_COUNT = 760;
const MIN_OPENING_VERTS = 32;
const OPENING_MERGE_DIST = 0.09;

const heartCenter = new THREE.Vector3();
const samplePoint = new THREE.Vector3();
const tempDir = new THREE.Vector3();
const lightTarget = new THREE.Vector3();

function turbulence(pos, time) {
  return tempDir.set(
    Math.sin(pos.y * 11 + time * 5.2) * 0.55 + Math.cos(pos.z * 8 - time * 3.1) * 0.35,
    Math.sin(pos.x * 9 + time * 4.4) * 0.18,
    Math.cos(pos.x * 10 - time * 4.8) * 0.5 + Math.sin(pos.z * 12 + time * 3.6) * 0.3,
  );
}

export function findVesselOpenings(heart) {
  const bounds = new THREE.Box3();
  const size = new THREE.Vector3();
  const topBand = [];

  heart.updateMatrixWorld(true);
  bounds.setFromObject(heart);
  bounds.getSize(size);
  bounds.getCenter(heartCenter);

  const topThreshold = bounds.max.y - size.y * 0.28;

  heart.traverse((child) => {
    if (!child.isMesh || child.userData.innerShell) return;
    const positions = child.geometry.attributes.position;
    for (let i = 0; i < positions.count; i += 1) {
      samplePoint.fromBufferAttribute(positions, i);
      samplePoint.applyMatrix4(child.matrixWorld);
      if (samplePoint.y >= topThreshold) topBand.push(samplePoint.clone());
    }
  });

  const clusters = new Map();
  for (const point of topBand) {
    const key = `${Math.round(point.x * 10) / 10}_${Math.round(point.z * 10) / 10}`;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(point);
  }

  const candidates = [...clusters.values()]
    .filter((points) => points.length >= MIN_OPENING_VERTS)
    .map((points) => {
      const position = new THREE.Vector3();
      for (const point of points) position.add(point);
      position.divideScalar(points.length);

      const direction = position.clone().sub(heartCenter);
      if (direction.lengthSq() < 0.0001) direction.set(0, 1, 0);
      direction.normalize();
      direction.y = Math.max(direction.y, 0.35);
      direction.normalize();

      return {
        position,
        direction,
        weight: Math.sqrt(points.length),
        radius: 0.015 + Math.min(0.04, points.length / 2000),
      };
    })
    .sort((a, b) => b.position.y - a.position.y || b.weight - a.weight);

  const openings = [];
  for (const candidate of candidates) {
    const tooClose = openings.some(
      (existing) => existing.position.distanceTo(candidate.position) < OPENING_MERGE_DIST,
    );
    if (!tooClose) openings.push(candidate);
  }

  if (openings.length === 0) {
    openings.push({
      position: new THREE.Vector3(-0.06, bounds.max.y - 0.06, -0.05),
      direction: new THREE.Vector3(0, 1, 0.15).normalize(),
      weight: 1,
      radius: 0.02,
    });
  }

  return openings;
}

function createShaderLayer(count, material, baseSize) {
  const particles = Array.from({ length: count }, (_, index) => ({
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    life: 1,
    maxLife: 1,
    seed: Math.random() * 100,
    baseSize,
  }));

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(count), 1));
  geometry.setAttribute('aLife', new THREE.BufferAttribute(new Float32Array(count), 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(count), 1));

  for (let i = 0; i < count; i += 1) {
    geometry.attributes.aSeed.array[i] = particles[i].seed;
    geometry.attributes.aLife.array[i] = 0;
  }

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, particles, material, geometry };
}

export function createAortaFire(parent, openings) {
  const flameLayer = createShaderLayer(FLAME_COUNT, createFlameMaterial(), 0.16);
  const smokeLayer = createShaderLayer(SMOKE_COUNT, createSmokeMaterial(), 0.34);

  flameLayer.points.renderOrder = 22;
  smokeLayer.points.renderOrder = 21;

  const fireLight = new THREE.PointLight(0xff7020, 0, 4.5, 2);
  fireLight.castShadow = false;
  parent.add(smokeLayer.points);
  parent.add(flameLayer.points);
  parent.add(fireLight);

  const glowLight = new THREE.PointLight(0xff4010, 0, 2.8, 2);
  parent.add(glowLight);

  return {
    openings: openings.map((opening) => ({
      position: opening.position.clone(),
      direction: opening.direction.clone(),
      weight: opening.weight,
      radius: opening.radius,
    })),
    flameLayer,
    smokeLayer,
    fireLight,
    glowLight,
    lastContraction: 0,
    elapsed: 0,
  };
}

function pickOpening(openings) {
  const total = openings.reduce((sum, opening) => sum + opening.weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < openings.length; i += 1) {
    roll -= openings[i].weight;
    if (roll <= 0) return i;
  }
  return openings.length - 1;
}

function spawnFlame(particle, opening, intensity) {
  particle.life = 0;
  particle.maxLife = 0.18 + Math.random() * 0.34;
  particle.pos.copy(opening.position);
  particle.pos.x += (Math.random() - 0.5) * opening.radius * 2;
  particle.pos.y += (Math.random() - 0.5) * opening.radius;
  particle.pos.z += (Math.random() - 0.5) * opening.radius * 2;

  const spread = 0.14 + Math.random() * 0.18;
  particle.vel.copy(opening.direction).multiplyScalar(0.75 + intensity * 1.25);
  particle.vel.x += (Math.random() - 0.5) * spread;
  particle.vel.y += 0.12 + Math.random() * 0.22;
  particle.vel.z += (Math.random() - 0.5) * spread;
}

function spawnSmoke(particle, opening, intensity) {
  particle.life = 0;
  particle.maxLife = 0.85 + Math.random() * 1.25;
  particle.pos.copy(opening.position);
  particle.pos.addScaledVector(opening.direction, 0.02);
  particle.pos.x += (Math.random() - 0.5) * opening.radius * 3;
  particle.pos.y += Math.random() * opening.radius * 0.6;
  particle.pos.z += (Math.random() - 0.5) * opening.radius * 3;

  particle.vel.copy(opening.direction).multiplyScalar(0.38 + intensity * 0.72);
  particle.vel.x += (Math.random() - 0.5) * 0.22;
  particle.vel.y += 0.1 + Math.random() * 0.16;
  particle.vel.z += (Math.random() - 0.5) * 0.22;
}

function spawnFromOpenings(fire, kind, count, intensity) {
  const layer = kind === 'flame' ? fire.flameLayer : fire.smokeLayer;
  let spawned = 0;

  for (const particle of layer.particles) {
    if (spawned >= count) break;
    if (particle.life < particle.maxLife) continue;

    const opening = fire.openings[pickOpening(fire.openings)];
    if (kind === 'flame') spawnFlame(particle, opening, intensity);
    else spawnSmoke(particle, opening, intensity);
    spawned += 1;
  }
}

function updateLayer(layer, dt, time, contraction, kind) {
  const positions = layer.geometry.attributes.position.array;
  const sizes = layer.geometry.attributes.aSize.array;
  const lives = layer.geometry.attributes.aLife.array;
  const buoyancy = kind === 'flame' ? 2.6 : 0.82;
  const drag = kind === 'flame' ? 3.1 : 0.95;

  lightTarget.set(0, 0, 0);
  let activeFlames = 0;

  for (let i = 0; i < layer.particles.length; i += 1) {
    const particle = layer.particles[i];
    const offset = i * 3;

    if (particle.life >= particle.maxLife) {
      positions[offset + 1] = -999;
      sizes[i] = 0;
      lives[i] = 0;
      continue;
    }

    particle.life += dt;
    const lifeRatio = 1 - particle.life / particle.maxLife;

    const turb = turbulence(particle.pos, time + particle.seed);
    particle.vel.addScaledVector(turb, dt * (kind === 'flame' ? 1.55 : 1.05));
    particle.vel.y += buoyancy * dt;
    particle.vel.multiplyScalar(Math.exp(-drag * dt));
    particle.pos.addScaledVector(particle.vel, dt);

    positions[offset] = particle.pos.x;
    positions[offset + 1] = particle.pos.y;
    positions[offset + 2] = particle.pos.z;

    lives[i] = lifeRatio;
    sizes[i] = particle.baseSize * (0.55 + lifeRatio * 0.85)
      * (kind === 'flame' ? 0.9 + contraction * 0.35 : 1.25 + lifeRatio * 0.45);

    if (kind === 'flame') {
      lightTarget.add(particle.pos);
      activeFlames += 1;
    }
  }

  layer.geometry.attributes.position.needsUpdate = true;
  layer.geometry.attributes.aSize.needsUpdate = true;
  layer.geometry.attributes.aLife.needsUpdate = true;

  return { activeFlames, lightTarget };
}

export function updateAortaFire(fire, dt, heartbeat) {
  if (!fire || fire.openings.length === 0) return;

  fire.elapsed += dt;
  const { contraction, dub } = heartbeat;
  const rising = contraction > fire.lastContraction && contraction > 0.2;
  fire.lastContraction = contraction;

  const intensity = 0.55 + contraction * 1.1 + dub * 0.35;
  const openingCount = fire.openings.length;

  const flameRate = (openingCount * 3 + contraction * openingCount * 16 + dub * openingCount * 6) * dt;
  const smokeRate = (openingCount * 3.2 + contraction * openingCount * 16 + dub * openingCount * 7) * dt;

  spawnFromOpenings(fire, 'flame', Math.ceil(flameRate), intensity);
  spawnFromOpenings(fire, 'smoke', Math.ceil(smokeRate * 1.6), intensity);

  if (rising) {
    spawnFromOpenings(fire, 'flame', Math.ceil(openingCount * (2 + contraction * 6)), intensity + 0.5);
    spawnFromOpenings(fire, 'smoke', Math.ceil(openingCount * (2.5 + contraction * 6)), intensity + 0.3);
  }

  fire.flameLayer.material.uniforms.uTime.value = fire.elapsed;
  fire.flameLayer.material.uniforms.uIntensity.value = intensity;
  fire.smokeLayer.material.uniforms.uTime.value = fire.elapsed;
  fire.smokeLayer.material.uniforms.uIntensity.value = intensity;

  const flameStats = updateLayer(fire.flameLayer, dt, fire.elapsed, contraction, 'flame');
  updateLayer(fire.smokeLayer, dt, fire.elapsed, contraction, 'smoke');

  if (flameStats.activeFlames > 0) {
    flameStats.lightTarget.divideScalar(flameStats.activeFlames);
    fire.fireLight.position.copy(flameStats.lightTarget);
    fire.fireLight.position.y += 0.08;
    fire.glowLight.position.copy(fire.fireLight.position);
    fire.glowLight.position.y -= 0.04;

    const pulse = 0.35 + contraction * 1.8 + dub * 0.45;
    fire.fireLight.intensity = pulse * 1.35;
    fire.glowLight.intensity = pulse * 0.75;
    fire.fireLight.color.setHSL(0.06 + contraction * 0.015, 1, 0.48 + contraction * 0.08);
    fire.glowLight.color.setHSL(0.03, 1, 0.42);
  } else {
    fire.fireLight.intensity = 0;
    fire.glowLight.intensity = 0;
  }
}

export function disposeAortaFire(fire) {
  if (!fire) return;
  for (const layer of [fire.flameLayer, fire.smokeLayer]) {
    layer.geometry.dispose();
    layer.material.dispose();
  }
}
