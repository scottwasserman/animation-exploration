import"./modulepreload-polyfill-B5Qt9EMX.js";import{S as rt,C as M,ar as nt,P as it,W as st,m as G,n as lt,D as ct,h as ft,f as ut,as as ht,i as mt,L as vt,V as pt,o as dt,B as gt,e as xt}from"./three.module-pFCUkMKb.js";const wt=`
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
`,Mt=`
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
uniform float uLineMode;

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

  if (uLineMode > 0.5) {
    float field = vElevation * 9.0 + vHorizonSurge * 3.5 + vSurgeImpact * 5.0 + grain * 0.35;
    float major = abs(fract(field * 0.55) - 0.5) * 2.0;
    float minor = abs(fract(field * 1.8) - 0.5) * 2.0;
    float line = 1.0 - smoothstep(0.93, 1.0, major);
    line = max(line, (1.0 - smoothstep(0.96, 1.0, minor)) * 0.4);

    float peak = smoothstep(0.55, 1.15, vElevation + vSurgeImpact * 0.45);
    vec3 green = mix(vec3(0.06, 0.42, 0.18), vec3(0.35, 0.98, 0.42), line);
    vec3 color = green * line;
    color += vec3(1.0) * peak * (0.55 + line * 0.45);

    float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
    color = mix(color, uFogColor * 0.2, fogFactor * 0.9);
    gl_FragColor = vec4(color, 1.0);
    return;
  }

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
`;function H(e,t,a){const o=Math.max(0,Math.min(1,(a-e)/(t-e)));return o*o*(3-2*o)}function D(e,t,a,o,r){const n=Math.sin(t*o-e*a+r),l=Math.sin(t*o*1.73+e*a*.67+r*1.4)*.55,i=Math.sin(t*o*.41-e*a*1.35+r*2.1)*.3;return n+l+i}function L(e,t){return H(t,-2,e)}function _(e,t,a,o,r){const i=e%28;if(i>11)return{wall:0,impact:0};const c=-44+54*(i/11)**.85,h=c-a,u=Math.sin(t*.22+e*.35)*.35,m=Math.exp(-(((h+u)/7)**2)),g=Math.exp(-(((h+u)/2.4)**2))*1.4,C=(m*2.2+g)*H(14,-2,h),v=Math.hypot(t-o,a-r),w=Math.exp(-(((c-r)/4)**2))*Math.exp(-v*.12)*C*3.5;return{wall:C,impact:w}}function Ct(e,t,a,o,r){const n=D(e,t-o,2.1,.62,a*.11),l=D(e,o-t,2.35,.58,a*.13+1.7),i=D(e,a-r,1.85,.55,t*.09),s=D(e,r-a,2.05,.6,t*.12+2.3),c=t-o,h=a-r,u=L(-c,13),m=L(c,13),g=L(h,13),C=L(-h,13),v=.7,F=Math.max(0,n)*Math.max(0,l),w=Math.max(0,i)*Math.max(0,s),S=F*v+w*v*.85+F*w*1.8,{wall:b,impact:p}=_(e,t,a,o,r);return n*u*v*.5+l*m*v*.5+i*g*v*.42+s*C*v*.42+S+b+p}class kt{constructor(){this.prevHeight=0,this.prevVelocity=0,this.prevImpact=0,this.cooldown=0}update(t,a,o,r,n){const l=Ct(t,a,o,a,o),i=(l-this.prevHeight)/Math.max(r,.001),{impact:s}=_(t,a,o,a,o);this.cooldown-=r;const c=this.prevVelocity>.04&&i<=0&&l>.45&&this.cooldown<=0,h=s>.6&&s>=this.prevImpact&&this.prevImpact<s*.92&&this.cooldown<=0;if(c||h){const u=Math.min(1,h?s/2.8:l/2.2);n(u,h),this.cooldown=h?.35:1.1}this.prevHeight=l,this.prevVelocity=i,this.prevImpact=s}}class yt{constructor(){this.ctx=null,this.master=null,this.bedGain=null,this.bedNode=null,this.enabled=!1,this.muted=!0,this.volume=.75,this.maxGain=.42}async init(){return this.enabled?!0:(this.ctx||(this.ctx=new AudioContext,this.master=this.ctx.createGain(),this.master.gain.value=0,this.master.connect(this.ctx.destination)),this.ctx.state!=="running"&&await this.ctx.resume(),this.ctx.state!=="running"?!1:(this.bedNode||this.startBed(),this.enabled=!0,!0))}startBed(){if(!this.ctx||this.ctx.state!=="running")return;const t=this.ctx.sampleRate*3,a=this.ctx.createBuffer(1,t,this.ctx.sampleRate),o=a.getChannelData(0);let r=0;for(let l=0;l<t;l+=1){const i=Math.random()*2-1;r=r*.98+i*.15,o[l]=r*.35}this.bedNode=this.ctx.createBufferSource(),this.bedNode.buffer=a,this.bedNode.loop=!0;const n=this.ctx.createBiquadFilter();n.type="lowpass",n.frequency.value=280,n.Q.value=.6,this.bedGain=this.ctx.createGain(),this.bedGain.gain.value=.08,this.bedNode.connect(n),n.connect(this.bedGain),this.bedGain.connect(this.master),this.bedNode.start()}playPeak(t=.5,a=!1){if(!this.enabled||this.muted||!this.ctx||this.ctx.state!=="running")return;const o=this.ctx.currentTime,r=Math.max(.15,Math.min(1,t));if(a){this.playSurgeSound(o,r);return}const n=1.5+r*.8;this.playNoiseWash(o,n,r),this.playToneSwell(o,n,r)}playSurgeSound(t,a){const o=3.2+a*.8,r=Math.floor(this.ctx.sampleRate*o),n=this.ctx.createBuffer(1,r,this.ctx.sampleRate),l=n.getChannelData(0);for(let p=0;p<r;p+=1){const W=p/r,ot=Math.sin(Math.PI*W)**.65;l[p]=(Math.random()*2-1)*ot}const i=this.ctx.createBufferSource();i.buffer=n;const s=this.ctx.createBiquadFilter();s.type="bandpass",s.frequency.value=180+a*90,s.Q.value=.35;const c=this.ctx.createGain(),h=.26*a;c.gain.setValueAtTime(1e-4,t),c.gain.exponentialRampToValueAtTime(h,t+.35),c.gain.exponentialRampToValueAtTime(1e-4,t+o),i.connect(s),s.connect(c),c.connect(this.master),i.start(t),i.stop(t+o+.05);const u=this.ctx.createOscillator();u.type="triangle",u.frequency.setValueAtTime(38+a*12,t),u.frequency.exponentialRampToValueAtTime(24,t+o*.7);const m=this.ctx.createGain();m.gain.setValueAtTime(1e-4,t),m.gain.exponentialRampToValueAtTime(.14*a,t+.08),m.gain.exponentialRampToValueAtTime(1e-4,t+o*.85);const g=this.ctx.createBiquadFilter();g.type="lowpass",g.frequency.value=120,u.connect(g),g.connect(m),m.connect(this.master),u.start(t),u.stop(t+o+.05);const C=Math.floor(this.ctx.sampleRate*.18),v=this.ctx.createBuffer(1,C,this.ctx.sampleRate),F=v.getChannelData(0);for(let p=0;p<C;p+=1){const W=p/C;F[p]=(Math.random()*2-1)*(1-W)**2}const w=this.ctx.createBufferSource();w.buffer=v;const S=this.ctx.createBiquadFilter();S.type="highpass",S.frequency.value=900;const b=this.ctx.createGain();b.gain.setValueAtTime(.08*a,t),b.gain.exponentialRampToValueAtTime(1e-4,t+.18),w.connect(S),S.connect(b),b.connect(this.master),w.start(t),w.stop(t+.25)}playNoiseWash(t,a,o){const r=Math.floor(this.ctx.sampleRate*a),n=this.ctx.createBuffer(1,r,this.ctx.sampleRate),l=n.getChannelData(0);for(let u=0;u<r;u+=1){const m=u/r,g=Math.sin(Math.PI*m)**1.1;l[u]=(Math.random()*2-1)*g}const i=this.ctx.createBufferSource();i.buffer=n;const s=this.ctx.createBiquadFilter();s.type="bandpass",s.frequency.value=620+o*320,s.Q.value=.45;const c=this.ctx.createGain(),h=.14*o;c.gain.setValueAtTime(1e-4,t),c.gain.exponentialRampToValueAtTime(h,t+.12),c.gain.exponentialRampToValueAtTime(1e-4,t+a),i.connect(s),s.connect(c),c.connect(this.master),i.start(t),i.stop(t+a+.05)}playToneSwell(t,a,o){const r=this.ctx.createOscillator();r.type="sine",r.frequency.setValueAtTime(92+o*55,t),r.frequency.exponentialRampToValueAtTime(72,t+a);const n=this.ctx.createGain(),l=.06*o;n.gain.setValueAtTime(1e-4,t),n.gain.exponentialRampToValueAtTime(l,t+a*.35),n.gain.exponentialRampToValueAtTime(1e-4,t+a);const i=this.ctx.createBiquadFilter();i.type="lowpass",i.frequency.value=520,r.connect(i),i.connect(n),n.connect(this.master),r.start(t),r.stop(t+a+.05)}setMuted(t){this.muted=t,this.applyGain()}setVolume(t){this.volume=Math.max(0,Math.min(1,t)),this.volume===0&&(this.muted=!0),this.applyGain()}applyGain(){if(!this.master||!this.ctx)return;const t=this.muted?0:this.volume*this.maxGain;this.master.gain.cancelScheduledValues(this.ctx.currentTime),this.master.gain.setTargetAtTime(t,this.ctx.currentTime,.12)}}const U=document.getElementById("overlay"),O=document.getElementById("sound-control"),A=document.getElementById("sound-toggle"),d=document.getElementById("sound-volume"),St=d.querySelector(".sound-volume-fill"),bt=d.querySelector(".sound-volume-track"),zt=d.querySelector(".sound-volume-thumb"),E=document.getElementById("line-mode-toggle"),y=new rt,z=new M(1714248),I=new M(266248);y.fog=new nt(z,18,65);const j=At(z),Tt=new M(133126);y.background=j;const k=new it(48,window.innerWidth/window.innerHeight,.1,120);k.position.set(0,2.2,14);k.lookAt(0,.4,-28);const T=new st({antialias:!0,alpha:!1,powerPreference:"high-performance"});T.setPixelRatio(Math.min(window.devicePixelRatio,2));T.setSize(window.innerWidth,window.innerHeight);document.body.appendChild(T.domElement);const x={uTime:{value:0},uMouse:{value:new G(.5,.5)},uPulse:{value:0},uCrashX:{value:0},uCrashZ:{value:-12},uLeftColor:{value:new M(16727327)},uRightColor:{value:new M(1743871)},uCrashColor:{value:new M(13660415)},uHorizonSurgeColor:{value:new M(11071231)},uFogColor:{value:z},uFogNear:{value:18},uFogFar:{value:65},uLineMode:{value:0}},Ft=new lt({vertexShader:wt,fragmentShader:Mt,uniforms:x,side:ct});T.capabilities.isWebGL2===!1&&(U.querySelector("p").textContent="WebGL is required to view this animation.");const P=new ft(90,90,220,220);P.rotateX(-Math.PI/2);P.translate(0,0,-12);const Rt=new ut(P,Ft);y.add(Rt);const Q=Bt(y,z),Dt=Q.material.color.clone(),Lt=new M(4054906);let Y=!1;const $=new G(.5,.5),X=new G(.5,.5);let B=0,N=!1;const Et=new kt,f=new yt;function Vt(e){const t=Math.max(0,Math.min(100,e));St.style.height=`${t}%`,zt.style.bottom=`${t}%`,d.setAttribute("aria-valuenow",String(Math.round(t)))}function K(e){const t=bt.getBoundingClientRect(),a=(1-(e.clientY-t.top)/t.height)*100;return Math.round(Math.max(0,Math.min(100,a)))}function Z(){const e=f.muted||!f.enabled,t=Math.round(f.volume*100);O.classList.toggle("is-muted",e),A.setAttribute("aria-pressed",String(!e)),A.setAttribute("aria-label",e?"Turn sound on":"Turn sound off"),Vt(t)}async function R(e){const t=Math.max(0,Math.min(100,e))/100;t>0&&!f.enabled&&!await f.init()||(f.setVolume(t),t>0?f.setMuted(!1):f.setMuted(!0),Z())}async function J(e){e&&!f.enabled&&!await f.init()||(e&&f.volume===0&&f.setVolume(.75),f.setMuted(!e),Z())}function tt(){f.enabled||J(!0)}A.addEventListener("click",()=>{J(f.muted||!f.enabled)});let V=!1;d.addEventListener("pointerdown",e=>{V=!0,d.setPointerCapture(e.pointerId),R(K(e))});d.addEventListener("pointermove",e=>{V&&R(K(e))});d.addEventListener("pointerup",e=>{V=!1,d.releasePointerCapture(e.pointerId)});d.addEventListener("pointercancel",()=>{V=!1});d.addEventListener("keydown",e=>{const t=e.shiftKey?10:5,a=Math.round(f.volume*100);e.key==="ArrowUp"||e.key==="ArrowRight"?(e.preventDefault(),R(a+t)):(e.key==="ArrowDown"||e.key==="ArrowLeft")&&(e.preventDefault(),R(a-t))});O.addEventListener("wheel",e=>{e.preventDefault();const t=e.deltaY>0?-5:5;R(Math.round(f.volume*100)+t)},{passive:!1});Z();function Wt(e){Y=e,x.uLineMode.value=e?1:0,y.background=e?Tt:j,y.fog.color.copy(e?I:z),x.uFogColor.value.copy(e?I:z),Q.material.color.copy(e?Lt:Dt),E.classList.toggle("is-active",e),E.setAttribute("aria-pressed",String(e)),E.setAttribute("aria-label",e?"Switch to color view":"Switch to green line view")}E.addEventListener("click",()=>{Wt(!Y)});function et(e){$.set(e.clientX/window.innerWidth,1-e.clientY/window.innerHeight),N||(N=!0,U.classList.add("hidden"))}window.addEventListener("pointermove",et);window.addEventListener("pointerdown",e=>{B=1,tt(),et(e)});window.addEventListener("keydown",tt);window.addEventListener("resize",()=>{const{innerWidth:e,innerHeight:t}=window;k.aspect=e/t,k.updateProjectionMatrix(),T.setSize(e,t)});const q=new xt;function at(){const e=q.getDelta(),t=q.getElapsedTime();x.uTime.value=t,X.lerp($,.07),x.uMouse.value.copy(X),B*=.9,x.uPulse.value=B,x.uCrashX.value=Math.sin(t*.18)*5+Math.sin(t*.05+1.2)*3+Math.sin(t*.31+2.7)*1.5,x.uCrashZ.value=-12+Math.sin(t*.15+.8)*4.5+Math.sin(t*.04)*2.5+Math.cos(t*.27+1.1)*1.8,Et.update(t,x.uCrashX.value,x.uCrashZ.value,e,(a,o)=>f.playPeak(a,o)),k.position.x=Math.sin(t*.12)*.35,k.position.y=2.2+Math.sin(t*.18)*.08,k.lookAt(0,.35,-28),T.render(y,k),requestAnimationFrame(at)}at();function At(e){const t=document.createElement("canvas");t.width=2,t.height=512;const a=t.getContext("2d"),o=a.createLinearGradient(0,0,0,t.height);o.addColorStop(0,"#060b18"),o.addColorStop(.45,"#0f1a35"),o.addColorStop(.72,e.getStyle()),o.addColorStop(1,"#243a62"),a.fillStyle=o,a.fillRect(0,0,t.width,t.height);const r=new ht(t);return r.colorSpace=mt,r}function Bt(e,t){const a=new vt({color:new M(16777215).lerp(t,.35),transparent:!0,opacity:.55}),o=[];for(let n=-50;n<=50;n+=1)o.push(new pt(n,.02,-42));const r=new dt(new gt().setFromPoints(o),a);return e.add(r),r}
