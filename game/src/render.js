// Drawing only: the world state in, pixels out. A three.js scene (one instanced mesh for
// all buildings, one for palms, individual groups for cars and peds), a third-person
// camera that orbits on the mouse, and a fixed camera for the staged screenshot scenes.
// The world modules never import this file; main.js calls draw() every frame.
import * as THREE from '../vendor/three.module.min.js';
import { CITY, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas, city) {
  const headless = !!window.navigator.webdriver;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !headless });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 180, 420);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);

  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x8a7a5a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(PALETTE.sun, 1.6);
  sun.position.set(120, 180, 60);
  scene.add(sun);

  // Ground, roads, sidewalks, beach and sea: flat planes, layered to avoid z-fighting.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.bound * 2 + 120, CITY.bound * 2 + 120),
    new THREE.MeshLambertMaterial({ color: PALETTE.ground })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.06, 0);
  scene.add(ground);
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  for (const s of CITY.streets) {
    const roadH = new THREE.Mesh(new THREE.PlaneGeometry(CITY.bound * 2, CITY.roadW), roadMat);
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.set(0, 0, s);
    scene.add(roadH);
    const roadV = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadW, CITY.bound * 2), roadMat);
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.set(s, 0.01, 0);
    scene.add(roadV);
    const walkH = new THREE.Mesh(new THREE.PlaneGeometry(CITY.bound * 2, CITY.roadW + 6), walkMat);
    walkH.rotation.x = -Math.PI / 2;
    walkH.position.set(0, -0.02, s);
    scene.add(walkH);
    const walkV = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadW + 6, CITY.bound * 2), walkMat);
    walkV.rotation.x = -Math.PI / 2;
    walkV.position.set(s, -0.02, 0);
    scene.add(walkV);
  }
  // Road centre dashes.
  const dashMat = new THREE.MeshBasicMaterial({ color: PALETTE.roadLine });
  const dashGeo = new THREE.PlaneGeometry(4, 0.5);
  for (const s of CITY.streets) {
    for (let v = -CITY.bound; v < CITY.bound; v += 16) {
      const d1 = new THREE.Mesh(dashGeo, dashMat);
      d1.rotation.x = -Math.PI / 2;
      d1.position.set(v, 0.03, s);
      scene.add(d1);
      const d2 = new THREE.Mesh(dashGeo, dashMat);
      d2.rotation.x = -Math.PI / 2;
      d2.rotation.z = Math.PI / 2;
      d2.position.set(s, 0.03, v);
      scene.add(d2);
    }
  }
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.bound * 2 + 120, 30),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand })
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, -0.04, 232);
  scene.add(beach);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.bound * 2 + 120, 90),
    new THREE.MeshLambertMaterial({ color: PALETTE.sea })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.05, 292);
  scene.add(sea);

  // Buildings: one instanced box, coloured per instance.
  const bGeo = new THREE.BoxGeometry(1, 1, 1);
  const bMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const buildings = new THREE.InstancedMesh(bGeo, bMat, Math.max(1, city.buildings.length));
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sv = new THREE.Vector3();
  const pv = new THREE.Vector3();
  const col = new THREE.Color();
  city.buildings.forEach((b, i) => {
    pv.set(b.x, b.h / 2, b.z);
    sv.set(b.hx * 2, b.h, b.hz * 2);
    m4.compose(pv, q, sv);
    buildings.setMatrixAt(i, m4);
    buildings.setColorAt(i, col.setHex(b.color));
  });
  buildings.instanceMatrix.needsUpdate = true;
  if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
  scene.add(buildings);

  // Palms: instanced trunks and crowns.
  const palmCount = Math.max(1, city.palms.length);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.4, 5, 6), new THREE.MeshLambertMaterial({ color: PALETTE.palmTrunk }), palmCount);
  const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(2.6, 3.4, 7), new THREE.MeshLambertMaterial({ color: PALETTE.palmLeaf }), palmCount);
  city.palms.forEach((palm, i) => {
    pv.set(palm.x, 2.5, palm.z);
    sv.set(1, 1, 1);
    m4.compose(pv, q, sv);
    trunks.setMatrixAt(i, m4);
    pv.set(palm.x, 6.2, palm.z);
    m4.compose(pv, q, sv);
    crowns.setMatrixAt(i, m4);
  });
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  scene.add(trunks);
  scene.add(crowns);

  // Street lamps: instanced poles.
  const lampCount = Math.max(1, city.lamps.length);
  const lamps = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 5), new THREE.MeshLambertMaterial({ color: 0x2c3e50 }), lampCount);
  city.lamps.forEach((lamp, i) => {
    pv.set(lamp.x, 2.5, lamp.z);
    sv.set(1, 1, 1);
    m4.compose(pv, q, sv);
    lamps.setMatrixAt(i, m4);
  });
  lamps.instanceMatrix.needsUpdate = true;
  scene.add(lamps);

  // --- Dynamic entities -------------------------------------------------------
  const carGeoBody = new THREE.BoxGeometry(2, 0.85, 4.4);
  const carGeoCabin = new THREE.BoxGeometry(1.7, 0.65, 2.2);
  const carGeoBase = new THREE.BoxGeometry(2.05, 0.35, 4.5);
  const carMats = new Map();
  function carMat(color) {
    if (!carMats.has(color)) carMats.set(color, new THREE.MeshLambertMaterial({ color }));
    return carMats.get(color);
  }
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const carGroups = new Map(); // car id -> Group

  function carGroup(car) {
    let g = carGroups.get(car.id);
    if (!g) {
      g = new THREE.Group();
      const body = new THREE.Mesh(carGeoBody, carMat(car.color));
      body.position.y = 0.75;
      const cabin = new THREE.Mesh(carGeoCabin, carMat(car.color));
      cabin.position.set(0, 1.45, -0.3);
      const base = new THREE.Mesh(carGeoBase, darkMat);
      base.position.y = 0.35;
      g.add(body, cabin, base);
      scene.add(g);
      carGroups.set(car.id, g);
    }
    // Recolour if the car's colour changed (stolen cars keep theirs; police are blue).
    g.children[0].material = carMat(car.color);
    g.children[1].material = carMat(car.color);
    return g;
  }

  const pedGeoBody = new THREE.BoxGeometry(0.55, 1.1, 0.35);
  const pedGeoHead = new THREE.SphereGeometry(0.24, 8, 6);
  const pedMats = new Map();
  function pedMat(color) {
    if (!pedMats.has(color)) pedMats.set(color, new THREE.MeshLambertMaterial({ color }));
    return pedMats.get(color);
  }
  const pedGroups = [];
  function pedGroup(i) {
    if (!pedGroups[i]) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(pedGeoBody, pedMats.get(0) || new THREE.MeshLambertMaterial({ color: 0x888888 }));
      body.position.y = 0.75;
      const head = new THREE.Mesh(pedGeoHead, new THREE.MeshLambertMaterial({ color: 0xe8c39a }));
      head.position.y = 1.55;
      g.add(body, head);
      scene.add(g);
      pedGroups[i] = g;
    }
    return pedGroups[i];
  }

  // The player: green body, darker head, a white marker ring so they read at a glance.
  const playerGroup = new THREE.Group();
  const playerBody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.4), new THREE.MeshLambertMaterial({ color: PALETTE.player }));
  playerBody.position.y = 0.8;
  const playerHead = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
  playerHead.position.y = 1.65;
  playerGroup.add(playerBody, playerHead);
  scene.add(playerGroup);

  // Bullets: small bright tracers from a fixed pool.
  const bulletGeo = new THREE.BoxGeometry(0.18, 0.18, 1.1);
  const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffe14d });
  const bulletMeshes = [];
  for (let i = 0; i < 32; i += 1) {
    const m = new THREE.Mesh(bulletGeo, bulletMat);
    m.visible = false;
    scene.add(m);
    bulletMeshes.push(m);
  }

  // Mission beacon: a tall translucent column and a ground ring at the target.
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: PALETTE.marker, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
  );
  beacon.visible = false;
  scene.add(beacon);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 2.2, 24),
    new THREE.MeshBasicMaterial({ color: PALETTE.marker, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  // --- Camera -----------------------------------------------------------------
  const cam = { yaw: 0, pitch: 0.32, dist: 11, shot: null };
  const camPos = new THREE.Vector3(0, 8, -12);
  const camLook = new THREE.Vector3(0, 1, 0);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  /** Orbit the follow camera (mouse). */
  function orbit(dx, dy) {
    cam.yaw -= dx * 0.0032;
    cam.pitch = Math.max(0.08, Math.min(0.9, cam.pitch + dy * 0.0022));
    cam.shot = null;
  }

  /** Fix the camera for a staged screenshot. */
  function setShotCamera(x, y, z, lx, ly, lz) {
    cam.shot = { x, y, z, lx, ly, lz };
  }

  function followCamera(state) {
    if (cam.shot) {
      camPos.set(cam.shot.x, cam.shot.y, cam.shot.z);
      camLook.set(cam.shot.lx, cam.shot.ly, cam.shot.lz);
      return;
    }
    const p = state.player;
    const inCar = !p.onFoot && p.car;
    const dist = inCar ? 15 : 11;
    const height = inCar ? 6.5 : 5;
    const tx = inCar ? p.car.x : p.x;
    const tz = inCar ? p.car.z : p.z;
    const fx = Math.sin(cam.yaw);
    const fz = Math.cos(cam.yaw);
    const wantX = tx - fx * dist;
    const wantZ = tz - fz * dist;
    const wantY = height + Math.tan(cam.pitch) * dist * 0.4;
    camPos.x += (wantX - camPos.x) * 0.2;
    camPos.y += (wantY - camPos.y) * 0.2;
    camPos.z += (wantZ - camPos.z) * 0.2;
    camLook.set(tx + fx * 6, 1.5, tz + fz * 6);
  }

  /** The ground point under the screen centre (the crosshair) for aiming. */
  function aimPoint() {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    if (dir.y >= -0.02) {
      return { x: camera.position.x + dir.x * 30, z: camera.position.z + dir.z * 30 };
    }
    const t = (1.2 - camera.position.y) / dir.y;
    return { x: camera.position.x + dir.x * t, z: camera.position.z + dir.z * t };
  }

  /** Paint one frame from the world state. */
  function draw(state) {
    followCamera(state);
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    // Player.
    const p = state.player;
    if (p.onFoot) {
      playerGroup.visible = true;
      playerGroup.position.set(p.x, 0, p.z);
      playerGroup.rotation.y = p.angle;
      // Bob while walking.
      playerGroup.position.y = p.speed > 0.1 ? Math.abs(Math.sin(state.time * 10)) * 0.08 : 0;
    } else {
      playerGroup.visible = false;
    }

    // Cars.
    const seen = new Set();
    for (const car of state.cars) {
      if (!car.active) continue;
      seen.add(car.id);
      const g = carGroup(car);
      g.visible = true;
      g.position.set(car.x, 0, car.z);
      g.rotation.y = car.angle;
    }
    for (const [id, g] of carGroups) {
      if (!seen.has(id)) g.visible = false;
    }

    // Peds.
    for (let i = 0; i < state.peds.length; i += 1) {
      const ped = state.peds[i];
      const g = pedGroup(i);
      if (!ped.active) {
        g.visible = false;
        continue;
      }
      g.visible = true;
      g.children[0].material = pedMat(ped.color);
      g.position.set(ped.x, 0, ped.z);
      if (ped.state === 'down') {
        g.rotation.set(-Math.PI / 2, 0, ped.angle);
        g.position.y = 0.3;
      } else {
        g.rotation.set(0, ped.angle, 0);
        g.position.y = Math.abs(Math.sin(state.time * 6 + i)) * 0.05;
      }
    }

    // Bullets.
    for (let i = 0; i < bulletMeshes.length; i += 1) {
      const b = state.bullets[i];
      const m = bulletMeshes[i];
      if (!b || b.life <= 0) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      m.position.set(b.x, b.y, b.z);
      m.rotation.y = Math.atan2(b.dx, b.dz);
    }

    // Mission beacon.
    if (state.markers.length > 0) {
      const m = state.markers[0];
      beacon.visible = true;
      ring.visible = true;
      beacon.position.set(m.x, 20, m.z);
      ring.position.set(m.x, 0.06, m.z);
      const s = 1 + Math.sin(state.time * 3) * 0.15;
      ring.scale.set(s, s, 1);
    } else {
      beacon.visible = false;
      ring.visible = false;
    }

    renderer.render(scene, camera);
  }

  return { draw, orbit, setShotCamera, aimPoint, yaw: () => cam.yaw };
}
