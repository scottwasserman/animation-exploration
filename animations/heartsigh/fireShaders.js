import * as THREE from 'three';

const flameVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aLife;
  attribute float aSeed;

  varying float vLife;
  varying float vSeed;

  void main() {
    vLife = aLife;
    vSeed = aSeed;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / max(-mvPosition.z, 0.1));
    gl_PointSize = clamp(gl_PointSize, 4.0, 96.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const flameFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;

  varying float vLife;
  varying float vSeed;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    return value;
  }

  vec3 fireColor(float heat) {
    vec3 col = vec3(0.0);
    col = mix(col, vec3(0.03, 0.0, 0.0), smoothstep(0.0, 0.12, heat));
    col = mix(col, vec3(0.25, 0.01, 0.0), smoothstep(0.12, 0.28, heat));
    col = mix(col, vec3(0.85, 0.08, 0.0), smoothstep(0.28, 0.48, heat));
    col = mix(col, vec3(1.0, 0.35, 0.02), smoothstep(0.48, 0.68, heat));
    col = mix(col, vec3(1.0, 0.72, 0.12), smoothstep(0.68, 0.86, heat));
    col = mix(col, vec3(1.0, 0.95, 0.72), smoothstep(0.86, 1.0, heat));
    return col;
  }

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float radius = length(uv);
    if (radius > 0.5) discard;

    vec2 flow = uv * 3.4;
    flow.y -= vLife * 1.8 - uTime * 1.35;
    flow.x += vSeed * 4.0;
    float n1 = fbm(flow + vec2(uTime * 0.55, vSeed * 2.0));
    float n2 = fbm(flow * 1.9 - vec2(uTime * 0.85, vLife * 2.2));
    float n3 = fbm(flow * 3.2 + vec2(vSeed, uTime * 0.35));

    float mask = smoothstep(0.5, 0.08, radius);
    float body = mask * (0.42 + n1 * 0.38 + n2 * 0.22);
    body *= smoothstep(0.0, 0.14, vLife);
    body *= smoothstep(1.0, 0.42, vLife);
    body *= 0.75 + n3 * 0.35;

    float heat = body * (1.0 - radius * 1.35) + n2 * 0.18;
    heat = clamp(heat * (0.85 + uIntensity * 0.35), 0.0, 1.0);

    vec3 col = fireColor(heat);
    float alpha = body * (0.7 + uIntensity * 0.25);
    alpha *= smoothstep(0.5, 0.12, radius);

    if (alpha < 0.015) discard;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

const smokeVertexShader = flameVertexShader;

const smokeFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;

  varying float vLife;
  varying float vSeed;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p *= 2.05;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float radius = length(uv);
    if (radius > 0.5) discard;

    vec2 flow = uv * 2.2;
    flow.y -= vLife * 0.9 - uTime * 0.35;
    float n = fbm(flow + vec2(vSeed * 3.0, uTime * 0.22));
    float n2 = fbm(flow * 1.7 + vec2(uTime * 0.18, vSeed * 2.0));

    float mask = smoothstep(0.5, 0.02, radius);
    float body = mask * (0.45 + n * 0.55 + n2 * 0.2);
    body *= smoothstep(0.0, 0.15, vLife);
    body *= smoothstep(1.0, 0.18, vLife);

    vec3 warm = vec3(0.22, 0.16, 0.12);
    vec3 mid = vec3(0.38, 0.36, 0.34);
    vec3 cool = vec3(0.14, 0.14, 0.14);
    vec3 col = mix(warm, mid, n * 0.65);
    col = mix(col, cool, vLife * 0.55 + n2 * 0.15);
    float alpha = body * (0.38 + uIntensity * 0.18);
    alpha *= 0.85 + n * 0.25;

    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function createFlameMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0.5 },
    },
    vertexShader: flameVertexShader,
    fragmentShader: flameFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function createSmokeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0.5 },
    },
    vertexShader: smokeVertexShader,
    fragmentShader: smokeFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
}
