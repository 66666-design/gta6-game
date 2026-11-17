// The game's rules and state, with no drawing and no browser in it: the player, the cars,
// the peds, the police, the bullets, the missions and the wanted level. step() advances one
// fixed step and returns what happened as bit flags, so the caller can react without the
// world knowing about screens or sound. Nothing here allocates after createWorld returns.
import { CAR, CITY, COMBAT, MISSIONS, PLAYER, STEP, WANTED } from './config.js';
import { createCity, collideCircle, dist2 } from './city.js';
import { createRandom } from './random.js';
import { createPlayerState, stepPlayer } from './player.js';
import { createCar, stepVehicles } from './vehicles.js';
import { stepTraffic, assignRoute } from './traffic.js';
import { stepPeds } from './pedestrians.js';
import { stepPolice } from './police.js';
import { stepCombat } from './combat.js';
import { updateMissions, startMission } from './missions.js';

export const EVENT_NONE = 0;
export const EVENT_SHOT = 1;
export const EVENT_KILL = 2;
export const EVENT_MISSION = 4;
export const EVENT_WANTED_UP = 8;
export const EVENT_WANTED_DOWN = 16;
export const EVENT_BUSTED = 32;
export const EVENT_WASTED = 64;
export const EVENT_PICKUP = 128;

export function createWorld(seed) {
  const city = createCity(createRandom(seed));
  const state = {
    city,
    seed,
    random: createRandom(seed),
    time: 0,
    money: 250,
    heat: 0,
    wanted: 0,
    lastCrime: -99,
    player: createPlayerState(city),
    cars: [],
    peds: [],
    bullets: [],
    markers: [],
    mission: { index: 0, stage: 0, objective: '', target: null, timer: 0, done: false },
    stats: { earned: 0, carsStolen: 0, shotsFired: 0, kills: 0, missionsDone: 0 },
    camera: { mode: 'follow' },
    busted: false,
    wasted: false,
    toast: '',
    toastUntil: 0,
  };

  function seedTraffic() {
    const random = state.random;
    for (let i = 0; i < 14; i += 1) {
      const car = createCar(state, { kind: 'traffic', random });
      assignRoute(state, car, random);
    }
    for (let i = 0; i < 22; i += 1) {
      const p = { x: 0, z: 0, angle: 0, speed: 0, state: 'walk', color: 0, health: 100, rival: false, shootTimer: 0, active: true };
      state.peds.push(p);
    }
    // Place peds on sidewalks via the pedestrians module's spawner.
    for (const ped of state.peds) {
      const q = randomSidewalk(random);
      ped.x = q.x;
      ped.z = q.z;
      ped.angle = random() * Math.PI * 2;
      ped.color = [0x9b59b6, 0x3498db, 0xe67e22, 0x1abc9c, 0xecf0f1, 0xf39c12][Math.floor(random() * 6)];
    }
  }

  function randomSidewalk(rng) {
    // Local copy of the sidewalk sampler (city.js has the real one; keep this world-local).
    const streets = CITY.streets;
    const along = streets[Math.floor(rng() * streets.length)];
    const across = -CITY.half + rng() * (CITY.half * 2);
    const off = (rng() < 0.5 ? -1 : 1) * (CITY.roadW / 2 + 1.5);
    if (rng() < 0.5) return { x: along + off, z: across };
    return { x: across, z: along + off };
  }

  function reset() {
    // Fresh RNG from the seed: the same seed always replays the same world.
    state.random = createRandom(state.seed);
    state.time = 0;
    state.money = 250;
    state.heat = 0;
    state.wanted = 0;
    state.lastCrime = -99;
    state.cars.length = 0;
    state.peds.length = 0;
    state.bullets.length = 0;
    state.markers.length = 0;
    state.busted = false;
    state.wasted = false;
    state.toast = '';
    state.stats = { earned: 0, carsStolen: 0, shotsFired: 0, kills: 0, missionsDone: 0 };
    state.player.x = 0;
    state.player.z = 30;
    state.player.angle = 0;
    state.player.health = PLAYER.health;
    state.player.onFoot = true;
    state.player.car = null;
    state.player.invulnerable = 0;
    state.mission = { index: 0, stage: 0, objective: '', target: null, timer: 0, done: false };
    state.camera.mode = 'follow';
    seedTraffic();
    startMission(state, 0);
  }

  /**
   * One fixed step. `actions` carries the player's input (move, drive, interact, shoot,
   * aim). Returns the events that happened, as EVENT_* flags.
   */
  function step(dt, actions) {
    let events = EVENT_NONE;
    state.time += dt;
    const before = state.wanted;

    events |= updateMissions(state, dt, actions);
    events |= stepPlayer(state, dt, actions);
    events |= stepVehicles(state, dt, actions);
    events |= stepTraffic(state, dt);
    events |= stepPeds(state, dt);
    events |= stepPolice(state, dt);
    events |= stepCombat(state, dt, actions);

    // Wanted stars follow heat; heat decays once the heat is off for a while.
    if (state.time - state.lastCrime > WANTED.decayDelay) {
      state.heat = Math.max(0, state.heat - WANTED.decay * dt);
    }
    let stars = 0;
    for (let s = 5; s >= 1; s -= 1) {
      if (state.heat >= WANTED.stars[s]) {
        stars = s;
        break;
      }
    }
    state.wanted = stars;
    if (stars > before) events |= EVENT_WANTED_UP;
    if (stars < before) events |= EVENT_WANTED_DOWN;

    if (state.busted) events |= EVENT_BUSTED;
    if (state.wasted) events |= EVENT_WASTED;
    return events;
  }

  reset();
  return { state, city, reset, step };
}
