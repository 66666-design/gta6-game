// Ambient traffic: cars that drive the street grid in lanes, turn at intersections, and
// slow for the car ahead. They despawn far from the player and respawn nearby, so the
// streets always feel alive without simulating the whole city.
import { CAR, CITY, TRAFFIC } from './config.js';
import { dist2, nearestStreetCoord, randomStreetPoint } from './city.js';
import { createCar } from './vehicles.js';

/** Pick a new route for a traffic car: a street, a direction, a lane, and its next turn. */
export function assignRoute(state, car, random) {
  const along = CITY.streets[Math.floor(random() * CITY.streets.length)];
  const across = -CITY.half + random() * (CITY.half * 2);
  if (random() < 0.5) {
    car.axis = 'x';
    car.dir = random() < 0.5 ? 1 : -1;
    car.z = along + (random() < 0.5 ? -3.5 : 3.5);
    car.x = across;
    car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    car.axis = 'z';
    car.dir = random() < 0.5 ? 1 : -1;
    car.x = along + (random() < 0.5 ? -3.5 : 3.5);
    car.z = across;
    car.angle = car.dir > 0 ? 0 : Math.PI;
  }
  car.lane = car.axis === 'x' ? car.z : car.x;
  pickNextTurn(state, car, random);
}

/** The next intersection ahead on this street: the turn point. */
function pickNextTurn(state, car, random) {
  const pos = car.axis === 'x' ? car.x : car.z;
  let next = null;
  for (const s of CITY.streets) {
    const ahead = (s - pos) * car.dir;
    if (ahead > 12 && (next === null || ahead < (next - pos) * car.dir)) next = s;
  }
  if (next === null) {
    // End of the road: turn around at the edge.
    car.dir *= -1;
    car.angle += Math.PI;
    next = car.axis === 'x' ? (car.dir > 0 ? CITY.half : -CITY.half) : (car.dir > 0 ? CITY.half : -CITY.half);
  }
  if (car.axis === 'x') {
    car.wpX = next;
    car.wpZ = car.lane;
  } else {
    car.wpX = car.lane;
    car.wpZ = next;
  }
}

/** Angle difference wrapped to [-PI, PI]. */
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function stepTraffic(state, dt) {
  const p = state.player;
  const random = state.random;
  for (const car of state.cars) {
    if (car.kind !== 'traffic' || !car.active) continue;
    // Too far away: recycle it onto a street near the player.
    if (dist2(car.x, car.z, p.x, p.z) > TRAFFIC.despawnDist * TRAFFIC.despawnDist) {
      const q = randomStreetPoint(random);
      car.x = q.x;
      car.z = q.z;
      car.speed = 0;
      assignRoute(state, car, random);
      continue;
    }
    // Reached the turn point: pick a new street at the intersection.
    const wpD = dist2(car.x, car.z, car.wpX, car.wpZ);
    if (wpD < 49) {
      // 70% turn onto the crossing street, else carry straight on.
      if (random() < 0.7) {
        const cross = nearestStreetCoord(car.axis === 'x' ? car.x : car.z);
        if (car.axis === 'x') {
          car.axis = 'z';
          car.x = cross + (random() < 0.5 ? -3.5 : 3.5);
          car.dir = random() < 0.5 ? 1 : -1;
          car.angle = car.dir > 0 ? 0 : Math.PI;
        } else {
          car.axis = 'x';
          car.z = cross + (random() < 0.5 ? -3.5 : 3.5);
          car.dir = random() < 0.5 ? 1 : -1;
          car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        }
        car.lane = car.axis === 'x' ? car.z : car.x;
      }
      pickNextTurn(state, car, random);
    }
    // Steer toward the waypoint; slow for the car ahead.
    const want = Math.atan2(car.wpX - car.x, car.wpZ - car.z);
    const diff = angleDiff(want, car.angle);
    car.steer = Math.max(-1, Math.min(1, diff * 1.5));
    let target = CAR.trafficSpeed;
    for (const other of state.cars) {
      if (other === car || !other.active) continue;
      const dx = other.x - car.x;
      const dz = other.z - car.z;
      const ahead = dx * Math.sin(car.angle) + dz * Math.cos(car.angle);
      const side = Math.abs(dx * Math.cos(car.angle) - dz * Math.sin(car.angle));
      if (ahead > 0 && ahead < 12 && side < 3) {
        target = 0;
        break;
      }
    }
    car.throttle = car.speed < target ? 0.8 : 0;
    if (car.speed > target + 2) car.throttle = -0.5;
  }
  return 0;
}
