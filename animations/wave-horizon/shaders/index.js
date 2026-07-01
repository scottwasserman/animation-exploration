export const vertexShader = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;
uniform float uPulse;
uniform float uCrashX;
uniform float uCrashZ;

varying vec2 vWorldXZ;
varying float vLeftWave;
varying float vRightWave;
varying float vFrontWave;
varying float vBackWave;
varying float vCrashZone;
varying float vElevation;
varying float vChaos;
varying float vHorizonSurge;
varying float vSurgeImpact;
varying vec3 vNormal;
varying float vFogDepth;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = dot(hash2(i), f);
  float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);

  for (int i = 0; i < 4; i++) {
    sum += amp * valueNoise(p);
    p = rot * p * 2.05 + vec2(1.7, 9.2);
    amp *= 0.5;
  }

  return sum;
}

vec2 warpXZ(vec2 xz) {
  float n1 = fbm(xz * 0.07 + uTime * 0.04);
  float n2 = fbm(xz * 0.09 - uTime * 0.03 + 4.0);
  return xz + vec2(n1, n2) * 3.5;
}

float irregularWave(float coord, float speed, float freq, float phase) {
  float w1 = sin(coord * freq - uTime * speed + phase);
  float w2 = sin(coord * freq * 1.73 + uTime * speed * 0.67 + phase * 1.4) * 0.55;
  float w3 = sin(coord * freq * 0.41 - uTime * speed * 1.35 + phase * 2.1) * 0.3;
  return w1 + w2 + w3;
}

float organicMask(float dist, float falloff, float bias) {
  float n = valueNoise(vec2(dist * 0.35 + bias, uTime * 0.08)) * 2.0 - 1.0;
  return smoothstep(falloff + n * 2.5, -2.0 + n, dist);
}

float waveFromLeft(float x, float z, float crashX) {
  float warp = fbm(vec2(x * 0.08, z * 0.06) + uTime * 0.05) * 2.0;
  return irregularWave(x - crashX + warp, 2.1, 0.62 + warp * 0.04, z * 0.11);
}

float waveFromRight(float x, float z, float crashX) {
  float warp = fbm(vec2(x * 0.07 + 3.0, z * 0.05) - uTime * 0.04) * 2.0;
  return irregularWave(crashX - x + warp, 2.35, 0.58 + warp * 0.05, z * 0.13 + 1.7);
}

float waveFromFront(float z, float x, float crashZ) {
  float warp = fbm(vec2(z * 0.08, x * 0.06) + uTime * 0.06) * 2.0;
  return irregularWave(z - crashZ + warp, 1.85, 0.55 + warp * 0.04, x * 0.09);
}

float waveFromBack(float z, float x, float crashZ) {
  float warp = fbm(vec2(z * 0.09 + 5.0, x * 0.07) - uTime * 0.045) * 2.0;
  return irregularWave(crashZ - z + warp, 2.05, 0.6 + warp * 0.03, x * 0.12 + 2.3);
}

float horizonSurge(float x, float z, float crashX, float crashZ, out float impact) {
  const float SURGE_PERIOD = 28.0;
  const float SURGE_TRAVEL = 11.0;

  float cycleT = mod(uTime, SURGE_PERIOD);
  if (cycleT > SURGE_TRAVEL) {
    impact = 0.0;
    return 0.0;
  }

  float progress = cycleT / SURGE_TRAVEL;
  float front = mix(-44.0, 10.0, pow(progress, 0.85));
  float behindFront = front - z;

  float xRipple = sin(x * 0.22 + uTime * 0.35) * 0.35;
  float swell = exp(-pow((behindFront + xRipple) / 7.0, 2.0));
  float crest = exp(-pow((behindFront + xRipple) / 2.4, 2.0)) * 1.4;
  float wall = (swell * 2.2 + crest) * smoothstep(14.0, -2.0, behindFront);

  float crashDist = length(vec2(x - crashX, z - crashZ));
  float frontNearCrash = exp(-pow((front - crashZ) / 4.0, 2.0));
  impact = frontNearCrash * exp(-crashDist * 0.12) * wall * 3.5;

  return wall * (0.85 + 0.15 * sin(x * 0.18 + z * 0.07));
}

float sampleHeight(vec2 xz, float crashX, float crashZ) {
  vec2 w = warpXZ(xz);
  float x = w.x;
  float z = w.y;

  float left = waveFromLeft(x, z, crashX);
  float right = waveFromRight(x, z, crashX);
  float front = waveFromFront(z, x, crashZ);
  float back = waveFromBack(z, x, crashZ);

  float xDist = xz.x - crashX;
  float zDist = xz.y - crashZ;
  float chaos = fbm(xz * 0.12 + uTime * 0.02);

  float leftMask = organicMask(-xDist, 13.0, 0.0);
  float rightMask = organicMask(xDist, 13.0, 2.1);
  float frontMask = organicMask(zDist, 13.0, 4.2);
  float backMask = organicMask(-zDist, 13.0, 6.3);

  float amp = 0.45 + chaos * 0.55;
  float lateralCrash = max(0.0, left) * max(0.0, right);
  float depthCrash = max(0.0, front) * max(0.0, back);
  float centerSurge = lateralCrash * amp + depthCrash * amp * 0.85 + lateralCrash * depthCrash * 1.8;

  float ringPhase = length(vec2(xDist, zDist)) * (3.2 + chaos * 1.5) - uTime * (4.5 + chaos * 2.0);
  float ring = sin(ringPhase) * exp(-length(vec2(xDist, zDist)) * (0.22 + chaos * 0.08)) * 0.35;

  float impact = 0.0;
  float surge = horizonSurge(xz.x, xz.y, crashX, crashZ, impact);

  return left * leftMask * amp * 0.5
       + right * rightMask * amp * 0.5
       + front * frontMask * amp * 0.42
       + back * backMask * amp * 0.42
       + centerSurge
       + ring
       + surge
       + impact;
}

void main() {
  vec3 pos = position;
  vec2 xz = pos.xz;
  float x = xz.x;
  float z = xz.y;

  vec2 mouseWorld = vec2((uMouse.x - 0.5) * 36.0, (uMouse.y - 0.5) * 24.0 - 8.0);
  float mouseDist = length(xz - mouseWorld);
  float mouseLift = exp(-mouseDist * 0.22) * 0.55;
  float clickRipple = sin(mouseDist * (3.0 + fbm(xz * 0.2) * 2.0) - uTime * 5.0) * uPulse * exp(-mouseDist * 0.35);

  float left = waveFromLeft(x, z, uCrashX);
  float right = waveFromRight(x, z, uCrashX);
  float front = waveFromFront(z, x, uCrashZ);
  float back = waveFromBack(z, x, uCrashZ);

  float xDist = x - uCrashX;
  float zDist = z - uCrashZ;
  float chaos = fbm(xz * 0.12 + uTime * 0.02);

  float leftMask = organicMask(-xDist, 13.0, 0.0);
  float rightMask = organicMask(xDist, 13.0, 2.1);
  float frontMask = organicMask(zDist, 13.0, 4.2);
  float backMask = organicMask(-zDist, 13.0, 6.3);

  float amp = 0.45 + chaos * 0.55;
  float lateralCrash = max(0.0, left) * max(0.0, right);
  float depthCrash = max(0.0, front) * max(0.0, back);
  float centerSurge = lateralCrash * amp + depthCrash * amp * 0.85 + lateralCrash * depthCrash * 1.8;

  float surgeImpact = 0.0;
  float horizonWall = horizonSurge(x, z, uCrashX, uCrashZ, surgeImpact);

  float elevation = left * leftMask * amp * 0.5
                  + right * rightMask * amp * 0.5
                  + front * frontMask * amp * 0.42
                  + back * backMask * amp * 0.42
                  + centerSurge
                  + horizonWall
                  + surgeImpact
                  + mouseLift
                  + clickRipple;

  pos.y += elevation;

  float eps = 0.1;
  float hX = sampleHeight(xz + vec2(eps, 0.0), uCrashX, uCrashZ);
  float hZ = sampleHeight(xz + vec2(0.0, eps), uCrashX, uCrashZ);

  vec3 tangentX = normalize(vec3(eps, hX - elevation, 0.0));
  vec3 tangentZ = normalize(vec3(0.0, hZ - elevation, eps));
  vec3 normal = normalize(cross(tangentZ, tangentX));

  vWorldXZ = xz;
  vLeftWave = left * leftMask;
  vRightWave = right * rightMask;
  vFrontWave = front * frontMask;
  vBackWave = back * backMask;
  vChaos = chaos;
  vHorizonSurge = horizonWall;
  vSurgeImpact = surgeImpact;
  vCrashZone = exp(-dot(vec2(xDist, zDist), vec2(xDist, zDist)) / (2.8 + chaos * 1.5) / (2.8 + chaos * 1.5));
  vElevation = elevation;
  vNormal = normalMatrix * normal;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vFogDepth = -mvPosition.z;

  gl_Position = projectionMatrix * mvPosition;
}
`;

export const fragmentShader = /* glsl */ `
uniform vec3 uLeftColor;
uniform vec3 uRightColor;
uniform vec3 uCrashColor;
uniform vec3 uHorizonSurgeColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uCrashX;
uniform float uCrashZ;
uniform float uTime;

varying vec2 vWorldXZ;
varying float vLeftWave;
varying float vRightWave;
varying float vFrontWave;
varying float vBackWave;
varying float vCrashZone;
varying float vElevation;
varying float vChaos;
varying float vHorizonSurge;
varying float vSurgeImpact;
varying vec3 vNormal;
varying float vFogDepth;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = dot(hash2(i), f);
  float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  float xDist = vWorldXZ.x - uCrashX;
  float zDist = vWorldXZ.y - uCrashZ;
  float grain = valueNoise(vWorldXZ * 0.25 + uTime * 0.03);

  float leftMask = smoothstep(14.0 + grain * 4.0, -2.0, -xDist);
  float rightMask = smoothstep(-14.0 - grain * 4.0, 2.0, xDist);
  float frontMask = smoothstep(14.0 + grain * 3.0, -2.0, zDist);
  float backMask = smoothstep(-14.0 - grain * 3.0, 2.0, -zDist);

  float leftStrength = (vLeftWave * 0.5 + 0.5) * leftMask;
  float rightStrength = (vRightWave * 0.5 + 0.5) * rightMask;
  float frontStrength = (vFrontWave * 0.5 + 0.5) * frontMask;
  float backStrength = (vBackWave * 0.5 + 0.5) * backMask;

  float sideBlend = smoothstep(-7.0 - vChaos * 3.0, 7.0 + vChaos * 3.0, xDist + grain * 2.0);
  vec3 leftSide = uLeftColor * (0.28 + leftStrength * (0.7 + grain * 0.35));
  vec3 rightSide = uRightColor * (0.28 + rightStrength * (0.7 + grain * 0.35));
  vec3 lateralColor = mix(leftSide, rightSide, sideBlend);

  float depthBlend = smoothstep(-7.0, 7.0, zDist);
  vec3 depthTint = mix(uLeftColor * 0.5, uRightColor * 0.5, depthBlend);
  vec3 color = mix(lateralColor, depthTint, (frontStrength + backStrength) * (0.18 + grain * 0.12));

  float lateralMeet = leftStrength * rightStrength;
  float depthMeet = frontStrength * backStrength;
  float centerMeet = lateralMeet * 0.7 + depthMeet * 0.5 + lateralMeet * depthMeet * 1.1;

  vec3 blended = mix(uLeftColor, uRightColor, 0.5 + grain * 0.2 - 0.1);
  blended = mix(blended, uCrashColor, centerMeet * (0.65 + vChaos * 0.35));

  color = mix(color, blended, vCrashZone * (0.45 + centerMeet * 0.9));
  color += uCrashColor * vCrashZone * centerMeet * (0.7 + grain * 0.5);

  color = mix(color, uHorizonSurgeColor, clamp(vHorizonSurge * 0.55, 0.0, 1.0));
  color += uHorizonSurgeColor * vSurgeImpact * (0.85 + grain * 0.3);
  color += vec3(1.0, 0.98, 0.95) * vSurgeImpact * 0.45;

  vec3 lightDir = normalize(vec3(0.35 + grain * 0.2, 0.9, -0.25));
  float diffuse = max(dot(normalize(vNormal), lightDir), 0.0);
  float spec = pow(max(dot(reflect(-lightDir, normalize(vNormal)), vec3(0.0, 0.0, -1.0)), 0.0), 22.0 + grain * 12.0);

  color *= 0.58 + diffuse * (0.72 + vChaos * 0.2);
  color += vec3(1.0, 0.95, 0.9) * spec * (0.25 + grain * 0.25);
  color += vec3(0.06, 0.1, 0.18) * vElevation;

  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
  color = mix(color, uFogColor, fogFactor);

  gl_FragColor = vec4(color, 1.0);
}
`;
