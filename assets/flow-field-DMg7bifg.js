import"./modulepreload-polyfill-B5Qt9EMX.js";import{S as d,O as x,W as f,a as w,V as i,M as p,P as h,C as y}from"./three.module-B1NyhNvA.js";const g=`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,M=`
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform float uPulse;

varying vec2 vUv;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,
    0.366025403784439,
    -0.577350269189626,
    0.024390243902439
  );
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.853735475938592 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));

  for (int i = 0; i < 5; i++) {
    value += amplitude * snoise(p);
    p = rot * p * 2.0 + vec2(1.7, 9.2);
    amplitude *= 0.5;
  }

  return value;
}

vec3 palette(float t) {
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.0, 0.33, 0.67);
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 st = (uv - 0.5) * aspect;

  vec2 mouse = (uMouse - 0.5) * aspect;
  float dist = length(st - mouse);
  float influence = smoothstep(0.55, 0.0, dist);

  vec2 warp = st;
  warp += influence * normalize(st - mouse + 0.001) * 0.18;
  warp += vec2(
    fbm(st * 2.0 + uTime * 0.08),
    fbm(st * 2.0 - uTime * 0.06 + 4.0)
  ) * 0.35;

  float n = fbm(warp * 1.6 + uTime * 0.12);
  float n2 = fbm(warp * 3.0 - uTime * 0.08 + n);

  float pulse = uPulse * exp(-dist * 3.5) * 0.6;
  float field = n * 0.6 + n2 * 0.4 + influence * 0.35 + pulse;

  vec3 color = palette(field + uTime * 0.04 + influence * 0.2);
  color = mix(vec3(0.02, 0.02, 0.05), color, smoothstep(-0.2, 1.0, field));
  color += vec3(0.08, 0.12, 0.25) * influence;
  color += pulse * vec3(0.4, 0.6, 1.0);

  float vignette = smoothstep(1.2, 0.2, length(st));
  color *= vignette;

  gl_FragColor = vec4(color, 1.0);
}
`,z=document.getElementById("overlay"),r=new d,b=new x(-1,1,1,-1,0,1),t=new f({antialias:!0,alpha:!1,powerPreference:"high-performance"});t.setPixelRatio(Math.min(window.devicePixelRatio,2));t.setSize(window.innerWidth,window.innerHeight);document.body.appendChild(t.domElement);const o={uTime:{value:0},uMouse:{value:new i(.5,.5)},uResolution:{value:new i(window.innerWidth,window.innerHeight)},uPulse:{value:0}},C=new w({vertexShader:g,fragmentShader:M,uniforms:o}),P=new p(new h(2,2),C);r.add(P);const l=new i(.5,.5),a=new i(.5,.5);let c=0,s=!1;function v(e){const n=e.clientX/window.innerWidth,m=1-e.clientY/window.innerHeight;l.set(n,m),s||(s=!0,z.classList.add("hidden"))}window.addEventListener("pointermove",v);window.addEventListener("pointerdown",e=>{c=1,v(e)});window.addEventListener("resize",()=>{const{innerWidth:e,innerHeight:n}=window;t.setSize(e,n),o.uResolution.value.set(e,n)});const T=new y;function u(){const e=T.getElapsedTime();o.uTime.value=e,a.lerp(l,.08),o.uMouse.value.copy(a),c*=.92,o.uPulse.value=c,t.render(r,b),requestAnimationFrame(u)}u();
