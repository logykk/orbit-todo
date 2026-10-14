import * as THREE from 'three';
import './style.css';
import './orbit.css';
import './laser.css';

const STORAGE_KEY = 'orbit-missions-v1';
const $ = (selector) => document.querySelector(selector);
const initialTasks = [
  { id: 'sample-1', name: 'Plan the next big adventure', date: '', completed: false, created: 1 },
  { id: 'sample-2', name: 'Find inspiration in the little things', date: '', completed: false, created: 2 },
  { id: 'sample-3', name: 'Take one small step forward', date: '', completed: true, created: 3 },
];

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved.filter((task) => task && typeof task.name === 'string' && typeof task.id === 'string');
  } catch {}
  return initialTasks;
}

let tasks = loadTasks();
let view = 'today';
let selectedId = null;
let toastTimer;
let burst = () => {};
let launchEffect = () => {};
let syncMissionObjects = () => {};
let explodeMission = () => {};
let fireCompletionLaser = (_, onImpact) => onImpact();
let restoreFlightFocus = () => {};
let completingId = null;

function isUrgent(task) {
  if (task.completed || !task.date) return false;
  const due = new Date(`${task.date}T12:00:00`);
  return Number.isFinite(due.getTime()) && due.getTime() - Date.now() < 48 * 60 * 60 * 1000;
}

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function dateLabel(value) {
  if (!value) return 'Anytime';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'Anytime' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}
function visibleTasks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return tasks.filter((task) => {
    if (view === 'completed' && !task.completed) return false;
    if (view === 'upcoming' && (task.completed || !task.date || new Date(`${task.date}T12:00:00`) < today)) return false;
    return true;
  }).sort((a, b) => a.created - b.created);
}
function render() {
  const active = tasks.filter((task) => !task.completed).length;
  const completed = tasks.length - active;
  $('#total-count').textContent = String(tasks.length).padStart(2, '0');
  $('#active-count').textContent = String(active).padStart(2, '0');
  $('#completed-count').textContent = String(completed).padStart(2, '0');
  $('#nav-count').textContent = active;
  const labels = { today: 'My orbit', upcoming: 'Upcoming', completed: 'Completed' };
  $('#breadcrumb-view').textContent = labels[view];
  for (const button of document.querySelectorAll('.nav-item')) button.classList.toggle('active', button.dataset.view === view);
  const shown = visibleTasks();
  syncMissionObjects(shown);
  if (!shown.some((task) => task.id === selectedId)) selectedId = null;
  updateMissionPanel();
  $('#orbit-interaction').classList.toggle('is-empty', shown.length === 0);
}
function selectMission(id) {
  if (document.pointerLockElement) document.exitPointerLock();
  selectedId = id;
  updateMissionPanel();
  $('#mission-panel').querySelector('button')?.focus({ preventScroll: true });
}
function updateMissionPanel() {
  const task = tasks.find((item) => item.id === selectedId);
  const panel = $('#mission-panel');
  panel.hidden = !task;
  if (!task) return;
  $('#mission-panel-name').textContent = task.name;
  $('#mission-panel-date').textContent = task.date ? `DUE ${dateLabel(task.date).toUpperCase()}` : 'NO DEADLINE';
  $('#mission-panel-status').textContent = task.completed ? '✦ COMPLETED' : isUrgent(task) ? '⚡ URGENT MISSION' : '● IN ORBIT';
  panel.classList.toggle('urgent', isUrgent(task));
  $('#mission-complete').textContent = task.completed ? '↺  Reopen task' : '✓  Complete task';
}
function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task || completingId) return;
  selectedId = null;
  updateMissionPanel();
  if (task.completed) {
    task.completed = false;
    save();
    render();
    showToast('Mission back in orbit');
    restoreFlightFocus();
    return;
  }
  completingId = id;
  fireCompletionLaser(id, () => {
    task.completed = true;
    completingId = null;
    save();
    render();
    showToast('Mission accomplished! You’re a star ✦');
  });
  restoreFlightFocus();
}
function deleteTask(id) {
  if (completingId === id || !tasks.some((item) => item.id === id)) return;
  explodeMission(id);
  tasks = tasks.filter((item) => item.id !== id);
  selectedId = null;
  save();
  updateMissionPanel();
  setTimeout(render, 950);
  showToast('Mission removed from orbit');
  restoreFlightFocus();
}
function openModal() {
  $('#modal').classList.add('open');
  $('#modal').setAttribute('aria-hidden', 'false');
  setTimeout(() => $('#task-name').focus(), 100);
}
function closeModal() {
  $('#modal').classList.remove('open');
  $('#modal').setAttribute('aria-hidden', 'true');
  $('#task-form').reset();
}
$('#hero-add').addEventListener('click', openModal);
$('#mission-close').addEventListener('click', () => { selectedId = null; updateMissionPanel(); });
$('#mission-complete').addEventListener('click', () => { if (selectedId) toggleTask(selectedId); });
$('#mission-delete').addEventListener('click', () => { if (selectedId) deleteTask(selectedId); });
for (const selector of ['#modal-close', '#modal-cancel']) $(selector).addEventListener('click', closeModal);
$('#modal').addEventListener('click', (event) => { if (event.target === $('#modal')) closeModal(); });
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
$('#task-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = $('#task-name').value.trim();
  if (!name) return;
  tasks.unshift({ id: crypto.randomUUID(), name, date: $('#task-date').value, completed: false, created: Date.now() });
  save(); closeModal();
  if (view === 'completed') view = 'today';
  render(); showToast('Mission launched into orbit 🚀'); launchEffect();
});
for (const button of document.querySelectorAll('.nav-item')) button.addEventListener('click', () => { view = button.dataset.view; selectedId = null; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
$('#top-date').textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = $('#space-canvas');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' }); } catch { document.body.classList.add('no-webgl'); }
if (renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.08, 2500);
  camera.position.set(0, 38, 360);
  camera.rotation.order = 'YXZ';
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const ambient = new THREE.AmbientLight(0x5f6ca4, 2.2); scene.add(ambient);
  const keyLight = new THREE.PointLight(0xd5b4ff, 2600); keyLight.position.set(-20, 25, 40); scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x74b9ff, 3100); rimLight.position.set(20, -5, -5); scene.add(rimLight);
  const planet = new THREE.Group();
  planet.scale.setScalar(6.75);
  scene.add(planet);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(2.35, 96, 64), new THREE.MeshStandardMaterial({ color: 0x715ab3, roughness: 0.82, metalness: 0.06, emissive: 0x281747, emissiveIntensity: 0.22 }));
  globe.scale.setScalar(10);
  planet.add(globe);
  const cloudLayers = [];
  for (let i = 0; i < 9; i++) {
    const latitude = -1.85 + i * 0.46;
    const radius = Math.sqrt(Math.max(0, 2.37 ** 2 - latitude ** 2));
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.035 + (i % 3) * 0.027, 7, 140), new THREE.MeshBasicMaterial({ color: [0xb49be3, 0x9c85d0, 0x7aabd8][i % 3], transparent: true, opacity: 0.28 + (i % 3) * 0.07 }));
    band.rotation.x = Math.PI / 2; band.position.y = latitude; globe.add(band); cloudLayers.push(band);
  }
  const ringGroup = new THREE.Group();
  ringGroup.rotation.x = -0.37; ringGroup.rotation.z = -0.43;
  ringGroup.scale.setScalar(10);
  planet.add(ringGroup);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xd5c1ff, side: THREE.DoubleSide, transparent: true, opacity: 0.43, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.04, 4.13, 192), ringMaterial);
  ring.rotation.x = -.78; ringGroup.add(ring);
  for (const radius of [2.88, 3.16, 3.42, 3.96, 4.23]) {
    const edge = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.014, 4, 192), new THREE.MeshBasicMaterial({ color: radius < 3 ? 0xe2d5ff : 0xa6b8f3, transparent: true, opacity: radius < 3 ? 0.6 : 0.38 }));
    edge.rotation.x = -.78; ringGroup.add(edge);
  }
  const dustPositions = [];
  for (let i = 0; i < 1350; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 2.85 + Math.random() * 1.55;
    dustPositions.push(Math.cos(a) * r, Math.sin(a) * r, (Math.random() - .5) * .12);
  }
  const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustPositions, 3));
  const ringDust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xe7ddff, size: 0.027, transparent: true, opacity: 0.68, depthWrite: false }));
  ringDust.rotation.x = -.78;
  ringGroup.add(ringDust);
  function glowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(.12, 'rgba(188,168,255,.9)'); gradient.addColorStop(.35, 'rgba(121,127,244,.28)'); gradient.addColorStop(1, 'rgba(121,127,244,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const glowMap = glowTexture();
  const atmosphere = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0x7065d5, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false }));
  atmosphere.scale.set(110, 110, 1); atmosphere.position.z = -18; planet.add(atmosphere);
  const starPositions = [], starColors = [];
  for (let i = 0; i < 1600; i++) {
    const direction = new THREE.Vector3().randomDirection().multiplyScalar(650 + Math.random() * 1100);
    starPositions.push(direction.x, direction.y, direction.z);
    const tone = Math.random(); starColors.push(tone > .84 ? .75 : .5, tone > .84 ? .74 : .6, 1);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ size: .035, vertexColors: true, transparent: true, opacity: .8, sizeAttenuation: true })); scene.add(stars);
  const brightStars = [];
  for (let i = 0; i < 25; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: i % 3 === 0 ? 0xb994ff : 0xd6eaff, transparent: true, opacity: .3 + Math.random() * .3, blending: THREE.AdditiveBlending, depthWrite: false }));
    sprite.position.copy(new THREE.Vector3().randomDirection().multiplyScalar(650 + Math.random() * 750));
    const size = .15 + Math.random() * .3; sprite.scale.set(size, size, 1);
    scene.add(sprite); brightStars.push(sprite);
  }
  const animatedBursts = [];
  burst = (position = planet.position) => {
    if (reducedMotion) return;
    const group = new THREE.Group();
    for (let i = 0; i < 36; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: i % 3 ? 0xb8a4ff : 0xd6ffab, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      sprite.scale.set(.18, .18, 1); group.add(sprite);
      const angle = Math.random() * Math.PI * 2; const spread = .5 + Math.random() * 4;
      sprite.userData.velocity = new THREE.Vector3(Math.cos(angle) * spread, Math.sin(angle) * spread, Math.random() * 2);
    }
    group.position.copy(position); scene.add(group); animatedBursts.push({ group, start: performance.now() });
  };
  launchEffect = () => { burst(); planet.rotation.z -= .3; };
  const missionLayer = new THREE.Group();
  planet.add(missionLayer);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const missionTargets = [];
  const missionLabels = new Map();
  const occlusionRay = new THREE.Raycaster();
  const occlusionDirection = new THREE.Vector3();
  function behindPlanet(world) {
    occlusionDirection.subVectors(world, camera.position);
    const distance = occlusionDirection.length();
    occlusionRay.set(camera.position, occlusionDirection.normalize());
    occlusionRay.far = distance;
    globe.updateWorldMatrix(true, false);
    return occlusionRay.intersectObject(globe, false).some((hit) => hit.distance < distance - .05);
  }
  const tooltip = $('#orbit-tooltip');
  const orbitArea = $('#orbit-interaction');
  let hovered = null;
  let dragStart = null;
  const pressed = new Set();
  const mobilePressed = new Set();
  const velocity = new THREE.Vector3();
  const movement = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const flightOrigin = new THREE.Vector3(0, 0, 0);
  let yaw = 0;
  let pitch = -.14;
  let flying = false;
  let lastFrame = 0;
  const explosions = [];
  const laserShots = [];
  const laserGeometry = new THREE.CylinderGeometry(.025, .038, 1, 10);
  const laserCoreMaterial = new THREE.MeshBasicMaterial({ color: 0xb8ffe7, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
  const laserHaloMaterial = new THREE.MeshBasicMaterial({ color: 0x55ffad, transparent: true, opacity: .26, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
  const laserAxis = new THREE.Vector3(0, 1, 0);
  const laserStart = new THREE.Vector3();
  const laserEnd = new THREE.Vector3();
  const laserMidpoint = new THREE.Vector3();

  function paintMissionGreen(satellite) {
    satellite.userData.urgent = false;
    satellite.userData.color = 0xb4ffa7;
    satellite.children[0].traverse((part) => {
      if (!part.isMesh) return;
      part.material.color.setHex(0xb4ffa7);
      if (part.material.emissive) part.material.emissive.setHex(0x428e53);
    });
    const aura = satellite.children.find((child) => child.isSprite);
    if (aura) aura.material.color.setHex(0xb4ffa7);
    const label = missionLabels.get(satellite.userData.taskId);
    if (label) {
      label.classList.remove('urgent');
      label.classList.add('done');
      label.querySelector('small').textContent = '✦  COMPLETED';
      label.setAttribute('aria-label', `${tasks.find((task) => task.id === satellite.userData.taskId)?.name ?? 'Task'}. Completed. Select task`);
    }
  }

  fireCompletionLaser = (id, onImpact) => {
    const satellite = missionLayer.children.find((item) => item.userData.taskId === id);
    if (!satellite || reducedMotion || !satellite.visible) { onImpact(); return; }
    const beam = new THREE.Group();
    const halo = new THREE.Mesh(laserGeometry, laserHaloMaterial);
    halo.scale.set(2.3, 1, 2.3);
    const core = new THREE.Mesh(laserGeometry, laserCoreMaterial);
    beam.add(halo, core);
    scene.add(beam);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0x83ffbf, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
    flash.scale.set(1.8, 1.8, 1);
    scene.add(flash);
    const trace = document.createElement('div');
    trace.className = 'laser-trace';
    document.body.append(trace);
    laserShots.push({ id, satellite, beam, flash, trace, start: performance.now(), onImpact, impacted: false, end: new THREE.Vector3() });
  };

  function setFlightMode(enabled) {
    flying = enabled;
    document.body.classList.toggle('is-flying', enabled);
    $('#flight-enter').hidden = enabled;
    $('#flight-exit').hidden = !enabled;
    $('#flight-hint').textContent = enabled ? 'WASD move · mouse look · Space / Shift ascend / descend · E select · Esc pause' : 'Explore the planet. Select Fly to pilot your ship.';
    if (!enabled) { pressed.clear(); mobilePressed.clear(); velocity.set(0, 0, 0); }
  }
  function enterFlight() {
    if (flying && document.pointerLockElement === orbitArea) return;
    setFlightMode(true);
    orbitArea.focus({ preventScroll: true });
    if (matchMedia('(pointer:fine)').matches) {
      const lock = orbitArea.requestPointerLock?.();
      lock?.catch(() => setFlightMode(false));
    }
  }
  restoreFlightFocus = () => {
    orbitArea.focus({ preventScroll: true });
    enterFlight();
  };
  $('#flight-enter').addEventListener('click', enterFlight);
  $('#flight-exit').addEventListener('click', () => { document.exitPointerLock?.(); setFlightMode(false); });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === orbitArea) setFlightMode(true);
    else if (flying && matchMedia('(pointer:fine)').matches) setFlightMode(false);
  });
  document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement !== orbitArea || !flying) return;
    yaw -= event.movementX * .0022;
    pitch = THREE.MathUtils.clamp(pitch - event.movementY * .0022, -1.48, 1.48);
  });
  window.addEventListener('keydown', (event) => {
    if (!flying || event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
    if (event.code === 'Escape') { setFlightMode(false); return; }
    if (['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)) event.preventDefault();
    pressed.add(event.code);
    if (event.code === 'KeyE') selectGazeTarget();
  });
  window.addEventListener('keyup', (event) => pressed.delete(event.code));
  window.addEventListener('blur', () => pressed.clear());
  for (const button of document.querySelectorAll('[data-flight]')) {
    const key = button.dataset.flight;
    button.addEventListener('pointerdown', (event) => { event.preventDefault(); mobilePressed.add(key); button.setPointerCapture(event.pointerId); });
    button.addEventListener('pointerup', () => mobilePressed.delete(key));
    button.addEventListener('pointercancel', () => mobilePressed.delete(key));
  }

  function gazeTarget() {
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    pointer.set(0, 0);
    raycaster.setFromCamera(pointer, camera);
    const target = raycaster.intersectObjects(missionTargets, false)[0];
    if (!target || target.distance > 900 || behindPlanet(target.object.getWorldPosition(new THREE.Vector3()))) return null;
    return target.object.userData.taskId;
  }
  function selectGazeTarget() {
    const id = gazeTarget();
    if (id) { document.exitPointerLock?.(); setFlightMode(false); selectMission(id); }
  }

  explodeMission = (id) => {
    const satellite = missionLayer.children.find((item) => item.userData.taskId === id);
    if (!satellite) { burst(); return; }
    satellite.updateWorldMatrix(true, true);
    const origin = satellite.getWorldPosition(new THREE.Vector3());
    if (!reducedMotion) {
      const fragments = new THREE.Group();
      fragments.position.copy(origin);
      const color = satellite.userData.color;
      for (let i = 0; i < 44; i++) {
        const material = new THREE.MeshStandardMaterial({ color: i % 4 ? color : 0xffffff, emissive: color, emissiveIntensity: 1.2, metalness: .45, roughness: .25, transparent: true });
        const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(.045 + Math.random() * .12), material);
        shard.userData.velocity = new THREE.Vector3().randomDirection().multiplyScalar(2.4 + Math.random() * 5);
        shard.userData.spin = new THREE.Vector3().randomDirection().multiplyScalar(7);
        fragments.add(shard);
      }
      scene.add(fragments);
      explosions.push({ fragments, start: performance.now() });
      burst(origin);
    }
    satellite.visible = false;
    missionLabels.get(id)?.classList.add('exploding');
    for (let i = missionTargets.length - 1; i >= 0; i--) {
      if (missionTargets[i].userData.taskId === id) missionTargets.splice(i, 1);
    }
    hovered = null;
    tooltip.classList.remove('visible');
  };

  function createMissionBody(kind, color, id, completed) {
    const body = new THREE.Group();
    const shell = new THREE.MeshStandardMaterial({ color, metalness: .48, roughness: .32, emissive: completed ? 0x428e53 : color, emissiveIntensity: completed ? .65 : .15, flatShading: kind === 0 });
    const detail = new THREE.MeshStandardMaterial({ color: completed ? 0xb4ffa7 : 0x27314d, metalness: completed ? .35 : .84, roughness: .24, emissive: completed ? 0x428e53 : 0x000000, emissiveIntensity: completed ? .65 : 0 });
    const glow = new THREE.MeshBasicMaterial({ color });
    const add = (geometry, material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.userData.taskId = id;
      body.add(mesh);
      missionTargets.push(mesh);
      return mesh;
    };
    if (kind === 0) {
      add(new THREE.IcosahedronGeometry(.34, 1), shell);
      const band = add(new THREE.TorusGeometry(.47, .042, 8, 48), glow);
      band.rotation.set(.6, .3, .2);
    } else if (kind === 1) {
      add(new THREE.SphereGeometry(.27, 24, 16), shell);
      add(new THREE.CylinderGeometry(.13, .13, .48, 12), detail).rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) {
        const panel = add(new THREE.BoxGeometry(.54, .32, .035), detail, side * .69);
        panel.rotation.y = side * .14;
        for (let stripe = -1; stripe <= 1; stripe++) {
          add(new THREE.BoxGeometry(.025, .29, .04), glow, side * .69 + stripe * .13, 0, .025);
        }
      }
      add(new THREE.SphereGeometry(.08, 12, 8), glow, 0, .34, 0);
    } else if (kind === 2) {
      const crystal = add(new THREE.OctahedronGeometry(.39, 0), shell);
      crystal.rotation.z = .3;
      for (const side of [-1, 1]) {
        const shard = add(new THREE.ConeGeometry(.13, .42, 5), glow, side * .4, -.08, .08);
        shard.rotation.z = side * .6;
      }
    } else if (kind === 3) {
      add(new THREE.SphereGeometry(.32, 24, 16), shell);
      const disc = add(new THREE.TorusGeometry(.45, .07, 8, 48), detail);
      disc.rotation.x = Math.PI / 2;
      add(new THREE.SphereGeometry(.13, 16, 12), glow, 0, .29, 0);
      for (let j = 0; j < 4; j++) {
        const a = j * Math.PI / 2;
        add(new THREE.SphereGeometry(.045, 8, 6), glow, Math.cos(a) * .45, 0, Math.sin(a) * .45);
      }
    } else {
      add(new THREE.DodecahedronGeometry(.32, 0), shell);
      const ring = add(new THREE.TorusGeometry(.48, .025, 6, 48), glow);
      ring.rotation.set(.7, .5, .2);
      add(new THREE.ConeGeometry(.14, .34, 6), detail, 0, -.39, 0).rotation.z = Math.PI;
    }
    return body;
  }

  function addAngryFace(body, id) {
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffeef0 });
    const browMaterial = new THREE.MeshBasicMaterial({ color: 0xff1834 });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 8), eyeMaterial);
      eye.position.set(side * .13, .055, .37);
      eye.userData.taskId = id;
      body.add(eye);
      missionTargets.push(eye);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(.18, .045, .045), browMaterial);
      brow.position.set(side * .13, .18, .38);
      brow.rotation.z = side * .36;
      brow.userData.taskId = id;
      body.add(brow);
      missionTargets.push(brow);
    }
  }

  syncMissionObjects = (shown) => {
    for (const child of [...missionLayer.children]) {
      missionLayer.remove(child);
      const materials = new Set();
      child.traverse((object) => {
        object.geometry?.dispose();
        if (object.material) materials.add(object.material);
      });
      for (const material of materials) {
        if (material.map && material.map !== glowMap) material.map.dispose();
        material.dispose();
      }
    }
    missionTargets.length = 0;
    for (const label of missionLabels.values()) label.remove();
    missionLabels.clear();
    hovered = null;
    tooltip.classList.remove('visible');
    for (const [i, task] of shown.entries()) {
      const ring = Math.floor(i / 8);
      const ringCount = Math.min(8, shown.length - ring * 8);
      const angle = -.7 + ring * .35 + (i % 8) * (Math.PI * 2 / Math.max(ringCount, 3));
      const radius = 39 + ring * 3;
      const urgent = isUrgent(task);
      const color = task.completed ? 0xb4ffa7 : urgent ? 0xff354f : [0xbca5ff, 0x8bd7ff, 0xffc2df, 0xffd29a][i % 5];
      const satellite = new THREE.Group();
      satellite.scale.setScalar(0.5);
      satellite.userData = { angle, radius, speed: .000006, phase: i * 2.3, urgent, color, taskId: task.id };
      const body = createMissionBody(i % 5, color, task.id, task.completed);
      if (urgent) addAngryFace(body, task.id);
      satellite.add(body);
      const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
      aura.scale.set(urgent ? 2.1 : 1.3, urgent ? 2.1 : 1.3, 1);
      satellite.add(aura);
      if (urgent) {
        const alarm = new THREE.PointLight(0xff243d, 5, 3);
        satellite.add(alarm);
      }
      missionLayer.add(satellite);
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'orbit-task';
      label.dataset.taskId = task.id;
      label.setAttribute('aria-label', `${task.name}. ${task.completed ? 'Completed' : isUrgent(task) ? 'Urgent' : 'Active'}. Select task`);
      const title = document.createElement('strong');
      title.textContent = task.name;
      const details = document.createElement('small');
      details.textContent = task.completed ? '✦  COMPLETED' : isUrgent(task) ? `⚡  DUE ${dateLabel(task.date).toUpperCase()}` : `◷  ${dateLabel(task.date).toUpperCase()}`;
      label.append(title, details);
      label.classList.toggle('urgent', urgent);
      label.classList.toggle('done', task.completed);
      label.addEventListener('pointerdown', (event) => event.stopPropagation());
      label.addEventListener('click', (event) => { event.stopPropagation(); selectMission(task.id); });
      orbitArea.append(label);
      missionLabels.set(task.id, label);
    }
    orbitArea.classList.toggle('has-missions', shown.length > 0);
  };
  syncMissionObjects(visibleTasks());

  function missionAt(event) {
    if (dragStart?.moved) return null;
    pointer.set(event.clientX / innerWidth * 2 - 1, -(event.clientY / innerHeight) * 2 + 1);
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const target = raycaster.intersectObjects(missionTargets, false)[0];
    if (!target || target.distance > 900 || behindPlanet(target.object.getWorldPosition(new THREE.Vector3()))) return null;
    return target.object;
  }
  orbitArea.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button, .mission-panel')) return;
    dragStart = { x: event.clientX, y: event.clientY, moved: false };
    orbitArea.setPointerCapture(event.pointerId);
  });
  orbitArea.addEventListener('pointermove', (event) => {
    if (dragStart && document.pointerLockElement !== orbitArea) {
      const dx = event.clientX - dragStart.x;
      const dy = event.clientY - dragStart.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) dragStart.moved = true;
      if (dragStart.moved) {
        yaw -= dx * .004;
        pitch = THREE.MathUtils.clamp(pitch - dy * .004, -1.48, 1.48);
        dragStart.x = event.clientX; dragStart.y = event.clientY;
      }
    }
  });
  orbitArea.addEventListener('pointerup', (event) => {
    if (dragStart && !dragStart.moved) {
      if (document.pointerLockElement === orbitArea) selectGazeTarget();
      else {
        const target = missionAt(event);
        if (target) selectMission(target.userData.taskId);
        else enterFlight();
      }
    }
    dragStart = null;
  });
  orbitArea.addEventListener('pointercancel', () => { dragStart = null; });


  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();
  function animate(time) {
    const dt = Math.min((time - (lastFrame || time)) / 1000, .05);
    lastFrame = time;
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    if (flying) {
      forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      movement.set(0, 0, 0);
      if (pressed.has('KeyW') || pressed.has('ArrowUp') || mobilePressed.has('forward')) movement.add(forward);
      if (pressed.has('KeyS') || pressed.has('ArrowDown') || mobilePressed.has('back')) movement.sub(forward);
      if (pressed.has('KeyD') || pressed.has('ArrowRight') || mobilePressed.has('right')) movement.add(right);
      if (pressed.has('KeyA') || pressed.has('ArrowLeft') || mobilePressed.has('left')) movement.sub(right);
      if (pressed.has('Space') || mobilePressed.has('up')) movement.y += 1;
      if (pressed.has('ShiftLeft') || pressed.has('ShiftRight') || mobilePressed.has('down')) movement.y -= 1;
      if (movement.lengthSq()) movement.normalize().multiplyScalar(pressed.has('ControlLeft') ? 330 : 180);
      velocity.lerp(movement, Math.min(1, dt * 7));
      const next = camera.position.clone().addScaledVector(velocity, dt);
      if (next.distanceTo(flightOrigin) < 175) {
        next.sub(flightOrigin).normalize().multiplyScalar(175).add(flightOrigin);
        velocity.set(0, 0, 0);
      }
      camera.position.copy(next);
    }
    $('#flight-coordinates').textContent = `${camera.position.x.toFixed(1)} / ${camera.position.y.toFixed(1)} / ${camera.position.z.toFixed(1)}`;
    $('#flight-speed').textContent = `${velocity.length().toFixed(1)} u/s`;
    planet.rotation.y = reducedMotion ? 0 : time * .000025;
    ringGroup.rotation.z = -.43 + (reducedMotion ? 0 : Math.sin(time * .00032) * .035);
    if (!reducedMotion) {
      for (const [i, star] of brightStars.entries()) star.material.opacity = .22 + .2 * Math.sin(time * .0018 + i * 3.7);
    }
    for (const satellite of missionLayer.children) {
      const data = satellite.userData;
      const angle = data.angle + (reducedMotion ? 0 : time * data.speed);
      const float = reducedMotion ? 0 : Math.sin(time * .0012 + data.phase) * .15;
      satellite.position.set(Math.cos(angle) * data.radius, Math.sin(angle) * data.radius * .68 + float, Math.sin(angle) * 1.6 + .7 + float);
      satellite.children[0].rotation.y = reducedMotion ? 0 : time * .00045 + data.phase;
      satellite.children[0].rotation.z = reducedMotion ? 0 : Math.sin(time * .001 + data.phase) * .16;
      const agitation = data.urgent && !reducedMotion ? Math.sin(time * .02 + data.phase) * .075 : 0;
      satellite.position.x += agitation;
      const label = missionLabels.get(data.taskId);
      if (label) {
        satellite.updateWorldMatrix(true, false);
        camera.updateMatrixWorld();
        const world = satellite.getWorldPosition(new THREE.Vector3());
        const screen = world.clone().project(camera);
        const area = orbitArea.getBoundingClientRect();
        const x = (screen.x + 1) * innerWidth / 2 - area.left;
        const y = (-screen.y + 1) * innerHeight / 2 - area.top;
        const distance = camera.position.distanceTo(world);
        label.style.left = `${x}px`;
        label.style.top = `${y + THREE.MathUtils.clamp(160 / distance, 12, 38)}px`;
        label.style.setProperty('--depth', String(THREE.MathUtils.clamp(9 / distance, .65, 1.55)));
        label.hidden = !satellite.visible || distance > 900 || screen.z < -1 || screen.z > 1 || x < 0 || x > area.width || y < 0 || y > area.height || behindPlanet(world);
        label.classList.toggle('selected', selectedId === data.taskId);
      }
      const angryPulse = data.urgent && !reducedMotion ? 1 + Math.sin(time * .018) * .13 : 1;
      satellite.scale.setScalar(.5 * (hovered && satellite.children[0].children.includes(hovered) ? 1.3 : 1) * angryPulse);
    }
    for (let i = laserShots.length - 1; i >= 0; i--) {
      const shot = laserShots[i];
      const elapsed = time - shot.start;
      shot.satellite.updateWorldMatrix(true, false);
      shot.satellite.getWorldPosition(shot.end);
      camera.updateMatrixWorld();
      laserStart.set(0, -.32, -.55).applyMatrix4(camera.matrixWorld);
      const progress = THREE.MathUtils.clamp((elapsed - 80) / 620, 0, 1);
      const visibleLength = laserStart.distanceTo(shot.end) * progress;
      const direction = laserEnd.subVectors(shot.end, laserStart).normalize();
      laserMidpoint.copy(laserStart).addScaledVector(direction, visibleLength * .5);
      shot.beam.position.copy(laserMidpoint);
      shot.beam.quaternion.setFromUnitVectors(laserAxis, direction);
      shot.beam.children[0].scale.y = visibleLength;
      shot.beam.children[1].scale.y = visibleLength;
      shot.beam.visible = elapsed >= 80 && elapsed < 1000;
      const screen = shot.end.clone().project(camera);
      const impactX = (screen.x + 1) * innerWidth / 2;
      const impactY = (-screen.y + 1) * innerHeight / 2;
      const muzzleX = innerWidth / 2;
      const muzzleY = innerHeight * .68;
      const beamX = muzzleX + (impactX - muzzleX) * progress;
      const beamY = muzzleY + (impactY - muzzleY) * progress;
      const traceLength = Math.hypot(beamX - muzzleX, beamY - muzzleY);
      const inView = screen.z > -1 && screen.z < 1 && impactX >= 0 && impactX <= innerWidth && impactY >= 0 && impactY <= innerHeight;
      shot.trace.style.display = inView && elapsed >= 80 && elapsed < 1000 ? 'block' : 'none';
      shot.trace.style.left = `${muzzleX}px`;
      shot.trace.style.top = `${muzzleY}px`;
      shot.trace.style.width = `${traceLength}px`;
      shot.trace.style.transform = `rotate(${Math.atan2(beamY - muzzleY, beamX - muzzleX)}rad)`;
      shot.flash.position.copy(shot.end);
      shot.flash.material.opacity = shot.impacted ? Math.max(0, 1 - (elapsed - 700) / 300) : 0;
      if (!shot.impacted && elapsed >= 700) {
        shot.impacted = true;
        paintMissionGreen(shot.satellite);
        shot.onImpact();
      }
      if (elapsed >= 1050) {
        scene.remove(shot.beam, shot.flash);
        shot.flash.material.dispose();
        shot.trace.remove();
        laserShots.splice(i, 1);
      }
    }
    const gazeId = flying ? gazeTarget() : null;
    $('#flight-target').textContent = gazeId ? tasks.find((task) => task.id === gazeId)?.name ?? '—' : '—';
    $('#flight-crosshair').classList.toggle('has-target', !!gazeId);
    for (let i = animatedBursts.length - 1; i >= 0; i--) {
      const item = animatedBursts[i]; const progress = (time - item.start) / 1100;
      if (progress >= 1) {
        scene.remove(item.group);
        for (const sprite of item.group.children) sprite.material.dispose();
        animatedBursts.splice(i, 1);
      } else {
        for (const sprite of item.group.children) { sprite.position.copy(sprite.userData.velocity).multiplyScalar(progress); sprite.material.opacity = 1 - progress; }
      }
    }
    for (let i = explosions.length - 1; i >= 0; i--) {
      const item = explosions[i];
      const age = Math.min((time - item.start) / 1000, 1);
      if (age >= 1) {
        scene.remove(item.fragments);
        for (const shard of item.fragments.children) { shard.geometry.dispose(); shard.material.dispose(); }
        explosions.splice(i, 1);
      } else {
        for (const shard of item.fragments.children) {
          shard.position.copy(shard.userData.velocity).multiplyScalar(age);
          shard.position.y -= age * age * 1.5;
          shard.rotation.set(shard.userData.spin.x * age, shard.userData.spin.y * age, shard.userData.spin.z * age);
          shard.material.opacity = 1 - age;
          shard.scale.setScalar(1 + age * 2);
        }
      }
    }
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(animate);
}
render();
