// Boot and the game loop. Screens: title, play, paused, over. The world steps at a fixed
// 60 Hz (the accumulator caps at five steps a frame so a slow frame never spirals),
// the camera orbits on the mouse, and the HUD and minimap are DOM/2D canvas over the
// 3D view. ?shot=name runs a staged screenshot scene instead of the game.
import { GAME_TITLE, STEP, DEFAULT_SEED } from './config.js';
import { createWorld, EVENT_SHOT, EVENT_MISSION, EVENT_BUSTED, EVENT_WASTED } from './world.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createHud } from './hud.js';
import { createMinimap } from './minimap.js';
import { createAudio } from './audio.js';
import { loadSave, saveGame, applySave } from './save.js';
import { startMission } from './missions.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed')) || DEFAULT_SEED;
const shotName = params.get('shot');

const canvas = document.getElementById('game');
const world = createWorld(seed);
// Exposed for debugging and verification (the parent's play-test can read the live state).
window.__solmar = world;
const renderer = createRenderer(canvas, world.state.city);
const hud = createHud();
const minimap = createMinimap(document.getElementById('minimap'), world.state.city);
const audio = createAudio();
const input = createInput(canvas);

let screen = SCREEN_TITLE;
let save = loadSave();
let lastSave = 0;
let acc = 0;
let last = performance.now();

function emptyActions() {
  return {
    moveX: 0, moveZ: 0, throttle: 0, steer: 0, run: false,
    interact: false, interactHeld: false, shoot: false, aimX: 0, aimZ: 0,
  };
}

/** Camera-relative actions from the held keys (WASD, Shift, mouse aim). */
function buildActions(edges) {
  const held = input.held;
  const yaw = renderer.yaw();
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const f = (held.has('KeyW') ? 1 : 0) - (held.has('KeyS') ? 1 : 0);
  const s = (held.has('KeyD') ? 1 : 0) - (held.has('KeyA') ? 1 : 0);
  const p = world.state.player;
  const actions = emptyActions();
  if (p.onFoot) {
    actions.moveX = f * fx + s * rx;
    actions.moveZ = f * fz + s * rz;
    const len = Math.hypot(actions.moveX, actions.moveZ);
    if (len > 1) {
      actions.moveX /= len;
      actions.moveZ /= len;
    }
    actions.run = held.has('ShiftLeft') || held.has('ShiftRight');
  } else {
    actions.throttle = f;
    actions.steer = (held.has('KeyA') ? 1 : 0) - (held.has('KeyD') ? 1 : 0);
  }
  const aim = renderer.aimPoint();
  actions.aimX = aim.x;
  actions.aimZ = aim.z;
  actions.shoot = input.shootHeld();
  actions.interact = edges.interact;
  actions.interactHeld = input.interactHeld();
  return actions;
}

function showTitle() {
  screen = SCREEN_TITLE;
  const lines = [
    'A sun-soaked open-world job in Solmar: steal cars, dodge the police, and run five jobs for Marisol Vega.',
    'WASD — Move / drive    Mouse — Look    Click — Shoot    E — Interact    P — Pause    M — Mute',
  ];
  if (save) {
    lines.push(`You have a save: $${save.money.toLocaleString('en-US')}, job ${save.missionIndex + 1} of 5.`);
    hud.showPanel(GAME_TITLE, lines, 'Space — Continue your save    N — New game');
  } else {
    hud.showPanel(GAME_TITLE, lines, 'Space — Start');
  }
}

function startGame(useSave) {
  world.reset();
  if (useSave && save) {
    applySave(world.state, save);
    startMission(world.state, save.missionIndex);
  }
  hud.hidePanel();
  screen = SCREEN_PLAY;
  audio.start();
  lastSave = world.state.time;
}

function gameOver(kind) {
  const state = world.state;
  saveGame(state);
  screen = 'over';
  audio.busted();
  const lines = [
    kind === 'busted' ? 'The Solmar police caught up with you.' : 'Rook is down. Solmar keeps the gold.',
    `Cash: $${state.money.toLocaleString('en-US')}    Jobs done: ${state.stats.missionsDone}    Earned: $${state.stats.earned.toLocaleString('en-US')}`,
  ];
  hud.showPanel(kind === 'busted' ? 'BUSTED' : 'WASTED', lines, 'Space — Title screen');
}

function handleEvents(events) {
  if (events & EVENT_SHOT) audio.shot();
  if (events & EVENT_MISSION) {
    audio.mission();
    saveGame(world.state);
    lastSave = world.state.time;
  }
  if (events & EVENT_BUSTED) gameOver('busted');
  else if (events & EVENT_WASTED) gameOver('wasted');
}

function stepWorld(dt, actions) {
  acc += dt;
  let steps = 0;
  let events = 0;
  while (acc >= STEP && steps < 5) {
    events |= world.step(STEP, actions);
    acc -= STEP;
    steps += 1;
    // One-shot inputs (interact) fire once per frame, not once per sub-step: the
    // second sub-step would otherwise undo the first (enter a car, then exit it).
    actions.interact = false;
  }
  if (steps === 5) acc = 0;
  return events;
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const edges = input.takeEdges();
  if (edges.mute) {
    const muted = audio.toggleMute();
    world.state.toast = muted ? 'Sound off' : 'Sound on';
    world.state.toastUntil = world.state.time + 2;
  }

  if (screen === SCREEN_TITLE) {
    if (edges.confirm) startGame(!!save);
    else if (edges.newGame) {
      save = null;
      startGame(false);
    }
    stepWorld(dt, emptyActions());
  } else if (screen === SCREEN_PLAY) {
    if (edges.pause) {
      screen = 'paused';
      hud.showPanel('Paused', ['WASD — Move / drive    Mouse — Look    Click — Shoot    E — Interact', 'Progress saves when you finish a job.'], 'P — Resume');
    } else {
      const mouse = input.takeMouse();
      if (mouse.dx || mouse.dy) renderer.orbit(mouse.dx, mouse.dy);
      const actions = buildActions(edges);
      const events = stepWorld(dt, actions);
      handleEvents(events);
      const p = world.state.player;
      const speed = p.onFoot ? p.speed : p.car ? p.car.speed : 0;
      audio.engine(speed, !p.onFoot);
      audio.siren(world.state.wanted > 0);
      if (world.state.time - lastSave > 30) {
        saveGame(world.state);
        lastSave = world.state.time;
      }
    }
  } else if (screen === 'paused') {
    if (edges.pause || edges.confirm) {
      screen = SCREEN_PLAY;
      hud.hidePanel();
    }
  } else if (screen === 'over') {
    if (edges.confirm) {
      world.reset();
      save = loadSave();
      showTitle();
    }
    stepWorld(dt, emptyActions());
  }

  hud.update(world.state, screen);
  minimap.draw(world.state);
  renderer.draw(world.state);
}

// First gesture starts the audio context; a click in play also takes pointer lock.
canvas.addEventListener('click', () => {
  audio.start();
  if (screen === SCREEN_PLAY && !input.isLocked()) input.requestLock();
});
window.addEventListener('keydown', () => audio.start(), { once: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === SCREEN_PLAY) {
    screen = 'paused';
    hud.showPanel('Paused', ['The tab was hidden, so the game paused.'], 'P — Resume');
  }
});

if (shotName) {
  // Screenshot mode: stage the scene, paint twice, then signal readiness.
  const result = stageShot(shotName, world, renderer);
  if (result.screen === SCREEN_PLAY) hud.hidePanel();
  else showTitle();
  hud.update(world.state, result.screen);
  minimap.draw(world.state);
  renderer.draw(world.state);
  requestAnimationFrame(() => {
    renderer.draw(world.state);
    window.__shotReady = true;
  });
} else {
  showTitle();
  requestAnimationFrame(frame);
}
