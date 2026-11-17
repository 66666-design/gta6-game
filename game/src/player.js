// The player on foot: camera-relative movement, entering and leaving cars, and the
// interact key. Driving itself lives in vehicles.js; missions read the interact key.
import { CAR, PLAYER, WANTED } from './config.js';
import { collideCircle, dist2 } from './city.js';

export function createPlayerState() {
  return {
    x: 0,
    z: 30,
    angle: 0,
    speed: 0,
    health: PLAYER.health,
    onFoot: true,
    car: null,
    invulnerable: 0,
    lastDamage: -99,
  };
}

/** Nearest car within `range` of the player (any kind), or null. */
function nearestCar(state, range) {
  let best = null;
  let bestD = range * range;
  for (const car of state.cars) {
    if (!car.active) continue;
    const d = dist2(state.player.x, state.player.z, car.x, car.z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function stepPlayer(state, dt, actions) {
  const p = state.player;
  if (p.invulnerable > 0) p.invulnerable = Math.max(0, p.invulnerable - dt);
  // Slow health regen once the heat has been off a while.
  if (state.time - p.lastDamage > 8 && p.health > 0 && p.health < PLAYER.health) {
    p.health = Math.min(PLAYER.health, p.health + 2 * dt);
  }

  if (actions.interact) {
    if (p.onFoot) {
      const car = nearestCar(state, 3.2);
      if (car) {
        // Stealing a car that is not yours is a crime; your own car is free.
        if (car.kind !== 'player') {
          state.heat = Math.min(100, state.heat + WANTED.stealHeat);
          state.lastCrime = state.time;
          state.stats.carsStolen += 1;
          car.kind = 'player';
          state.toast = 'Car stolen — the cops noticed.';
          state.toastUntil = state.time + 3;
        }
        car.driver = 'player';
        p.car = car;
        p.onFoot = false;
        p.x = car.x;
        p.z = car.z;
      }
    } else if (p.car) {
      const car = p.car;
      car.driver = null;
      car.throttle = 0;
      p.car = null;
      p.onFoot = true;
      // Step out on the driver's side.
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 2.4;
      p.z = car.z - Math.sin(car.angle + Math.PI / 2) * 2.4;
      const fixed = collideCircle(state.city, p.x, p.z, PLAYER.radius);
      p.x = fixed.x;
      p.z = fixed.z;
    }
  }

  if (!p.onFoot) {
    // Riding: the player's position is the car's, so the police, the minimap and the
    // missions all see where the player really is (a stale on-foot position would
    // send the whole wanted system to the wrong end of the city).
    if (p.car) {
      p.x = p.car.x;
      p.z = p.car.z;
      p.angle = p.car.angle;
      p.speed = Math.abs(p.car.speed);
    }
    return 0;
  }

  const mx = actions.moveX || 0;
  const mz = actions.moveZ || 0;
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    const speed = actions.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const nx = mx / Math.max(1, len);
    const nz = mz / Math.max(1, len);
    p.x += nx * speed * dt;
    p.z += nz * speed * dt;
    p.angle = Math.atan2(nx, nz);
    p.speed = speed;
  } else {
    p.speed = 0;
  }
  const fixed = collideCircle(state.city, p.x, p.z, PLAYER.radius);
  p.x = fixed.x;
  p.z = fixed.z;
  return 0;
}
