import"./modulepreload-polyfill-B5Qt9EMX.js";import{n as K,A as re,N as le,V as p,o as V,p as Z,B as ce,a as z,b as de,j as $,F as ue,q as fe,G as I,f as me,M as S,S as pe,C as he,P as ve,W as ge,i as ye,r as we,s as xe,k as Se,l as R,E as J,e as Me}from"./three.module-CjarTFaD.js";import{G as Le}from"./GLTFLoader-DpEaI5-1.js";const Q=`
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
`,be=`
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
`,ze=Q,Pe=`
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
`;function Ce(){return new K({uniforms:{uTime:{value:0},uIntensity:{value:.5}},vertexShader:Q,fragmentShader:be,transparent:!0,depthWrite:!1,blending:re})}function Ee(){return new K({uniforms:{uTime:{value:0},uIntensity:{value:.5}},vertexShader:ze,fragmentShader:Pe,transparent:!0,depthWrite:!1,blending:le})}const ke=640,Ae=760,Fe=32,Te=.09,N=new p,P=new p,De=new p,F=new p;function Ie(e,t){return De.set(Math.sin(e.y*11+t*5.2)*.55+Math.cos(e.z*8-t*3.1)*.35,Math.sin(e.x*9+t*4.4)*.18,Math.cos(e.x*10-t*4.8)*.5+Math.sin(e.z*12+t*3.6)*.3)}function Be(e){const t=new Z,a=new p,o=[];e.updateMatrixWorld(!0),t.setFromObject(e),t.getSize(a),t.getCenter(N);const n=t.max.y-a.y*.28;e.traverse(r=>{if(!r.isMesh||r.userData.innerShell)return;const d=r.geometry.attributes.position;for(let c=0;c<d.count;c+=1)P.fromBufferAttribute(d,c),P.applyMatrix4(r.matrixWorld),P.y>=n&&o.push(P.clone())});const s=new Map;for(const r of o){const d=`${Math.round(r.x*10)/10}_${Math.round(r.z*10)/10}`;s.has(d)||s.set(d,[]),s.get(d).push(r)}const i=[...s.values()].filter(r=>r.length>=Fe).map(r=>{const d=new p;for(const f of r)d.add(f);d.divideScalar(r.length);const c=d.clone().sub(N);return c.lengthSq()<1e-4&&c.set(0,1,0),c.normalize(),c.y=Math.max(c.y,.35),c.normalize(),{position:d,direction:c,weight:Math.sqrt(r.length),radius:.015+Math.min(.04,r.length/2e3)}}).sort((r,d)=>d.position.y-r.position.y||d.weight-r.weight),l=[];for(const r of i)l.some(c=>c.position.distanceTo(r.position)<Te)||l.push(r);return l.length===0&&l.push({position:new p(-.06,t.max.y-.06,-.05),direction:new p(0,1,.15).normalize(),weight:1,radius:.02}),l}function U(e,t,a){const o=Array.from({length:e},(i,l)=>({pos:new p,vel:new p,life:1,maxLife:1,seed:Math.random()*100,baseSize:a})),n=new ce;n.setAttribute("position",new z(new Float32Array(e*3),3)),n.setAttribute("aSize",new z(new Float32Array(e),1)),n.setAttribute("aLife",new z(new Float32Array(e),1)),n.setAttribute("aSeed",new z(new Float32Array(e),1));for(let i=0;i<e;i+=1)n.attributes.aSeed.array[i]=o[i].seed,n.attributes.aLife.array[i]=0;const s=new de(n,t);return s.frustumCulled=!1,{points:s,particles:o,material:t,geometry:n}}function _e(e,t){const a=U(ke,Ce(),.16),o=U(Ae,Ee(),.34);a.points.renderOrder=22,o.points.renderOrder=21;const n=new V(16740384,0,4.5,2);n.castShadow=!1,e.add(o.points),e.add(a.points),e.add(n);const s=new V(16728080,0,2.8,2);return e.add(s),{openings:t.map(i=>({position:i.position.clone(),direction:i.direction.clone(),weight:i.weight,radius:i.radius})),flameLayer:a,smokeLayer:o,fireLight:n,glowLight:s,lastContraction:0,elapsed:0}}function Ge(e){const t=e.reduce((o,n)=>o+n.weight,0);let a=Math.random()*t;for(let o=0;o<e.length;o+=1)if(a-=e[o].weight,a<=0)return o;return e.length-1}function We(e,t,a){e.life=0,e.maxLife=.18+Math.random()*.34,e.pos.copy(t.position),e.pos.x+=(Math.random()-.5)*t.radius*2,e.pos.y+=(Math.random()-.5)*t.radius,e.pos.z+=(Math.random()-.5)*t.radius*2;const o=.14+Math.random()*.18;e.vel.copy(t.direction).multiplyScalar(.75+a*1.25),e.vel.x+=(Math.random()-.5)*o,e.vel.y+=.12+Math.random()*.22,e.vel.z+=(Math.random()-.5)*o}function Oe(e,t,a){e.life=0,e.maxLife=.85+Math.random()*1.25,e.pos.copy(t.position),e.pos.addScaledVector(t.direction,.02),e.pos.x+=(Math.random()-.5)*t.radius*3,e.pos.y+=Math.random()*t.radius*.6,e.pos.z+=(Math.random()-.5)*t.radius*3,e.vel.copy(t.direction).multiplyScalar(.38+a*.72),e.vel.x+=(Math.random()-.5)*.22,e.vel.y+=.1+Math.random()*.16,e.vel.z+=(Math.random()-.5)*.22}function C(e,t,a,o){const n=t==="flame"?e.flameLayer:e.smokeLayer;let s=0;for(const i of n.particles){if(s>=a)break;if(i.life<i.maxLife)continue;const l=e.openings[Ge(e.openings)];t==="flame"?We(i,l,o):Oe(i,l,o),s+=1}}function Y(e,t,a,o,n){const s=e.geometry.attributes.position.array,i=e.geometry.attributes.aSize.array,l=e.geometry.attributes.aLife.array,r=n==="flame"?2.6:.82,d=n==="flame"?3.1:.95;F.set(0,0,0);let c=0;for(let f=0;f<e.particles.length;f+=1){const u=e.particles[f],w=f*3;if(u.life>=u.maxLife){s[w+1]=-999,i[f]=0,l[f]=0;continue}u.life+=t;const M=1-u.life/u.maxLife,se=Ie(u.pos,a+u.seed);u.vel.addScaledVector(se,t*(n==="flame"?1.55:1.05)),u.vel.y+=r*t,u.vel.multiplyScalar(Math.exp(-d*t)),u.pos.addScaledVector(u.vel,t),s[w]=u.pos.x,s[w+1]=u.pos.y,s[w+2]=u.pos.z,l[f]=M,i[f]=u.baseSize*(.55+M*.85)*(n==="flame"?.9+o*.35:1.25+M*.45),n==="flame"&&(F.add(u.pos),c+=1)}return e.geometry.attributes.position.needsUpdate=!0,e.geometry.attributes.aSize.needsUpdate=!0,e.geometry.attributes.aLife.needsUpdate=!0,{activeFlames:c,lightTarget:F}}function Re(e,t,a){if(!e||e.openings.length===0)return;e.elapsed+=t;const{contraction:o,dub:n}=a,s=o>e.lastContraction&&o>.2;e.lastContraction=o;const i=.55+o*1.1+n*.35,l=e.openings.length,r=(l*3+o*l*16+n*l*6)*t,d=(l*3.2+o*l*16+n*l*7)*t;C(e,"flame",Math.ceil(r),i),C(e,"smoke",Math.ceil(d*1.6),i),s&&(C(e,"flame",Math.ceil(l*(2+o*6)),i+.5),C(e,"smoke",Math.ceil(l*(2.5+o*6)),i+.3)),e.flameLayer.material.uniforms.uTime.value=e.elapsed,e.flameLayer.material.uniforms.uIntensity.value=i,e.smokeLayer.material.uniforms.uTime.value=e.elapsed,e.smokeLayer.material.uniforms.uIntensity.value=i;const c=Y(e.flameLayer,t,e.elapsed,o,"flame");if(Y(e.smokeLayer,t,e.elapsed,o,"smoke"),c.activeFlames>0){c.lightTarget.divideScalar(c.activeFlames),e.fireLight.position.copy(c.lightTarget),e.fireLight.position.y+=.08,e.glowLight.position.copy(e.fireLight.position),e.glowLight.position.y-=.04;const f=.35+o*1.8+n*.45;e.fireLight.intensity=f*1.35,e.glowLight.intensity=f*.75,e.fireLight.color.setHSL(.06+o*.015,1,.48+o*.08),e.glowLight.color.setHSL(.03,1,.42)}else e.fireLight.intensity=0,e.glowLight.intensity=0}const He=new $({color:526344,metalness:.12,roughness:.58,side:ue}),Ve=new $({color:394758,metalness:.08,roughness:.7,side:fe}),x=new Z,h=new p,ee=new p;new p;function B(e){x.makeEmpty(),e.updateMatrixWorld(!0),e.traverse(t=>{if(!t.isMesh||!t.geometry||t.userData.innerShell)return;t.geometry.computeBoundingBox();const a=t.geometry.boundingBox.clone();a.applyMatrix4(t.matrixWorld),x.union(a)}),x.isEmpty()&&x.setFromObject(e),x.getSize(h),x.getCenter(ee)}function Ne(){return h.y>=h.x&&h.y>=h.z?"y":h.x>=h.z?"x":"z"}function Ue(e){e.position.set(0,0,0),e.rotation.set(0,0,0),e.scale.set(1,1,1),e.updateMatrixWorld(!0),B(e);const t=Math.max(h.x,h.y,h.z,.001);e.scale.setScalar(2.6/t),e.updateMatrixWorld(!0),B(e),e.position.sub(ee)}function Ye(e){e.traverse(t=>{if(!t.isMesh||t.userData.innerShell)return;const a=new me(t.geometry,Ve);a.userData.innerShell=!0,a.scale.setScalar(.993),a.renderOrder=-1,t.add(a)})}function X(e,t,a){return Math.exp(-((e-t)**2)/a)}function Xe(e){const t=X(e,.055,.0011),a=X(e,.33,.0016)*.28,o=e>.18?(1-Math.exp(-(((e-.18)/.42)**1.35)))*.12:0,n=S.clamp(t+a*.35,0,1);return{phase:e,contraction:n,expansion:o,dub:a}}function qe(e){const a=e*72/60%1;return Xe(a)}function je(e,t,a,o){const n={x:o,y:o,z:o};n[t]=a,e.set(n.x,n.y,n.z)}async function Ke(e){const t=new Le,o=(await new Promise((i,l)=>{t.load(e,i,void 0,l)})).scene;o.traverse(i=>{i.isMesh&&(i.material=He,i.castShadow=!0,i.receiveShadow=!0)}),Ue(o),Ye(o),B(o);const n=new I;n.add(o);const s=new I;return s.add(n),s.userData.beatGroup=n,s.userData.longAxis=Ne(),s.userData.restSize=h.clone(),s.userData.fire=_e(n,Be(o)),s}function Ze(e,t,a=1/60){const o=e.userData.beatGroup;if(!o)return;const n=qe(t),{contraction:s,expansion:i,dub:l}=n,r=e.userData.longAxis??"y",d=1-s*.085+i*.05,c=1+s*.055-i*.025;je(o.scale,r,d,c);const f=s*.11-l*.035+i*.015,u=-s*.06+l*.018;r==="y"?o.rotation.set(u,0,f):r==="x"?o.rotation.set(0,f,u):o.rotation.set(u,f,0);const w=s*.045-i*.02,M=s*.022-l*.01;o.position.set(0,w,M),o.updateMatrixWorld(!0),Re(e.userData.fire,a,n)}const T=document.getElementById("overlay"),y=new pe;y.background=new he(9079434);const v=new ve(42,window.innerWidth/window.innerHeight,.1,100);v.position.set(0,.15,3.4);const m=new ge({antialias:!0,powerPreference:"high-performance"});m.setPixelRatio(Math.min(window.devicePixelRatio,2));m.setSize(window.innerWidth,window.innerHeight);m.outputColorSpace=ye;m.toneMapping=we;m.toneMappingExposure=1.08;m.shadowMap.enabled=!0;m.shadowMap.type=xe;document.body.appendChild(m.domElement);y.add(new Se(16777215,.32));const H=new R(16775408,.88);H.position.set(2.5,4,3.5);H.castShadow=!0;y.add(H);const te=new R(14542079,.55);te.position.set(-3,1.5,-2);y.add(te);const oe=new R(16777215,.28);oe.position.set(-1.5,-.5,3);y.add(oe);const E=new I;y.add(E);let k=null,q=!1,b=!1,A=!1,_=0,G=0;const g=new J(-.08,.35,0,"YXZ"),L=new J(-.08,.35,0,"YXZ"),W=new p(0,0,0),D=new p(0,0,0);let O=3.4;const $e=.06;function ae(){q||(q=!0,T==null||T.classList.add("hidden"))}function Je(e){e.button===0&&(b=!0,A=e.shiftKey,_=e.clientX,G=e.clientY,m.domElement.setPointerCapture(e.pointerId),ae())}function Qe(e){if(!b)return;const t=e.clientX-_,a=e.clientY-G;if(_=e.clientX,G=e.clientY,e.shiftKey||A){W.x+=t*.004,W.y-=a*.004;return}g.y+=t*.006,g.x+=a*.006,g.x=S.clamp(g.x,-.75,.75)}function ne(e){b=!1,m.domElement.releasePointerCapture(e.pointerId)}m.domElement.addEventListener("pointerdown",Je);m.domElement.addEventListener("pointermove",Qe);m.domElement.addEventListener("pointerup",ne);m.domElement.addEventListener("pointercancel",ne);window.addEventListener("wheel",e=>{e.preventDefault(),O=S.clamp(O+e.deltaY*.0025,2,6),ae()},{passive:!1});window.addEventListener("keydown",e=>{e.key==="Shift"&&(A=b)});window.addEventListener("keyup",e=>{e.key==="Shift"&&(A=!1)});window.addEventListener("resize",()=>{v.aspect=window.innerWidth/window.innerHeight,v.updateProjectionMatrix(),m.setSize(window.innerWidth,window.innerHeight)});const j=new Me;function ie(){requestAnimationFrame(ie);const e=j.getDelta(),t=j.getElapsedTime();b||(g.y+=$e*e),L.x=S.lerp(L.x,g.x,.12),L.y=S.lerp(L.y,g.y,.12),D.lerp(W,.12),v.position.z=S.lerp(v.position.z,O,.12),v.lookAt(D),E.rotation.copy(L),E.position.copy(D),k&&Ze(k,t,e),m.render(y,v)}Ke(new URL("/animation-exploration/assets/heart-Bg6qjlP5.glb",import.meta.url).href).then(e=>{k=e,E.add(k),ie()}).catch(e=>{console.error(e)});
