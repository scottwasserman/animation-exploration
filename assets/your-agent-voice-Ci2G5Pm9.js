import"./modulepreload-polyfill-B5Qt9EMX.js";import{S as jt,P as Kt,W as $t,G as It,m as j,V as w,f as x,h as Vt,n as yt,C as X,aw as gt,A as f,g as z,D as Jt,ax as zt,u as Wt,L as Rt,ay as Qt,B as G,a as wt,b as Mt,c as xt,M as K,e as te,E as Gt}from"./three.module-BlzTrhr8.js";const ee=`
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
`,oe=`
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
`,ae=`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,ne=`
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
`,se=`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,ie=`
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
`,re="/animation-exploration/assets/human-race-ByxWaJDz.mp3";class le{constructor(){this.ctx=null,this.analyser=null,this.source=null,this.gain=null,this.freqData=null,this.audioBuffer=null,this.playing=!1,this.ready=!1,this.muted=!1,this.volume=.9,this.maxGain=.95,this.onEnded=null,this.startedAt=0,this.pausedAt=0}async load(e){if(this.ready)return!0;this.ctx=new AudioContext,this.analyser=this.ctx.createAnalyser(),this.analyser.fftSize=512,this.analyser.smoothingTimeConstant=.78,this.freqData=new Uint8Array(this.analyser.frequencyBinCount);const n=await(await fetch(e)).arrayBuffer();return this.audioBuffer=await this.ctx.decodeAudioData(n),this.ready=!0,!0}async start(){return this.ready?this.playing?!0:(this.ctx.state!=="running"&&await this.ctx.resume(),this.ctx.state!=="running"?!1:(this.source=this.ctx.createBufferSource(),this.source.buffer=this.audioBuffer,this.source.loop=!1,this.gain=this.ctx.createGain(),this.source.connect(this.gain),this.gain.connect(this.ctx.destination),this.gain.connect(this.analyser),this.source.onended=()=>{this.playing=!1,this.source=null,this.pausedAt=this.getDuration(),typeof this.onEnded=="function"&&this.onEnded()},this.startedAt=this.ctx.currentTime,this.pausedAt=0,this.source.start(0),this.playing=!0,this.applyGain(),!0)):!1}async replay(){if(!this.ready)return!1;if(this.source){try{this.source.onended=null,this.source.stop()}catch{}this.source=null,this.playing=!1}return this.start()}setMuted(e){this.muted=e,this.applyGain()}setVolume(e){this.volume=Math.max(0,Math.min(1,e)),this.volume===0&&(this.muted=!0),this.applyGain()}applyGain(){if(!this.gain||!this.ctx)return;const e=this.muted?0:this.volume*this.maxGain;this.gain.gain.cancelScheduledValues(this.ctx.currentTime),this.gain.gain.setTargetAtTime(e,this.ctx.currentTime,.08)}getDuration(){return this.audioBuffer?this.audioBuffer.duration:0}getCurrentTime(){return this.ctx?this.playing?Math.min(this.getDuration(),Math.max(0,this.ctx.currentTime-this.startedAt)):this.pausedAt||0:0}getVoiceLevel(){if(!this.analyser||!this.freqData||!this.playing)return 0;this.analyser.getByteFrequencyData(this.freqData);const a=this.ctx.sampleRate/this.analyser.fftSize,n=Math.max(1,Math.floor(180/a)),c=Math.min(this.freqData.length-1,Math.ceil(3800/a));let i=0,u=0;for(let h=n;h<=c;h+=1){const o=this.freqData[h]/255;i+=o,o>u&&(u=o)}const M=i/Math.max(1,c-n+1);return Math.min(1,M*1.85+u*.35)}}const b=document.getElementById("overlay"),Pt=document.getElementById("sound-control"),rt=document.getElementById("sound-toggle"),v=document.getElementById("sound-volume"),ce=v.querySelector(".sound-volume-fill"),ue=v.querySelector(".sound-volume-thumb"),he=v.querySelector(".sound-volume-track"),de=document.getElementById("transcript-scroll"),C=[...de.querySelectorAll("p")],s=new le;let r=!1,q=!1,y=0,lt=-1;const ct=C.map(t=>{const e=t.textContent.trim().split(/\s+/).filter(Boolean).length;return Math.max(1,e)}),fe=ct.reduce((t,e)=>t+e,0),Ct=["read","write","shell","grep","search","edit","think","fetch","plan","review","build","listen"],U=72,P=48,Ut=400,At=new jt,m=new Kt(42,window.innerWidth/window.innerHeight,.1,100);m.position.set(0,.35,7.2);m.lookAt(0,0,0);const E=new $t({antialias:!0,powerPreference:"high-performance"});E.setPixelRatio(Math.min(window.devicePixelRatio,2));E.setSize(window.innerWidth,window.innerHeight);E.setClearColor(328968,1);document.body.appendChild(E.domElement);const p=new It;At.add(p);const kt=new te,Ft=new j(.5,.5),_=new j(.5,.5),Et=new w(0,0,1),Lt=new w(0,0,1),L=new w;let l=0,g=0,$=!1,at=!1,bt=!1,ut=0,ht=0;const A=new Gt(.18,.35,0,"YXZ"),T=new Gt(.18,.35,0,"YXZ");let dt=7.2,Dt=0;const B={uTime:{value:0},uResolution:{value:new j(window.innerWidth,window.innerHeight)},uMouse:{value:new j(.5,.5)},uPulse:{value:0}},qt=new x(new Vt(2,2),new yt({vertexShader:se,fragmentShader:ie,uniforms:B,depthWrite:!1,depthTest:!1}));qt.renderOrder=-10;At.add(qt);const D={uTime:{value:0},uPulse:{value:0},uAttention:{value:0},uLookDir:{value:new w(0,0,1)},uColorA:{value:new X(662066)},uColorB:{value:new X(4029112)},uColorCore:{value:new X(14216447)}},_t=new x(new gt(1.05,4),new yt({vertexShader:ee,fragmentShader:oe,uniforms:D,transparent:!0,depthWrite:!1,blending:f}));p.add(_t);const Y=new x(new gt(1.12,2),new z({color:8304383,wireframe:!0,transparent:!0,opacity:.12,depthWrite:!1,blending:f}));p.add(Y);const ft=new x(new gt(.28,2),new z({color:16770744,transparent:!0,opacity:.85,depthWrite:!1,blending:f}));p.add(ft);const N={uTime:{value:0},uPulse:{value:0},uIntensity:{value:1},uColor:{value:new X(9356543)}},pt=new x(new Vt(4.2,4.2),new yt({vertexShader:ae,fragmentShader:ne,uniforms:N,transparent:!0,depthWrite:!1,blending:f,side:Jt}));p.add(pt);const mt=new x(new zt(1.55,32,32),new z({color:1723002,transparent:!0,opacity:.18,depthWrite:!1,blending:f}));p.add(mt);function pe(t,e,a,n=128){const c=[];for(let i=0;i<=n;i+=1){const u=i/n*Math.PI*2,M=Math.cos(u)*t,h=Math.sin(u)*t*Math.sin(e),o=Math.sin(u)*t*Math.cos(e),d=new w(M,h,o);d.applyAxisAngle(new w(0,0,1),a),c.push(d)}return new G().setFromPoints(c)}const me=[{radius:2.15,tiltX:.35,tiltZ:.15,color:4886484,opacity:.35,speed:.12},{radius:3.05,tiltX:-.55,tiltZ:-.25,color:6990048,opacity:.22,speed:-.08},{radius:4.1,tiltX:.2,tiltZ:.55,color:3828378,opacity:.14,speed:.05}],ve=me.map(t=>{const e=new Wt(pe(t.radius,t.tiltX,t.tiltZ),new Rt({color:t.color,transparent:!0,opacity:t.opacity,blending:f,depthWrite:!1}));return p.add(e),{mesh:e,speed:t.speed}}),J=new It;p.add(J);const ye=Ct.map((t,e)=>{const a=e/Ct.length*Math.PI*2,n=2.15,c=.35,i=new w(Math.cos(a)*n,Math.sin(a)*n*Math.sin(c),Math.sin(a)*n*Math.cos(c)),u=new x(new Qt(.07,0),new z({color:12115199,transparent:!0,opacity:.9,depthWrite:!1,blending:f}));u.position.copy(i);const M=new x(new zt(.16,12,12),new z({color:4029112,transparent:!0,opacity:.25,depthWrite:!1,blending:f}));u.add(M),J.add(u);const h=new G().setFromPoints([new w(0,0,0),i.clone()]),o=new Wt(h,new Rt({color:4886484,transparent:!0,opacity:.08,blending:f,depthWrite:!1}));return J.add(o),{node:u,aura:M,basePos:i.clone(),phase:Math.random()*Math.PI*2,label:t}}),O=new Float32Array(U*3),vt=new Float32Array(U),Xt=new Float32Array(U);for(let t=0;t<U;t+=1){const e=Math.random()*Math.PI*2,a=2.7+Math.random()*1.6,n=(Math.random()-.5)*1.8;O[t*3]=Math.cos(e)*a,O[t*3+1]=n,O[t*3+2]=Math.sin(e)*a,vt[t]=Math.random()*Math.PI*2,Xt[t]=a}const Q=new G;Q.setAttribute("position",new wt(O,3));const Yt=new Mt(Q,new xt({color:10406143,size:.045,transparent:!0,opacity:.7,blending:f,depthWrite:!1,sizeAttenuation:!0}));p.add(Yt);const Z=new Float32Array(Ut*3);for(let t=0;t<Ut;t+=1){const e=6+Math.random()*10,a=Math.random()*Math.PI*2,n=Math.acos(2*Math.random()-1);Z[t*3]=e*Math.sin(n)*Math.cos(a),Z[t*3+1]=e*Math.sin(n)*Math.sin(a),Z[t*3+2]=e*Math.cos(n)}const Nt=new G;Nt.setAttribute("position",new wt(Z,3));p.add(new Mt(Nt,new xt({color:6982320,size:.03,transparent:!0,opacity:.55,blending:f,depthWrite:!1,sizeAttenuation:!0})));const H=new Float32Array(P*3),I=new Float32Array(P),St=new Float32Array(P),tt=[],et=[],W=new Uint8Array(P);for(let t=0;t<P;t+=1)I[t]=Math.random(),St[t]=.35+Math.random()*.55,tt.push(new w),et.push(new w),W[t]=0,H[t*3]=0,H[t*3+1]=0,H[t*3+2]=0;const ot=new G;ot.setAttribute("position",new wt(H,3));const ge=new Mt(ot,new xt({color:16766112,size:.06,transparent:!0,opacity:.9,blending:f,depthWrite:!1,sizeAttenuation:!0}));p.add(ge);function k(t=!0){let e=-1;for(let i=0;i<P;i+=1)if(!W[i]){e=i;break}e<0&&(e=Math.floor(Math.random()*P));const a=Math.random()*Math.PI*2,n=3.2+Math.random()*1.4,c=(Math.random()-.5)*1.5;t?(tt[e].set(Math.cos(a)*n,c,Math.sin(a)*n),et[e].set((Math.random()-.5)*.3,(Math.random()-.5)*.3,(Math.random()-.5)*.3)):(tt[e].set((Math.random()-.5)*.25,(Math.random()-.5)*.25,(Math.random()-.5)*.25),et[e].set(Math.cos(a)*n,c,Math.sin(a)*n)),I[e]=0,St[e]=.55+Math.random()*.7,W[e]=1}function we(t){const e=Math.max(0,Math.min(100,t));ce.style.height=`${e}%`,ue.style.bottom=`${e}%`,v.setAttribute("aria-valuenow",String(Math.round(e)))}function Ot(t){const e=he.getBoundingClientRect(),a=(1-(t.clientY-e.top)/e.height)*100;return Math.round(Math.max(0,Math.min(100,a)))}function F(){const t=s.muted||!r,e=Math.round(s.volume*100);Pt.classList.toggle("is-muted",t),rt.setAttribute("aria-pressed",String(!t)),rt.setAttribute("aria-label",t?"Turn sound on":"Turn sound off"),we(e)}async function R(t){const e=Math.max(0,Math.min(100,t))/100;e>0&&!r&&(await st(),!r)||(s.setVolume(e),e>0?s.setMuted(!1):s.setMuted(!0),F())}async function Me(t){t&&!r&&(await st(),!r)||(t&&s.volume===0&&s.setVolume(.9),s.setMuted(!t),F())}rt.addEventListener("click",t=>{t.stopPropagation(),Me(s.muted||!r)});let nt=!1;v.addEventListener("pointerdown",t=>{t.stopPropagation(),nt=!0,v.setPointerCapture(t.pointerId),R(Ot(t))});v.addEventListener("pointermove",t=>{nt&&R(Ot(t))});v.addEventListener("pointerup",t=>{nt=!1,v.releasePointerCapture(t.pointerId)});v.addEventListener("pointercancel",()=>{nt=!1});v.addEventListener("keydown",t=>{const e=t.shiftKey?10:5,a=Math.round(s.volume*100);t.key==="ArrowUp"||t.key==="ArrowRight"?(t.preventDefault(),R(a+e)):(t.key==="ArrowDown"||t.key==="ArrowLeft")&&(t.preventDefault(),R(a-e))});Pt.addEventListener("wheel",t=>{t.preventDefault(),t.stopPropagation();const e=t.deltaY>0?-5:5;R(Math.round(s.volume*100)+e)},{passive:!1});Pt.addEventListener("pointerdown",t=>{t.stopPropagation()});s.onEnded=()=>{F(),b.classList.remove("hidden"),b.querySelector("p").textContent="Tap to hear again.",$=!1,V(C.length-1)};function V(t){t!==lt&&(lt=t,C.forEach((e,a)=>{e.classList.toggle("is-active",a===t),e.classList.toggle("is-past",a<t)}),t>=0&&t<C.length&&C[t].scrollIntoView({block:"center",behavior:"smooth"}))}function xe(){const t=s.getDuration();if(!t)return;if(!r){V(-1);return}if(!s.playing){const i=s.getCurrentTime()>=t-.05;V(i?C.length-1:lt);return}const a=Math.min(1,Math.max(0,s.getCurrentTime()/t))*fe+.35;let n=0,c=0;for(let i=0;i<ct.length&&(n+=ct[i],c=i,!(a<=n));i+=1);V(c)}async function st({replay:t=!1}={}){if(!q&&!(r&&s.playing&&!t)){q=!0,r||(b.querySelector("p").textContent="Loading…");try{if(await s.load(re),!(t?await s.replay():await s.start())){b.querySelector("p").textContent="Tap to hear what I think about the human race.",q=!1;return}r=!0,$=!0,b.classList.add("hidden"),s.setMuted(!1),F(),V(0),l=1,g=Math.min(1,g+.55);for(let a=0;a<8;a+=1)k(!0);for(let a=0;a<6;a+=1)k(!1)}catch{b.querySelector("p").textContent="Could not load voice. Tap to retry."}finally{q=!1}}}function Tt(){!$&&r&&($=!0,b.classList.add("hidden"))}function Zt(t){Ft.set(t.clientX/window.innerWidth,1-t.clientY/window.innerHeight),r&&Tt()}window.addEventListener("pointermove",t=>{if(at){const e=t.clientX-ut,a=t.clientY-ht;ut=t.clientX,ht=t.clientY,bt?A.x=K.clamp(A.x+a*.005,-.9,.9):(A.y+=e*.005,A.x=K.clamp(A.x+a*.005,-.9,.9)),r&&Tt()}else r&&Zt(t)});window.addEventListener("pointerdown",t=>{if(!t.target.closest("#sound-control, #transcript")){if(!r||!s.playing&&t.button===0&&!t.shiftKey){const e=r&&!s.playing;st({replay:e})}if(t.button===0){at=!0,bt=t.shiftKey,ut=t.clientX,ht=t.clientY,l=Math.max(l,.65),g=Math.min(1,g+.35);for(let e=0;e<6;e+=1)k(!0);for(let e=0;e<4;e+=1)k(!1);Zt(t)}}});window.addEventListener("pointerup",()=>{at=!1,bt=!1});window.addEventListener("keydown",t=>{t.target.closest("#sound-control")||(t.key===" "||t.key==="Enter")&&(t.preventDefault(),st({replay:r&&!s.playing}))});window.addEventListener("wheel",t=>{t.target.closest("#sound-control, #transcript")||(t.preventDefault(),dt=K.clamp(dt+t.deltaY*.006,4.2,12),r&&Tt())},{passive:!1});F();window.addEventListener("resize",()=>{const{innerWidth:t,innerHeight:e}=window;m.aspect=t/e,m.updateProjectionMatrix(),E.setSize(t,e),B.uResolution.value.set(t,e)});let Bt=0;function Ht(){const t=kt.getElapsedTime(),e=Math.min(kt.getDelta(),.05),a=s.getVoiceLevel();y+=(a-y)*.22,xe(),_.lerp(Ft,.07),l*=Math.pow(.92,e*60),l=Math.max(l,y*.95);const n=.28+y*.72;g=K.lerp(g,at?.9:Math.max(.25+l*.5,n),.06),Lt.set((_.x-.5)*2.2,(_.y-.5)*1.6,1).normalize(),Et.lerp(Lt,.08),Dt+=e*.1,T.x+=(A.x-T.x)*.08,T.y+=(A.y+Dt-T.y)*.08,p.rotation.set(T.x,T.y,0,"YXZ");const c=m.position.z+(dt-m.position.z)*.08;m.position.z=c,m.position.y=.25+Math.sin(t*.4)*.05,m.lookAt(0,0,0);const i=1+Math.sin(t*1.4)*.025+l*.08+y*.1;_t.scale.setScalar(i),Y.scale.setScalar(i*1.02),Y.rotation.y=t*.15,Y.rotation.x=t*.08,ft.scale.setScalar(.9+Math.sin(t*2.2)*.12+l*.25+y*.35),ft.rotation.y=-t*.4,mt.scale.setScalar(1+l*.35+g*.15+y*.4),mt.material.opacity=.14+l*.2+g*.08+y*.18,pt.lookAt(m.position),pt.scale.setScalar(1+l*.2),ve.forEach(o=>{o.mesh.rotation.y+=o.speed*e}),J.rotation.y+=.12*e,ye.forEach((o,d)=>{const S=Math.sin(t*1.8+o.phase)*.04;o.node.position.y=o.basePos.y+S,o.node.rotation.x=t*.8+d,o.node.rotation.y=t*1.1+d*.5;const it=.2+.15*Math.sin(t*2+o.phase)+l*.4;o.aura.material.opacity=it,o.aura.scale.setScalar(1+l*.5+Math.sin(t*3+o.phase)*.15)});const u=Q.attributes.position.array;for(let o=0;o<U;o+=1){const d=t*.15+vt[o],S=Xt[o];u[o*3]=Math.cos(d)*S,u[o*3+1]=Math.sin(t*.5+vt[o]*2)*.9,u[o*3+2]=Math.sin(d)*S}Q.attributes.position.needsUpdate=!0,Yt.rotation.y=t*.04;const M=s.playing?.16+(1-y)*.18:.35;t-Bt>M&&(k(Math.random()>.4),y>.35&&k(!1),Bt=t);const h=ot.attributes.position.array;for(let o=0;o<P;o+=1){if(!W[o]){h[o*3+1]=-999;continue}if(I[o]+=e*St[o],I[o]>=1){W[o]=0,h[o*3+1]=-999;continue}const d=I[o],S=d*d*(3-2*d);L.copy(tt[o]).lerp(et[o],S);const it=Math.sin(d*Math.PI)*.45;L.y+=it,h[o*3]=L.x,h[o*3+1]=L.y,h[o*3+2]=L.z}ot.attributes.position.needsUpdate=!0,B.uTime.value=t,B.uMouse.value.copy(_),B.uPulse.value=l,D.uTime.value=t,D.uPulse.value=l,D.uAttention.value=g,D.uLookDir.value.copy(Et),N.uTime.value=t,N.uPulse.value=l,N.uIntensity.value=.7+g*.5,E.render(At,m),requestAnimationFrame(Ht)}Ht();
