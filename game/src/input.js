// Keyboard and mouse. Held keys are read every frame; one-shot presses (interact, pause,
// confirm) are queued as edges and taken once, so a press between two frames is never
// lost and never counted twice. The mouse orbits the camera under pointer lock and fires.

export const KEY = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  interact: ['KeyE'],
  shoot: ['KeyF'],
  confirm: ['Space', 'Enter'],
  pause: ['KeyP', 'Escape'],
  mute: ['KeyM'],
  newGame: ['KeyN'],
};

export function createInput(canvas) {
  const held = new Set();
  let edges = { interact: false, pause: false, confirm: false, mute: false, newGame: false };
  let mouseDX = 0;
  let mouseDY = 0;
  let shootHeld = false;
  let locked = false;

  function codeIn(list, code) {
    return list.indexOf(code) !== -1;
  }

  window.addEventListener('keydown', (event) => {
    if (codeIn(KEY.confirm, event.code)) {
      if (!event.repeat) edges.confirm = true;
    } else if (codeIn(KEY.pause, event.code)) {
      if (!event.repeat) edges.pause = true;
    } else if (codeIn(KEY.interact, event.code)) {
      if (!event.repeat) edges.interact = true;
    } else if (codeIn(KEY.mute, event.code)) {
      if (!event.repeat) edges.mute = true;
    } else if (codeIn(KEY.newGame, event.code)) {
      if (!event.repeat) edges.newGame = true;
    }
    held.add(event.code);
    if (codeIn(KEY.up, event.code) || codeIn(KEY.down, event.code) || codeIn(KEY.left, event.code) || codeIn(KEY.right, event.code) || codeIn(KEY.confirm, event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    shootHeld = false;
  });

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
  });
  document.addEventListener('mousemove', (event) => {
    if (!locked) return;
    mouseDX += event.movementX || 0;
    mouseDY += event.movementY || 0;
  });
  canvas.addEventListener('mousedown', (event) => {
    // The click that takes pointer lock is not a shot; only clicks while locked fire.
    if (event.button === 0 && locked) shootHeld = true;
    if (!locked) {
      try {
        canvas.requestPointerLock();
      } catch {
        // Pointer lock can fail (iframe, permissions): mouse still orbits on drag.
      }
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) shootHeld = false;
  });

  return {
    held,
    /** Mouse movement since the last call (pointer lock only). */
    takeMouse() {
      const out = { dx: mouseDX, dy: mouseDY };
      mouseDX = 0;
      mouseDY = 0;
      return out;
    },
    /** One-shot presses since the last call. */
    takeEdges() {
      const out = edges;
      edges = { interact: false, pause: false, confirm: false, mute: false, newGame: false };
      return out;
    },
    shootHeld() {
      return shootHeld || held.has('KeyF');
    },
    interactHeld() {
      return held.has('KeyE');
    },
    isLocked() {
      return locked;
    },
    requestLock() {
      try {
        canvas.requestPointerLock();
      } catch {
        // Pointer lock can fail (iframe, permissions): the game still plays.
      }
    },
  };
}
