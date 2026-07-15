import"./modulepreload-polyfill-B5Qt9EMX.js";import{S as v,O as g,W as w,m as i,n as x,f as y,h as b,e as P}from"./three.module-BlzTrhr8.js";const S=`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,M=`
precision highp float;

uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform float uPulse;

varying vec2 vUv;

#define PI 3.14159265359
#define TAU 6.28318530718

vec3 hsv2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z * mix(vec3(1.0), rgb, c.y);
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float softDot(vec2 p, float radius) {
  float d = length(p);
  float core = smoothstep(radius, radius * 0.15, d);
  float halo = exp(-d * d / max(radius * radius * 2.2, 1e-4)) * 0.35;
  return clamp(core + halo, 0.0, 1.0);
}

float latticeLayer(float spoke, float ring, float densityScale, float morph, vec2 seed) {
  // Keep densities moderate so beads stay discrete (not fused into radial streaks)
  float spokeDensity = mix(40.0, 72.0, morph) * densityScale;
  float ringDensity = mix(16.0, 30.0, morph) * densityScale;

  vec2 cell = vec2(spoke * spokeDensity, ring * ringDensity);
  vec2 id = floor(cell);
  vec2 f = fract(cell) - 0.5;

  float n = hash21(id + seed);
  f += (n - 0.5) * mix(0.05, 0.14, morph);

  // Round beads early; slight capsule stretch only late in the trip
  float stretch = mix(1.0, 1.55, smoothstep(0.65, 1.0, morph));
  f.x *= stretch;

  float radius = mix(0.26, 0.17, morph) / max(densityScale * 0.85, 0.5);
  radius *= mix(1.25, 0.7, clamp(ring * 0.03, 0.0, 1.0));

  return softDot(f, radius) * mix(0.8, 1.0, n);
}

vec3 sampleTunnel(vec2 p, float time, float eyeSign, float morph) {
  float r = length(p);
  float a = atan(p.y, p.x);

  float lobes = mix(6.0, 10.0, smoothstep(0.0, 0.45, morph));
  lobes = mix(lobes, 5.0, smoothstep(0.55, 0.9, morph));

  float waveAmp = 0.1 + 0.4 * sin(morph * PI);
  float spiral = smoothstep(0.5, 1.0, morph) * 1.55;

  float depthHint = 1.0 / max(r, 0.018);
  float radiusMod =
    1.0
    + waveAmp * sin(a * lobes + time * 1.2 + depthHint * 0.3)
    * (0.5 + 0.5 * cos(depthHint * 0.5 - time * 0.75))
    + 0.14 * sin(a * (lobes * 2.0) - time * 1.55)
    + 0.08 * sin(a * 3.0 + time * 0.5 + eyeSign);

  float rr = r / max(radiusMod, 0.28);

  float speed = mix(0.7, 1.3, 0.5 + 0.5 * sin(morph * TAU + 1.0));
  float z = 0.18 / max(rr, 0.014) + time * speed;
  a += spiral * log(max(rr, 0.012)) * eyeSign + time * mix(0.04, 0.3, morph);

  float spoke = a / TAU;
  float ring = z;

  float g1 = latticeLayer(spoke, ring, 1.0, morph, vec2(1.7 + eyeSign, 3.1));
  float g2 = latticeLayer(spoke + 0.37, ring + 0.41, 1.4, morph, vec2(9.2, 4.4));
  float g3 = latticeLayer(spoke, ring, 2.2, morph, vec2(2.2, 8.8)) * smoothstep(0.28, 0.75, morph) * 0.5;

  float glow = g1 + g2 * 0.8 + g3;
  glow *= smoothstep(1.25, 0.03, rr);
  glow *= smoothstep(0.0, 0.025, rr);

  float ringPulse = pow(0.5 + 0.5 * sin(z * mix(11.0, 20.0, morph)), 10.0);
  glow *= 0.7 + 0.6 * ringPulse;

  // Mostly depth-driven hue (avoids hard quadrant splits); light angle tint
  float hue = fract(
    z * 0.038
    + time * 0.028
    + morph * 0.3
    + eyeSign * mix(0.03, 0.12, sin(morph * PI))
    + spoke * mix(0.04, 0.18, morph)
  );

  // Warm early trip (red / orange / gold)
  hue = fract(hue - (1.0 - morph) * 0.12);

  float sat = mix(0.92, 1.0, morph);
  float val = 0.3 + 0.95 * glow;

  vec3 col = hsv2rgb(vec3(hue, sat, val));

  float core = exp(-rr * 18.0);
  col += vec3(1.0, 0.85, 0.42) * core * (0.2 + 0.8 * glow) * mix(1.0, 0.35, morph);

  col *= glow;
  col += col * glow * 1.9;
  col += hsv2rgb(vec3(fract(hue + 0.06), sat * 0.8, 1.0)) * glow * glow * 0.7;

  return col;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 st = (uv - 0.5) * vec2(aspect, 1.0);

  // Mirror into +x so each half of the screen gets its own tunnel
  float eyeSign = (st.x < 0.0) ? -1.0 : 1.0;
  vec2 local = vec2(abs(st.x), st.y);

  // Place vanishing point in the middle of each half
  // Half-width in aspect space is aspect*0.5; center of a half ≈ aspect*0.25
  float halfW = aspect * 0.5;
  float sep = clamp(halfW * 0.52, 0.16, 0.42);
  vec2 eye = vec2(sep, 0.0);
  vec2 p = local - eye;

  vec2 mouse = (uMouse - 0.5) * vec2(aspect, 1.0);
  mouse.x = abs(mouse.x);
  vec2 mouseP = mouse - eye;
  float mDist = length(p - mouseP);
  float influence = smoothstep(0.7, 0.0, mDist);
  p += influence * normalize(p - mouseP + 0.001) * 0.05;

  float time = uTime;
  float morph = fract(time / 28.0);

  vec3 color = sampleTunnel(p, time, eyeSign, morph);

  float pulse = uPulse * exp(-mDist * 4.0);
  color += pulse * vec3(0.95, 0.8, 1.0) * 0.55;
  color *= 1.0 + pulse * 0.35;

  // Soft vignette per-half so tunnel mouths stay bright
  float vig = smoothstep(1.1, 0.15, length(p));
  color *= mix(0.45, 1.0, vig);

  color = max(color, vec3(0.0));
  color = pow(color, vec3(0.9));

  gl_FragColor = vec4(color, 1.0);
}
`,n=document.getElementById("overlay"),c=new v,T=new g(-1,1,1,-1,0,1),t=new w({antialias:!0,alpha:!1,powerPreference:"high-performance"});t.setPixelRatio(Math.min(window.devicePixelRatio,2));t.setSize(window.innerWidth,window.innerHeight);t.setClearColor(0,1);document.body.appendChild(t.domElement);const o={uTime:{value:0},uMouse:{value:new i(.5,.5)},uResolution:{value:new i(window.innerWidth,window.innerHeight)},uPulse:{value:0}},k=new x({vertexShader:S,fragmentShader:M,uniforms:o}),L=new y(new b(2,2),k);c.add(L);const m=new i(.5,.5),r=new i(.5,.5);let l=0,s=!1;function p(e){const a=e.clientX/window.innerWidth,f=1-e.clientY/window.innerHeight;m.set(a,f),s||(s=!0,n.classList.add("hidden"))}window.addEventListener("pointermove",p);window.addEventListener("pointerdown",e=>{l=1,p(e)});window.setTimeout(()=>{s||(s=!0,n.classList.add("hidden"))},2800);window.addEventListener("resize",()=>{const{innerWidth:e,innerHeight:a}=window;t.setSize(e,a),o.uResolution.value.set(e,a)});const h=new P;let u=0;Object.defineProperty(window,"__tripTime",{get(){return o.uTime.value},set(e){u=Number(e)-h.getElapsedTime()}});function d(){o.uTime.value=h.getElapsedTime()+u,r.lerp(m,.07),o.uMouse.value.copy(r),l*=.9,o.uPulse.value=l,t.render(c,T),requestAnimationFrame(d)}d();
