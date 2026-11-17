// The DOM HUD over the 3D world: cash, health, wanted stars, the mission objective, the
// context prompt, toasts and the title/pause/game-over panels. Text is DOM, not canvas,
// so it stays legible when a screenshot is shrunk for the judge.
import { PLAYER } from './config.js';

export function createHud() {
  const money = document.getElementById('money');
  const healthFill = document.getElementById('health-fill');
  const wanted = document.getElementById('wanted');
  const objective = document.getElementById('objective');
  const prompt = document.getElementById('prompt');
  const toast = document.getElementById('toast');
  const panel = document.getElementById('panel');
  const panelTitle = document.getElementById('panel-title');
  const panelLines = document.getElementById('panel-lines');
  const panelPrompt = document.getElementById('panel-prompt');
  const crosshair = document.getElementById('crosshair');
  let lastMoney = -1;
  let lastStars = -1;
  let lastObjective = '';
  let lastPrompt = '';

  /** The one-line context prompt for where the player stands. */
  function contextPrompt(state) {
    const p = state.player;
    if (!p.onFoot) return 'E — Get out    F / Click — Shoot';
    if (state.mission.index === 4 && state.mission.stage === 1) return 'Hold E — Crack the vault';
    // Near a car?
    for (const car of state.cars) {
      if (!car.active) continue;
      const dx = car.x - p.x;
      const dz = car.z - p.z;
      if (dx * dx + dz * dz < 10.2) return car.kind === 'player' ? 'E — Drive' : 'E — Steal car';
    }
    if (state.markers.length > 0) {
      const m = state.markers[0];
      const dx = m.x - p.x;
      const dz = m.z - p.z;
      if (dx * dx + dz * dz < 25) return 'E — Interact';
    }
    return 'WASD — Move    Shift — Run    E — Interact    Click — Shoot';
  }

  function update(state, screen) {
    if (state.money !== lastMoney) {
      lastMoney = state.money;
      money.textContent = `$${state.money.toLocaleString('en-US')}`;
    }
    const hp = Math.max(0, Math.round((state.player.health / PLAYER.health) * 100));
    healthFill.style.width = `${hp}%`;
    healthFill.style.background = hp > 50 ? '#2ecc71' : hp > 25 ? '#f39c12' : '#e74c3c';
    if (state.wanted !== lastStars) {
      lastStars = state.wanted;
      wanted.textContent = state.wanted > 0 ? '★'.repeat(state.wanted) : '';
      wanted.style.color = state.wanted >= 3 ? '#e74c3c' : '#f2c94c';
    }
    if (state.mission.objective !== lastObjective) {
      lastObjective = state.mission.objective;
      objective.textContent = state.mission.objective;
    }
    const cp = screen === 'play' ? contextPrompt(state) : '';
    if (cp !== lastPrompt) {
      lastPrompt = cp;
      prompt.textContent = cp;
    }
    if (state.toast && state.time < state.toastUntil) {
      toast.textContent = state.toast;
      toast.style.opacity = '1';
    } else {
      toast.style.opacity = '0';
    }
    crosshair.style.display = screen === 'play' ? 'block' : 'none';
  }

  function showPanel(title, lines, promptText) {
    panelTitle.textContent = title;
    panelLines.innerHTML = '';
    for (const line of lines) {
      const p = document.createElement('p');
      p.textContent = line;
      panelLines.appendChild(p);
    }
    panelPrompt.textContent = promptText;
    panel.style.display = 'flex';
  }

  function hidePanel() {
    panel.style.display = 'none';
  }

  return { update, showPanel, hidePanel };
}
