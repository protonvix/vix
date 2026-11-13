// Vix Assist hero: a glass core with a glowing heart, orbit rings and a living network of automation nodes.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const canvas = document.getElementById("hero3d");
const hero = canvas && canvas.closest(".hero");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try { renderer = canvas && new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); }
catch (e) { canvas && canvas.remove(); }

if (renderer) {
  const small = () => innerWidth < 900;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small() ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 11);

  const rig = new THREE.Group();
  scene.add(rig);

  // ---- glass core with a glowing heart ----
  const VIOLET = new THREE.Color("#7b5cff"), BLUE = new THREE.Color("#4f7cff"), MINT = new THREE.Color("#22d3a6"), PINK = new THREE.Color("#c06bff");
  const glass = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.55, 6),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.06, transmission: 1, thickness: 1.6, ior: 1.42, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [180, 650], clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.4, transparent: true })
  );
  rig.add(glass);

  const heart = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.52, 0.16, 220, 28, 2, 3),
    new THREE.MeshStandardMaterial({ color: VIOLET, emissive: VIOLET, emissiveIntensity: 2.4, metalness: 0.3, roughness: 0.25 })
  );
  rig.add(heart);

  const heartLight = new THREE.PointLight(VIOLET, 18, 9, 2);
  rig.add(heartLight);

  // ---- orbit rings ----
  const rings = [];
  [[2.25, BLUE, 0.9, 0.2], [2.85, VIOLET, 1.25, -0.5], [3.5, MINT, 0.55, 0.9]].forEach(([r, c, tx, tz], i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 12, 220), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85 }));
    m.rotation.set(tx, 0, tz);
    m.userData.speed = 0.08 + i * 0.05;
    rig.add(m); rings.push(m);
    // a bright satellite riding each ring
    const sat = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(2.2) }));
    sat.position.set(r, 0, 0);
    m.add(sat);
  });

  // ---- automation network: nodes + links + travelling pulses ----
  const N = small() ? 26 : 44;
  const nodes = [];
  const nodeGeo = new THREE.SphereGeometry(0.055, 12, 12);
  const palette = [BLUE, VIOLET, MINT, PINK];
  const net = new THREE.Group(); rig.add(net);
  for (let i = 0; i < N; i++) {
    const r = 2.4 + Math.random() * 1.9;
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    const p = new THREE.Vector3(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.75, r * Math.cos(ph));
    const c = palette[i % palette.length];
    const s = new THREE.Mesh(nodeGeo, new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(1.8) }));
    s.position.copy(p); net.add(s); nodes.push(p);
  }
  const links = [];
  for (let i = 0; i < N; i++) {
    const d = nodes.map((p, j) => [p.distanceTo(nodes[i]), j]).filter((x) => x[1] !== i).sort((a, b) => a[0] - b[0]).slice(0, 2);
    d.forEach(([, j]) => { if (i < j) links.push([i, j]); });
  }
  const lp = new Float32Array(links.length * 6);
  links.forEach(([a, b], k) => { nodes[a].toArray(lp, k * 6); nodes[b].toArray(lp, k * 6 + 3); });
  const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(lp, 3));
  net.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x8f7dff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending })));

  const pulses = [];
  const pulseGeo = new THREE.SphereGeometry(0.045, 10, 10);
  for (let k = 0; k < Math.min(links.length, small() ? 10 : 18); k++) {
    const m = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({ color: MINT.clone().multiplyScalar(2.5) }));
    m.userData = { link: links[(k * 7) % links.length], t: Math.random(), v: 0.25 + Math.random() * 0.35 };
    net.add(m); pulses.push(m);
  }

  // ---- starfield ----
  const S = small() ? 400 : 900, sp = new Float32Array(S * 3);
  for (let i = 0; i < S; i++) { sp[i * 3] = (Math.random() - 0.5) * 40; sp[i * 3 + 1] = (Math.random() - 0.5) * 24; sp[i * 3 + 2] = -6 - Math.random() * 18; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xbfb8ff, size: 0.035, transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(stars);

  // ---- lights for the glass ----
  const k1 = new THREE.DirectionalLight(0x9db4ff, 2.2); k1.position.set(5, 4, 6); scene.add(k1);
  const k2 = new THREE.DirectionalLight(0xc06bff, 1.6); k2.position.set(-6, -2, 3); scene.add(k2);
  scene.add(new THREE.AmbientLight(0x404060, 0.6));

  // ---- post processing (bloom on capable screens) ----
  let composer = null, bloom = null;
  if (!small()) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.6, 0.2);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // ---- layout: core sits to the right on desktop, above the copy on mobile ----
  function layout() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (composer) { composer.setSize(w, h); bloom.setSize(w, h); }
    if (w >= 1080) { rig.position.set(3.4, 0.2, 0); rig.scale.setScalar(1); }
    else if (w >= 640) { rig.position.set(2.4, 2.2, -1); rig.scale.setScalar(0.8); }
    else { rig.position.set(2.1, 4.2, -4); rig.scale.setScalar(0.5); }
  }
  layout();
  addEventListener("resize", layout);

  // ---- interaction ----
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", (e) => { mouse.tx = (e.clientX / innerWidth - 0.5) * 2; mouse.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  let scrollP = 0;
  addEventListener("scroll", () => { scrollP = Math.min(1, scrollY / (hero.clientHeight || 1)); }, { passive: true });

  let visible = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);

  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    const sp = reduce ? 0.15 : 1;
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;

    glass.rotation.y += dt * 0.12 * sp; glass.rotation.x = Math.sin(t * 0.3) * 0.15;
    heart.rotation.x += dt * 0.5 * sp; heart.rotation.y += dt * 0.7 * sp;
    heart.material.emissiveIntensity = 2.1 + Math.sin(t * 2) * 0.5;
    heartLight.intensity = 16 + Math.sin(t * 2) * 4;
    rings.forEach((r) => { r.rotation.z += dt * r.userData.speed * sp; });
    net.rotation.y += dt * 0.05 * sp;
    pulses.forEach((p) => {
      const u = p.userData; u.t += dt * u.v * sp; if (u.t > 1) u.t -= 1;
      tmp.copy(nodes[u.link[0]]).lerp(nodes[u.link[1]], u.t); p.position.copy(tmp);
    });
    stars.rotation.z += dt * 0.004;

    // scroll: the core lifts away and turns as you leave the hero
    rig.rotation.y = mouse.x * 0.35 + scrollP * 1.2;
    rig.rotation.x = mouse.y * 0.2 + scrollP * 0.4;
    camera.position.x = mouse.x * 0.6; camera.position.y = -mouse.y * 0.4;
    camera.position.z = 11 + scrollP * 3;
    camera.lookAt(0, 0, 0);

    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  frame();
  hero.classList.add("has3d");
}
