export const coreVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mvPos.xyz);
  gl_Position = projectionMatrix * mvPos;
}
`;

export const coreFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uPulse;
uniform float uAttention;
uniform vec3 uLookDir;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorCore;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
      mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x),
      f.y
    ),
    mix(
      mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
      mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x),
      f.y
    ),
    f.z
  );
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 view = normalize(vViewDir);

  float fresnel = pow(1.0 - max(dot(n, view), 0.0), 2.8);
  float look = max(dot(n, normalize(uLookDir)), 0.0);
  float iris = smoothstep(0.55, 0.95, look);
  float pupil = smoothstep(0.88, 0.98, look);

  vec3 samplePos = n * 2.2 + vec3(uTime * 0.18, uTime * 0.11, -uTime * 0.14);
  float thought = fbm(samplePos);
  float filaments = fbm(samplePos * 2.4 + thought * 1.5);
  float activity = thought * 0.65 + filaments * 0.35;

  float breathe = 0.5 + 0.5 * sin(uTime * 1.4);
  float pulse = uPulse * (0.55 + 0.45 * fresnel);

  vec3 color = mix(uColorA, uColorB, activity);
  color = mix(color, uColorCore, iris * 0.75);
  color += uColorCore * pupil * 0.9;
  color += vec3(0.85, 0.72, 0.45) * pulse;
  color += vec3(0.35, 0.55, 0.85) * fresnel * (0.45 + uAttention * 0.55);
  color += vec3(0.15, 0.25, 0.4) * breathe * 0.2;

  float rim = fresnel * (0.7 + uAttention * 0.5 + pulse * 0.4);
  color += rim * mix(uColorB, uColorCore, 0.4);

  float alpha = 0.72 + fresnel * 0.28 + pulse * 0.15 + iris * 0.08;
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
}
`;

export const haloVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const haloFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uPulse;
uniform float uIntensity;
uniform vec3 uColor;

varying vec2 vUv;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float angle = atan(p.y, p.x);

  float ring = smoothstep(0.55, 0.72, r) * smoothstep(1.05, 0.78, r);
  float spokes = 0.55 + 0.45 * sin(angle * 8.0 + uTime * 1.2);
  float shimmer = 0.7 + 0.3 * sin(r * 18.0 - uTime * 2.4 + angle * 3.0);
  float pulse = uPulse * smoothstep(1.1, 0.2, r);

  float alpha = ring * spokes * shimmer * uIntensity;
  alpha += pulse * 0.35 * smoothstep(1.0, 0.0, r);
  alpha *= smoothstep(1.15, 0.4, r);

  vec3 color = uColor * (0.85 + pulse * 0.6);
  gl_FragColor = vec4(color, alpha * 0.55);
}
`;

export const bgVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const bgFragmentShader = /* glsl */ `
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uPulse;

varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 st = (uv - 0.5) * aspect;
  vec2 mouse = (uMouse - 0.5) * aspect;

  vec3 color = vec3(0.02, 0.022, 0.035);

  // Soft radial field — the agent's ambient world
  float field = exp(-length(st) * 1.15);
  color += vec3(0.04, 0.07, 0.14) * field;

  // Attention glow toward pointer
  float attention = exp(-length(st - mouse) * 3.2) * 0.22;
  color += vec3(0.12, 0.18, 0.32) * attention;
  color += vec3(0.25, 0.18, 0.08) * uPulse * attention * 2.0;

  // Sparse star / token dust
  vec2 grid = floor(uv * vec2(90.0, 50.0));
  float star = step(0.992, hash21(grid));
  float twinkle = 0.5 + 0.5 * sin(uTime * 2.0 + hash21(grid + 2.3) * 6.28);
  color += star * twinkle * vec3(0.45, 0.55, 0.75) * 0.35;

  // Vignette
  float vig = smoothstep(1.35, 0.25, length(st));
  color *= vig;

  gl_FragColor = vec4(color, 1.0);
}
`;
