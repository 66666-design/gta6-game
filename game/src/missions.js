// The story: five jobs for the fixer Marisol Vega, from a first meeting to the casino
// vault. Each mission is a small stage machine: go somewhere, do something, get paid.
// The module sets the HUD objective and the beacon marker the minimap shows.
import { MISSIONS, WANTED } from './config.js';
import { dist2 } from './city.js';
import { createCar } from './vehicles.js';
import { createRival } from './combat.js';

export const EVENT_MISSION = 4;

const NAMES = [
  'Meet Marisol',
  'Hot Wheels',
  'The Drop',
  'Payback at the Marina',
  'The Big Score',
];

function near(state, x, z, r) {
  return dist2(state.player.x, state.player.z, x, z) < r * r;
}

function setObjective(state, text, target) {
  state.mission.objective = text;
  state.markers = target ? [{ x: target.x, z: target.z, label: target.label || '', color: 0xf2c94c }] : [];
}

function completeMission(state) {
  const idx = state.mission.index;
  const reward = MISSIONS.rewards[idx];
  state.money += reward;
  state.stats.earned += reward;
  state.stats.missionsDone += 1;
  state.toast = `${NAMES[idx]} complete — $${reward}.`;
  state.toastUntil = state.time + 4;
  state.mission.index += 1;
  state.mission.stage = 0;
  state.mission.timer = 0;
  if (state.mission.index < NAMES.length) {
    startMission(state, state.mission.index);
    return EVENT_MISSION;
  }
  state.mission.done = true;
  state.mission.objective = 'Solmar is yours. Free roam — enjoy the city.';
  state.markers = [];
  return EVENT_MISSION;
}

/** Begin a mission: set its first stage and spawn what it needs. */
export function startMission(state, index) {
  const m = state.mission;
  m.index = index;
  m.stage = 0;
  m.timer = 0;
  m.done = false;
  if (index === 1) {
    // The gold sedan to steal, parked on a side street.
    const car = createCar(state, { kind: 'target', x: -90, z: 33.5, angle: Math.PI / 2, color: 0xf2c94c, random: state.random });
    car.targetSpeed = 0;
    m.targetCar = car;
  }
  if (index === 3) {
    // The rivals appear when the player reaches the marina (stage 0's onDone).
    m.rivalsSpawned = false;
  }
}

export function updateMissions(state, dt, actions) {
  const m = state.mission;
  if (m.done) return 0;
  const idx = m.index;
  const L = state.city.landmarks;

  switch (idx) {
    case 0: {
      // Meet Marisol at the plaza.
      setObjective(state, 'Meet Marisol at the plaza fountain', { x: L.plaza.x, z: L.plaza.z, label: 'Marisol' });
      if (near(state, L.plaza.x, L.plaza.z, 6)) {
        state.toast = 'Marisol: "You drive? Good. I have work."';
        state.toastUntil = state.time + 4;
        return completeMission(state);
      }
      return 0;
    }
    case 1: {
      if (m.stage === 0) {
        setObjective(state, 'Steal the gold sedan on Marisol\'s mark', { x: -90, z: 33.5, label: 'Gold sedan' });
        if (state.player.car === m.targetCar) {
          m.stage = 1;
          state.toast = 'Nice. Now bring it to the chop shop, east side.';
          state.toastUntil = state.time + 4;
        }
        return 0;
      }
      setObjective(state, 'Deliver the sedan to the chop shop', { x: L.chopshop.x, z: L.chopshop.z, label: 'Chop shop' });
      if (near(state, L.chopshop.x, L.chopshop.z, 8) && state.player.car === m.targetCar) {
        if (m.targetCar) m.targetCar.active = false;
        state.player.car = null;
        state.player.onFoot = true;
        return completeMission(state);
      }
      return 0;
    }
    case 2: {
      if (m.stage === 0) {
        setObjective(state, 'Pick up the package at the docks (E)', { x: L.docks.x, z: L.docks.z, label: 'Package' });
        if (near(state, L.docks.x, L.docks.z, 5) && actions.interact) {
          m.stage = 1;
          state.heat = Math.max(state.heat, 32);
          state.lastCrime = state.time;
          state.toast = 'A tail is on you — deliver it to the casino, fast.';
          state.toastUntil = state.time + 4;
        }
        return 0;
      }
      setObjective(state, 'Deliver the package to the casino', { x: L.casino.x, z: L.casino.z, label: 'Casino' });
      if (near(state, L.casino.x, L.casino.z, 8)) return completeMission(state);
      return 0;
    }
    case 3: {
      if (m.stage === 0) {
        setObjective(state, 'Reach the marina — the crew is waiting', { x: L.marina.x, z: L.marina.z, label: 'Marina' });
        if (near(state, L.marina.x, L.marina.z, 10)) {
          m.stage = 1;
          m.rivalsSpawned = true;
          const spots = [[-14, -8], [10, -12], [16, 6], [-8, 10]];
          for (const [dx, dz] of spots) createRival(state, L.marina.x + dx, L.marina.z + dz);
          state.toast = 'Four of them. Make it count.';
          state.toastUntil = state.time + 4;
        }
        return 0;
      }
      const left = state.peds.filter((ped) => ped.rival && ped.state !== 'down').length;
      setObjective(state, `Take out the crew at the marina (${4 - left}/4 down)`, { x: L.marina.x, z: L.marina.z, label: 'Crew' });
      if (m.rivalsSpawned && left === 0) return completeMission(state);
      return 0;
    }
    case 4: {
      if (m.stage === 0) {
        setObjective(state, 'Reach the casino vault', { x: L.casino.x, z: L.casino.z, label: 'Vault' });
        if (near(state, L.casino.x, L.casino.z, 6)) {
          m.stage = 1;
          m.timer = 0;
        }
        return 0;
      }
      if (m.stage === 1) {
        setObjective(state, `Crack the vault — hold E (${Math.ceil(MISSIONS.vaultTime - m.timer)}s)`, { x: L.casino.x, z: L.casino.z, label: 'Vault' });
        if (near(state, L.casino.x, L.casino.z, 6) && actions.interactHeld) {
          m.timer += dt;
          if (m.timer >= MISSIONS.vaultTime) {
            m.stage = 2;
            state.heat = Math.max(state.heat, 60);
            state.lastCrime = state.time;
            state.toast = 'The alarm is screaming — run to the safehouse!';
            state.toastUntil = state.time + 4;
          }
        }
        return 0;
      }
      setObjective(state, 'Escape to the safehouse, south-west', { x: L.safehouse.x, z: L.safehouse.z, label: 'Safehouse' });
      if (near(state, L.safehouse.x, L.safehouse.z, 8)) return completeMission(state);
      return 0;
    }
    default:
      return 0;
  }
}
