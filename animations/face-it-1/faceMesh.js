import * as THREE from 'three';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function faceMask(u, v) {
  const x = (u - 0.5) * 2;
  const y = (v - 0.5) * 2;
  const ellipse = Math.hypot(x / 0.82, y / 0.95);
  return THREE.MathUtils.smoothstep(1.05, 0.45, ellipse);
}

export async function createFaceMesh(imageUrl) {
  const image = await loadImage(imageUrl);
  const width = image.width;
  const height = image.height;
  const aspect = width / height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, width, height).data;

  const segmentsX = 140;
  const segmentsY = Math.round(segmentsX / aspect);
  const meshHeight = 2.35;
  const meshWidth = meshHeight * aspect;
  const thickness = 0.16;

  const geometry = new THREE.PlaneGeometry(meshWidth, meshHeight, segmentsX, segmentsY);
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;
  const masks = new Float32Array(positions.count);

  for (let i = 0; i < positions.count; i += 1) {
    const u = uvs.getX(i);
    const v = uvs.getY(i);
    const px = Math.min(width - 1, Math.max(0, Math.floor(u * (width - 1))));
    const py = Math.min(height - 1, Math.max(0, Math.floor((1 - v) * (height - 1))));
    const offset = (py * width + px) * 4;

    const r = pixels[offset];
    const g = pixels[offset + 1];
    const b = pixels[offset + 2];
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const darkBg = luminance < 0.07 ? 0 : 1;
    const mask = faceMask(u, v);
    const depth = luminance * 0.42 * mask * darkBg;

    const x = positions.getX(i);
    const bend = 0.22;
    positions.setZ(i, depth + (1 - Math.cos(x * bend)) * 0.06);
    masks[i] = mask;
  }

  geometry.computeVertexNormals();

  const baseFrontZ = new Float32Array(positions.count);
  for (let i = 0; i < positions.count; i += 1) {
    baseFrontZ[i] = positions.getZ(i);
    positions.setZ(i, 0);
  }

  geometry.computeVertexNormals();

  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const frontMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.72,
    metalness: 0.02,
  });

  const frontMesh = new THREE.Mesh(geometry, frontMaterial);

  const backGeometry = geometry.clone();
  const backPositions = backGeometry.attributes.position;
  for (let i = 0; i < backPositions.count; i += 1) {
    backPositions.setZ(i, 0);
  }
  backGeometry.computeVertexNormals();

  const backMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a2b22,
    roughness: 0.92,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const group = new THREE.Group();
  group.add(frontMesh);
  group.add(new THREE.Mesh(backGeometry, backMaterial));

  group.userData.pulse = {
    frontGeometry: geometry,
    backGeometry,
    baseFrontZ,
    masks,
    thickness,
  };

  return group;
}

export function updateFacePulse(group, elapsed) {
  const pulse = group.userData.pulse;
  if (!pulse) return;

  const wave = 0.5 + 0.5 * Math.sin(elapsed * 1.1);
  const amount = wave * wave;

  const frontPositions = pulse.frontGeometry.attributes.position;
  const backPositions = pulse.backGeometry.attributes.position;

  for (let i = 0; i < pulse.baseFrontZ.length; i += 1) {
    const baseZ = pulse.baseFrontZ[i];
    const z = baseZ * amount;

    frontPositions.setZ(i, z);
    backPositions.setZ(i, z - pulse.thickness * pulse.masks[i] * amount);
  }

  frontPositions.needsUpdate = true;
  backPositions.needsUpdate = true;
  pulse.frontGeometry.computeVertexNormals();
  pulse.backGeometry.computeVertexNormals();
}
