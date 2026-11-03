// Hero 3D scene: an iridescent morphing orb, an orbiting particle ring and a starfield.
import * as THREE from "three";

const canvas = document.getElementById("sky");
const hero = canvas.closest(".hero");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
} catch (e) {
  canvas.remove();
}

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const NOISE = /* glsl */ `
    vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
    vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
    vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
      vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
      float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
      vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
      return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }`;

  // Orb
  const orbMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uTime: { value: 0 }, uHover: { value: 0 } },
    vertexShader: NOISE + /* glsl */ `
      uniform float uTime; uniform float uHover;
      varying vec3 vN; varying vec3 vView; varying float vD;
      void main(){
        float d = snoise(normal*1.4 + uTime*.18)*.32 + snoise(normal*3.2 - uTime*.25)*.08*(1.+uHover);
        vD = d;
        vec3 p = position + normal*d;
        vec4 mv = modelViewMatrix*vec4(p,1.);
        vN = normalize(normalMatrix*normal); vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec3 vN; varying vec3 vView; varying float vD;
      vec3 pal(float t){ return .5+.5*cos(6.2831*(vec3(.95,1.,1.)*t+vec3(.58,.36,.15))); }
      void main(){
        float f = pow(1.-max(dot(vN,vView),0.), 2.4);
        vec3 iri = pal(f*.9 + vD*.8 + uTime*.04);
        vec3 core = mix(vec3(.02,.03,.09), vec3(.10,.08,.28), .5+vD);
        vec3 col = core + iri*f*1.35;
        gl_FragColor = vec4(col, .35 + f*.65);
      }`,
  });
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.75, 64), orbMat);
  scene.add(orb);

  // Halo sprite
  const haloTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d"); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, "rgba(140,130,255,.55)"); gr.addColorStop(.45, "rgba(90,110,255,.18)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
  })();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(9); halo.position.z = -1; scene.add(halo);

  // Particle ring
  const RING = 1800, rp = new Float32Array(RING * 3), rc = new Float32Array(RING * 3);
  const c1 = new THREE.Color("#9db4ff"), c2 = new THREE.Color("#7ff3d4"), c3 = new THREE.Color("#c3a6ff"), tmp = new THREE.Color();
  for (let i = 0; i < RING; i++) {
    const a = Math.random() * Math.PI * 2, r = 2.7 + Math.pow(Math.random(), 2) * 1.6;
    rp[i * 3] = Math.cos(a) * r; rp[i * 3 + 1] = (Math.random() - .5) * .18; rp[i * 3 + 2] = Math.sin(a) * r;
    tmp.copy(c1).lerp(Math.random() > .5 ? c2 : c3, Math.random()); rc.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute("position", new THREE.BufferAttribute(rp, 3)); ringGeo.setAttribute("color", new THREE.BufferAttribute(rc, 3));
  const ring = new THREE.Points(ringGeo, new THREE.PointsMaterial({ size: .03, vertexColors: true, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.x = 1.15; ring.rotation.z = .25; scene.add(ring);

  // Stars
  const STARS = 1400, sp = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) { sp[i * 3] = (Math.random() - .5) * 40; sp[i * 3 + 1] = (Math.random() - .5) * 26; sp[i * 3 + 2] = -Math.random() * 30 - 2; }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: .05, color: 0xdfe6ff, transparent: true, opacity: .8, depthWrite: false }));
  scene.add(stars);

  // Interaction
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", (e) => { mouse.tx = e.clientX / innerWidth - .5; mouse.ty = e.clientY / innerHeight - .5; }, { passive: true });
  let hover = 0, hoverT = 0;
  hero.addEventListener("pointerenter", () => (hoverT = 1)); hero.addEventListener("pointerleave", () => (hoverT = 0));

  function layout() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const small = w < 700;
    orb.scale.setScalar(small ? .78 : 1); ring.scale.setScalar(small ? .8 : 1);
    camera.position.z = small ? 10.5 : 9;
  }
  new ResizeObserver(layout).observe(hero); layout();

  let visible = true;
  new IntersectionObserver((e) => (visible = e[0].isIntersecting)).observe(hero);
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = reduce ? 0 : clock.getElapsedTime();
    mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;
    hover += (hoverT - hover) * .05;
    orbMat.uniforms.uTime.value = t; orbMat.uniforms.uHover.value = hover;
    const sc = Math.min(scrollY / innerHeight, 1);
    orb.rotation.y = t * .08 + mouse.x * .6; orb.rotation.x = mouse.y * .4;
    ring.rotation.y = t * .06; ring.position.y = -sc * 1.5;
    orb.position.y = -sc * 1.2; halo.position.y = orb.position.y;
    stars.rotation.y = mouse.x * .05; stars.rotation.x = mouse.y * .03;
    camera.position.x = mouse.x * .8; camera.position.y = -mouse.y * .5; camera.lookAt(0, 0, 0);
    canvas.style.opacity = String(1 - sc * .8);
    renderer.render(scene, camera);
  });
}
