import"./modulepreload-polyfill-B5Qt9EMX.js";import{S as We,P as Ue,W as Ee,G as fe,m as D,V as p,f,h as ve,n as Q,C as W,aw as $,A as c,g as C,D as Fe,ax as we,u as Me,L as ye,ay as Le,B as T,a as ee,b as te,c as oe,M as R,e as Ie,E as ge}from"./three.module-BlzTrhr8.js";const De=`
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
`,Re=`
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
`,Ve=`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,Ge=`
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
`,Be=`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,Xe=`
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
`,Ye=document.getElementById("overlay"),le=["read","write","shell","grep","search","edit","think","fetch","plan","review","build","listen"],z=72,v=48,xe=400,ae=new We,d=new Ue(42,window.innerWidth/window.innerHeight,.1,100);d.position.set(0,.35,7.2);d.lookAt(0,0,0);const g=new Ee({antialias:!0,powerPreference:"high-performance"});g.setPixelRatio(Math.min(window.devicePixelRatio,2));g.setSize(window.innerWidth,window.innerHeight);g.setClearColor(328968,1);document.body.appendChild(g.domElement);const u=new fe;ae.add(u);const ce=new Ie,Pe=new D(.5,.5),k=new D(.5,.5),ue=new p(0,0,1),de=new p(0,0,1),x=new p;let r=0,m=0,he=!1,_=!1,ne=!1,N=0,O=0;const M=new ge(.18,.35,0,"YXZ"),y=new ge(.18,.35,0,"YXZ");let Z=7.2,pe=0;const b={uTime:{value:0},uResolution:{value:new D(window.innerWidth,window.innerHeight)},uMouse:{value:new D(.5,.5)},uPulse:{value:0}},be=new f(new ve(2,2),new Q({vertexShader:Be,fragmentShader:Xe,uniforms:b,depthWrite:!1,depthTest:!1}));be.renderOrder=-10;ae.add(be);const P={uTime:{value:0},uPulse:{value:0},uAttention:{value:0},uLookDir:{value:new p(0,0,1)},uColorA:{value:new W(662066)},uColorB:{value:new W(4029112)},uColorCore:{value:new W(14216447)}},Ae=new f(new $(1.05,4),new Q({vertexShader:De,fragmentShader:Re,uniforms:P,transparent:!0,depthWrite:!1,blending:c}));u.add(Ae);const U=new f(new $(1.12,2),new C({color:8304383,wireframe:!0,transparent:!0,opacity:.12,depthWrite:!1,blending:c}));u.add(U);const H=new f(new $(.28,2),new C({color:16770744,transparent:!0,opacity:.85,depthWrite:!1,blending:c}));u.add(H);const E={uTime:{value:0},uPulse:{value:0},uIntensity:{value:1},uColor:{value:new W(9356543)}},j=new f(new ve(4.2,4.2),new Q({vertexShader:Ve,fragmentShader:Ge,uniforms:E,transparent:!0,depthWrite:!1,blending:c,side:Fe}));u.add(j);const q=new f(new we(1.55,32,32),new C({color:1723002,transparent:!0,opacity:.18,depthWrite:!1,blending:c}));u.add(q);function _e(e,o,a,n=128){const l=[];for(let s=0;s<=n;s+=1){const t=s/n*Math.PI*2,i=Math.cos(t)*e,h=Math.sin(t)*e*Math.sin(o),w=Math.sin(t)*e*Math.cos(o),re=new p(i,h,w);re.applyAxisAngle(new p(0,0,1),a),l.push(re)}return new T().setFromPoints(l)}const Ne=[{radius:2.15,tiltX:.35,tiltZ:.15,color:4886484,opacity:.35,speed:.12},{radius:3.05,tiltX:-.55,tiltZ:-.25,color:6990048,opacity:.22,speed:-.08},{radius:4.1,tiltX:.2,tiltZ:.55,color:3828378,opacity:.14,speed:.05}],Oe=Ne.map(e=>{const o=new Me(_e(e.radius,e.tiltX,e.tiltZ),new ye({color:e.color,transparent:!0,opacity:e.opacity,blending:c,depthWrite:!1}));return u.add(o),{mesh:o,speed:e.speed}}),V=new fe;u.add(V);const Ze=le.map((e,o)=>{const a=o/le.length*Math.PI*2,n=2.15,l=.35,s=new p(Math.cos(a)*n,Math.sin(a)*n*Math.sin(l),Math.sin(a)*n*Math.cos(l)),t=new f(new Le(.07,0),new C({color:12115199,transparent:!0,opacity:.9,depthWrite:!1,blending:c}));t.position.copy(s);const i=new f(new we(.16,12,12),new C({color:4029112,transparent:!0,opacity:.25,depthWrite:!1,blending:c}));t.add(i),V.add(t);const h=new T().setFromPoints([new p(0,0,0),s.clone()]),w=new Me(h,new ye({color:4886484,transparent:!0,opacity:.08,blending:c,depthWrite:!1}));return V.add(w),{node:t,aura:i,basePos:s.clone(),phase:Math.random()*Math.PI*2,label:e}}),F=new Float32Array(z*3),K=new Float32Array(z),Ce=new Float32Array(z);for(let e=0;e<z;e+=1){const o=Math.random()*Math.PI*2,a=2.7+Math.random()*1.6,n=(Math.random()-.5)*1.8;F[e*3]=Math.cos(o)*a,F[e*3+1]=n,F[e*3+2]=Math.sin(o)*a,K[e]=Math.random()*Math.PI*2,Ce[e]=a}const G=new T;G.setAttribute("position",new ee(F,3));const Se=new te(G,new oe({color:10406143,size:.045,transparent:!0,opacity:.7,blending:c,depthWrite:!1,sizeAttenuation:!0}));u.add(Se);const L=new Float32Array(xe*3);for(let e=0;e<xe;e+=1){const o=6+Math.random()*10,a=Math.random()*Math.PI*2,n=Math.acos(2*Math.random()-1);L[e*3]=o*Math.sin(n)*Math.cos(a),L[e*3+1]=o*Math.sin(n)*Math.sin(a),L[e*3+2]=o*Math.cos(n)}const Te=new T;Te.setAttribute("position",new ee(L,3));u.add(new te(Te,new oe({color:6982320,size:.03,transparent:!0,opacity:.55,blending:c,depthWrite:!1,sizeAttenuation:!0})));const I=new Float32Array(v*3),A=new Float32Array(v),se=new Float32Array(v),B=[],X=[],S=new Uint8Array(v);for(let e=0;e<v;e+=1)A[e]=Math.random(),se[e]=.35+Math.random()*.55,B.push(new p),X.push(new p),S[e]=0,I[e*3]=0,I[e*3+1]=0,I[e*3+2]=0;const Y=new T;Y.setAttribute("position",new ee(I,3));const He=new te(Y,new oe({color:16766112,size:.06,transparent:!0,opacity:.9,blending:c,depthWrite:!1,sizeAttenuation:!0}));u.add(He);function J(e=!0){let o=-1;for(let s=0;s<v;s+=1)if(!S[s]){o=s;break}o<0&&(o=Math.floor(Math.random()*v));const a=Math.random()*Math.PI*2,n=3.2+Math.random()*1.4,l=(Math.random()-.5)*1.5;e?(B[o].set(Math.cos(a)*n,l,Math.sin(a)*n),X[o].set((Math.random()-.5)*.3,(Math.random()-.5)*.3,(Math.random()-.5)*.3)):(B[o].set((Math.random()-.5)*.25,(Math.random()-.5)*.25,(Math.random()-.5)*.25),X[o].set(Math.cos(a)*n,l,Math.sin(a)*n)),A[o]=0,se[o]=.55+Math.random()*.7,S[o]=1}function ie(){he||(he=!0,Ye.classList.add("hidden"))}function ze(e){Pe.set(e.clientX/window.innerWidth,1-e.clientY/window.innerHeight),ie()}window.addEventListener("pointermove",e=>{if(_){const o=e.clientX-N,a=e.clientY-O;N=e.clientX,O=e.clientY,ne?M.x=R.clamp(M.x+a*.005,-.9,.9):(M.y+=o*.005,M.x=R.clamp(M.x+a*.005,-.9,.9)),ie()}else ze(e)});window.addEventListener("pointerdown",e=>{if(e.button===0){_=!0,ne=e.shiftKey,N=e.clientX,O=e.clientY,r=1,m=Math.min(1,m+.45);for(let o=0;o<6;o+=1)J(!0);for(let o=0;o<4;o+=1)J(!1);ze(e)}});window.addEventListener("pointerup",()=>{_=!1,ne=!1});window.addEventListener("wheel",e=>{e.preventDefault(),Z=R.clamp(Z+e.deltaY*.006,4.2,12),ie()},{passive:!1});window.addEventListener("resize",()=>{const{innerWidth:e,innerHeight:o}=window;d.aspect=e/o,d.updateProjectionMatrix(),g.setSize(e,o),b.uResolution.value.set(e,o)});let me=0;function ke(){const e=ce.getElapsedTime(),o=Math.min(ce.getDelta(),.05);k.lerp(Pe,.07),r*=Math.pow(.92,o*60),m=R.lerp(m,_?.85:.25+r*.5,.04),de.set((k.x-.5)*2.2,(k.y-.5)*1.6,1).normalize(),ue.lerp(de,.08),pe+=o*.1,y.x+=(M.x-y.x)*.08,y.y+=(M.y+pe-y.y)*.08,u.rotation.set(y.x,y.y,0,"YXZ");const a=d.position.z+(Z-d.position.z)*.08;d.position.z=a,d.position.y=.25+Math.sin(e*.4)*.05,d.lookAt(0,0,0);const n=1+Math.sin(e*1.4)*.025+r*.08;Ae.scale.setScalar(n),U.scale.setScalar(n*1.02),U.rotation.y=e*.15,U.rotation.x=e*.08,H.scale.setScalar(.9+Math.sin(e*2.2)*.12+r*.25),H.rotation.y=-e*.4,q.scale.setScalar(1+r*.35+m*.15),q.material.opacity=.14+r*.2+m*.08,j.lookAt(d.position),j.scale.setScalar(1+r*.2),Oe.forEach(t=>{t.mesh.rotation.y+=t.speed*o}),V.rotation.y+=.12*o,Ze.forEach((t,i)=>{const h=Math.sin(e*1.8+t.phase)*.04;t.node.position.y=t.basePos.y+h,t.node.rotation.x=e*.8+i,t.node.rotation.y=e*1.1+i*.5;const w=.2+.15*Math.sin(e*2+t.phase)+r*.4;t.aura.material.opacity=w,t.aura.scale.setScalar(1+r*.5+Math.sin(e*3+t.phase)*.15)});const l=G.attributes.position.array;for(let t=0;t<z;t+=1){const i=e*.15+K[t],h=Ce[t];l[t*3]=Math.cos(i)*h,l[t*3+1]=Math.sin(e*.5+K[t]*2)*.9,l[t*3+2]=Math.sin(i)*h}G.attributes.position.needsUpdate=!0,Se.rotation.y=e*.04,e-me>.35&&(J(Math.random()>.4),me=e);const s=Y.attributes.position.array;for(let t=0;t<v;t+=1){if(!S[t]){s[t*3+1]=-999;continue}if(A[t]+=o*se[t],A[t]>=1){S[t]=0,s[t*3+1]=-999;continue}const i=A[t],h=i*i*(3-2*i);x.copy(B[t]).lerp(X[t],h);const w=Math.sin(i*Math.PI)*.45;x.y+=w,s[t*3]=x.x,s[t*3+1]=x.y,s[t*3+2]=x.z}Y.attributes.position.needsUpdate=!0,b.uTime.value=e,b.uMouse.value.copy(k),b.uPulse.value=r,P.uTime.value=e,P.uPulse.value=r,P.uAttention.value=m,P.uLookDir.value.copy(ue),E.uTime.value=e,E.uPulse.value=r,E.uIntensity.value=.7+m*.5,g.render(ae,d),requestAnimationFrame(ke)}ke();
