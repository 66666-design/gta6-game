// The save: money, mission progress and the player's position, in localStorage under a
// namespaced key. Best-effort — a private window refuses storage and the run then lasts
// this visit only. Loading is the title screen's Continue choice.
import { SAVE_KEY } from './config.js';

/** Load the save (or null when there is none or storage is off). */
export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.money !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

/** Write the save from the live world state. */
export function saveGame(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: state.money,
      missionIndex: state.mission.index,
      missionsDone: state.stats.missionsDone,
      earned: state.stats.earned,
      player: { x: state.player.x, z: state.player.z },
      savedAt: Date.now(),
    }));
  } catch {
    // Storage off: the run lasts this visit only.
  }
}

/** Apply a loaded save to a fresh world (money, mission, position). */
export function applySave(state, data) {
  state.money = data.money;
  state.stats.earned = data.earned || 0;
  state.stats.missionsDone = data.missionsDone || 0;
  if (data.player) {
    state.player.x = data.player.x;
    state.player.z = data.player.z;
  }
}
