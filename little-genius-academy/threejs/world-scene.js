// Homepage 3D scene: floating alphabet blocks, a friendly mascot, stars and clouds.
// Loaded only on the homepage, and only when WebGL works.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const COLORS = [0xff7a5c, 0x5bb8f5, 0xffcf4a, 0x5fd6a4, 0x8b6fe0, 0xff8fb8];

function letterTexture(letter, bgHex) {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  g.fillStyle = "#" + bgHex.toString(16).padStart(6, "0");
  g.fillRect(0, 0, size, size);
  g.fillStyle = "#ffffff";
  g.font = "bold 88px 'Fredoka', 'Trebuchet MS', sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(letter, size / 2, size / 2 + 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBlock(label, color) {
  const mat = new THREE.MeshStandardMaterial({ map: letterTexture(label, color), roughness: 0.45 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  mesh.userData.kind = "block";
  return mesh;
}

function makeCloud() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  [[0, 0, 0, 0.7], [0.7, -0.1, 0, 0.5], [-0.7, -0.1, 0, 0.5], [0.3, 0.3, 0, 0.45]].forEach(([x, y, z, r]) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat);
    s.position.set(x, y, z);
    group.add(s);
  });
  return group;
}

function makeMascot() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 24),
    new THREE.MeshStandardMaterial({ color: 0xffcf4a, roughness: 0.5 })
  );
  group.add(body);
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const dark = new THREE.MeshStandardMaterial({ color: 0x26264a });
  const cheek = new THREE.MeshStandardMaterial({ color: 0xff9aa2 });
  [-0.36, 0.36].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), white);
    eye.position.set(x, 0.2, 0.86);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), dark);
    pupil.position.set(x, 0.2, 1.03);
    const ch = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), cheek);
    ch.position.set(x * 1.6, -0.15, 0.82);
    ch.scale.z = 0.4;
    group.add(eye, pupil, ch);
  });
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 8, 24, Math.PI), dark);
  smile.position.set(0, -0.12, 0.95);
  smile.rotation.z = Math.PI;
  group.add(smile);
  // graduation-style cap for a "little genius"
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 1.1), new THREE.MeshStandardMaterial({ color: 0x8b6fe0 }));
  cap.position.y = 1.05;
  cap.rotation.y = Math.PI / 4;
  const capBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.25, 16), new THREE.MeshStandardMaterial({ color: 0x8b6fe0 }));
  capBase.position.y = 0.92;
  group.add(cap, capBase);
  return group;
}

export function initWorld(container, { reducedMotion = false } = {}) {
  const isSmall = window.innerWidth < 700;
  const renderer = new THREE.WebGLRenderer({ antialias: !isSmall, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2));
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute("aria-label", "A friendly yellow mascot surrounded by floating alphabet blocks");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0.3, 9);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbfd9ff, 1.1));
  const sun = new THREE.DirectionalLight(0xfff2cc, 1.6);
  sun.position.set(4, 6, 6);
  scene.add(sun);

  const mascot = makeMascot();
  mascot.scale.setScalar(1.25);
  scene.add(mascot);

  // Blocks float on a ring around the mascot.
  const letters = isSmall ? "ABC123".split("") : "ABCDEF123".split("");
  const blocks = letters.map((ch, i) => {
    const b = makeBlock(ch, COLORS[i % COLORS.length]);
    const angle = (i / letters.length) * Math.PI * 2;
    b.userData.base = new THREE.Vector3(Math.cos(angle) * 3.4, Math.sin(angle * 1.7) * 1.4, Math.sin(angle) * 1.2 - 0.5);
    b.userData.phase = i * 0.8;
    b.userData.spin = 0;
    b.position.copy(b.userData.base);
    b.scale.setScalar(0.95);
    scene.add(b);
    return b;
  });

  // Stars
  const stars = [];
  const starCount = isSmall ? 5 : 9;
  for (let i = 0; i < starCount; i++) {
    const s = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.16),
      new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffc800, emissiveIntensity: 0.35 })
    );
    s.position.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 5, -1 - Math.random() * 2);
    s.userData.phase = Math.random() * 6;
    scene.add(s);
    stars.push(s);
  }

  // Clouds
  const clouds = [makeCloud(), makeCloud()];
  clouds[0].position.set(-4, 2.4, -3);
  clouds[1].position.set(4.2, -2.3, -3.5);
  clouds.forEach((c) => scene.add(c));

  // Sizing
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 1 ? 12 : 9;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  // Gentle pointer parallax + tap a block to make it spin
  const pointer = { x: 0, y: 0 };
  const raycaster = new THREE.Raycaster();
  renderer.domElement.addEventListener("pointermove", (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  renderer.domElement.addEventListener("pointerdown", (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(blocks)[0];
    if (hit) hit.object.userData.spin = Math.PI * 2;
  });

  // Draw only while visible (saves battery on phones)
  let visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(container);
  }

  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(clock.getDelta(), 0.05);

    mascot.position.y = Math.sin(t * 1.4) * 0.12;
    mascot.rotation.y = pointer.x * 0.4;
    mascot.rotation.x = pointer.y * 0.15;

    blocks.forEach((b) => {
      const u = b.userData;
      b.position.set(u.base.x, u.base.y + Math.sin(t * 1.1 + u.phase) * 0.25, u.base.z);
      b.rotation.x = Math.sin(t * 0.6 + u.phase) * 0.3;
      b.rotation.y = t * 0.4 + u.phase + (u.spin > 0 ? (Math.PI * 2 - u.spin) : 0);
      if (u.spin > 0) u.spin = Math.max(0, u.spin - 0.12);
    });
    stars.forEach((s) => {
      s.rotation.y = t + s.userData.phase;
      s.scale.setScalar(0.8 + Math.sin(t * 1.5 + s.userData.phase) * 0.2);
    });
    clouds.forEach((c, i) => { c.position.x += Math.sin(t * 0.2 + i) * 0.002; });
    camera.position.x += (pointer.x * 0.6 - camera.position.x) * 0.04;
    renderer.render(scene, camera);
  }

  if (reducedMotion) {
    // One still picture; no animation loop.
    renderer.render(scene, camera);
  } else {
    frame();
  }
  return true;
}
