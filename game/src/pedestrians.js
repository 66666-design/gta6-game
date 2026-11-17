// Pedestrians: sidewalk walkers who turn at walls and flee from gunfire and fast cars.
// Rivals (mission crew) are peds too, but their shooting is combat.js's job.
import { CITY, PEDS } from './config.js';
import { collideCircle, dist2 } from './city.js';

export function stepPeds(state, dt) {
  const p = state.player;
  const random = state.random;
  for (const ped of state.peds) {
    if (!ped.active || ped.state === 'down') continue;
    // Flee when a shot rang out nearby or a car is bearing down.
    let fleeX = 0;
    let fleeZ = 0;
    let fleeing = false;
    if (state.lastShotAt && state.time - state.lastShotAt.t < 2) {
      const d = dist2(ped.x, ped.z, state.lastShotAt.x, state.lastShotAt.z);
      if (d < 900) {
        fleeX = ped.x - state.lastShotAt.x;
        fleeZ = ped.z - state.lastShotAt.z;
        fleeing = true;
      }
    }
    if (!fleeing) {
      for (const car of state.cars) {
        if (!car.active || Math.abs(car.speed) < 4) continue;
        const d = dist2(ped.x, ped.z, car.x, car.z);
        if (d < 64) {
          fleeX = ped.x - car.x;
          fleeZ = ped.z - car.z;
          fleeing = true;
          break;
        }
      }
    }
    if (fleeing) {
      const len = Math.hypot(fleeX, fleeZ) || 1;
      ped.angle = Math.atan2(fleeX / len, fleeZ / len);
      ped.speed = PEDS.fleeSpeed;
      ped.state = 'flee';
    } else if (ped.state === 'flee') {
      ped.state = 'walk';
      ped.speed = PEDS.walkSpeed;
    }
    if (ped.state === 'walk' && ped.speed === 0) ped.speed = PEDS.walkSpeed;
    const nx = ped.x + Math.sin(ped.angle) * ped.speed * dt;
    const nz = ped.z + Math.cos(ped.angle) * ped.speed * dt;
    const fixed = collideCircle(state.city, nx, nz, 0.6);
    // Hit a wall: turn onto a new heading.
    if ((fixed.x !== nx || fixed.z !== nz) && ped.state === 'walk') {
      ped.angle += (random() < 0.5 ? -1 : 1) * (Math.PI / 2 + (random() - 0.5) * 0.6);
    }
    ped.x = fixed.x;
    ped.z = fixed.z;
    // Stay in the city; wander back if at the fence.
    if (Math.abs(ped.x) > CITY.bound - 4 || Math.abs(ped.z) > CITY.bound - 4) {
      ped.angle = Math.atan2(-ped.x, -ped.z);
    }
  }
  return 0;
}
