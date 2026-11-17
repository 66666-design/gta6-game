// The screenshot scenes behind ?shot=start|street|chase|mission. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a small
// autopilot, so the frame is what real gameplay looks like and the same seed always
// gives the same frame. The camera is fixed per shot for a deterministic framing.
import { STEP } from './config.js';
import { createCar } from './vehicles.js';
import { createRival } from './combat.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Frame the camera behind the player (or their car) from the final state. */
function frameBehind(renderer, state) {
  const p = state.player;
  const inCar = !p.onFoot && p.car;
  const x = inCar ? p.car.x : p.x;
  const z = inCar ? p.car.z : p.z;
  const a = inCar ? p.car.angle : p.angle;
  const fx = Math.sin(a);
  const fz = Math.cos(a);
  const dist = inCar ? 13 : 9;
  renderer.setShotCamera(x - fx * dist, 5.5, z - fz * dist, x + fx * 10, 1.5, z + fz * 10);
}

/**
 * Frame the camera ahead of the player, looking back at them and down the road behind
 * them — for a chase, the pursuing police are in the frame behind the player's car.
 */
function frameChase(renderer, state) {
  const p = state.player;
  const car = p.car;
  const a = car.angle;
  const fx = Math.sin(a);
  const fz = Math.cos(a);
  const rx = Math.cos(a);
  const rz = -Math.sin(a);
  renderer.setShotCamera(
    car.x + fx * 16 + rx * 9, 5.5, car.z + fz * 16 + rz * 9,
    car.x - fx * 12, 1.5, car.z - fz * 12
  );
}

function emptyActions() {
  return {
    moveX: 0, moveZ: 0, throttle: 0, steer: 0, run: false,
    interact: false, interactHeld: false, shoot: false, aimX: 0, aimZ: 0,
  };
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * `renderer` is used only to fix the shot camera.
 */
export function stageShot(name, world, renderer) {
  const state = world.state;
  world.reset();

  if (name === 'street') {
    // On foot on a sidewalk, walking east past traffic.
    state.player.x = -60;
    state.player.z = 35;
    state.player.angle = Math.PI / 2;
    for (let i = 0; i < 6 / STEP; i += 1) {
      const actions = emptyActions();
      actions.moveX = 1;
      world.step(STEP, actions);
    }
    frameBehind(renderer, state);
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'chase') {
    // The delivery with a tail: three stars, police in pursuit, driving east.
    state.mission.index = 2;
    state.mission.stage = 1;
    const car = createCar(state, { kind: 'player', x: -180, z: 30, angle: Math.PI / 2, color: 0xc0392b, random: state.random });
    car.driver = 'player';
    state.player.car = car;
    state.player.onFoot = false;
    state.player.x = car.x;
    state.player.z = car.z;
    // High heat: it decays while the police close in, and three stars must survive it.
    state.heat = 78;
    state.lastCrime = state.time;
    // Cruise at 22 m/s: fast enough to read as a chase, slow enough that the police
    // (38 m/s) close in and stay in the frame behind the car.
    for (let i = 0; i < 9 / STEP; i += 1) {
      const actions = emptyActions();
      actions.throttle = car.speed < 22 ? 1 : 0;
      actions.steer = Math.max(-1, Math.min(1, angleDiff(Math.PI / 2, car.angle) * 2));
      world.step(STEP, actions);
    }
    frameChase(renderer, state);
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'mission') {
    // The marina hit: four rivals, the player closing in on foot.
    const L = state.city.landmarks;
    state.mission.index = 3;
    state.mission.stage = 1;
    state.mission.rivalsSpawned = true;
    const spots = [[-14, -8], [10, -12], [16, 6], [-8, 10]];
    for (const [dx, dz] of spots) createRival(state, L.marina.x + dx, L.marina.z + dz);
    state.player.x = 0;
    state.player.z = 224;
    state.player.angle = 0;
    for (let i = 0; i < 3 / STEP; i += 1) {
      const actions = emptyActions();
      actions.moveZ = 1;
      world.step(STEP, actions);
    }
    // High and wide, from behind the player: the player in the foreground, the crew
    // and the marina ahead, the sea behind them.
    renderer.setShotCamera(state.player.x, 14, state.player.z - 26, L.marina.x, 1, L.marina.z);
    return { screen: SCREEN_PLAY, best: 0 };
  }

  // Default (start): an ambient city backdrop under the title screen.
  for (let i = 0; i < 8 / STEP; i += 1) world.step(STEP, emptyActions());
  renderer.setShotCamera(90, 60, 140, 0, 10, -60);
  return { screen: SCREEN_TITLE, best: 0 };
}
