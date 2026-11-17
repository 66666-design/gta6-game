// The wanted level's enforcers: police cars spawn to match the stars, chase the player
// along the street grid (a straight line would run them into buildings), and bust them
// when they are cornered and slow. Heat itself lives on the world state; this module
// only reads it and writes the bust flag.
import { CAR, CITY, POLICE } from './config.js';
import { dist2, nearestStreetCoord, randomStreetPoint } from './city.js';
import { createCar, damageCar } from './vehicles.js';

/** Angle difference wrapped to [-PI, PI]. */
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Put a police car onto the road grid from its spawn point, heading at the player. */
function initPursuit(state, car) {
  const p = state.player;
  const sx = nearestStreetCoord(car.x);
  const sz = nearestStreetCoord(car.z);
  if (Math.abs(car.x - sx) < Math.abs(car.z - sz)) {
    // On a vertical street: drives along z.
    car.axis = 'z';
    car.x = sx + (car.x < sx ? -3.5 : 3.5);
    car.dir = (p.z - car.z) >= 0 ? 1 : -1;
    car.angle = car.dir > 0 ? 0 : Math.PI;
  } else {
    // On a horizontal street: drives along x.
    car.axis = 'x';
    car.z = sz + (car.z < sz ? -3.5 : 3.5);
    car.dir = (p.x - car.x) >= 0 ? 1 : -1;
    car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  car.lane = car.axis === 'x' ? car.z : car.x;
  pickWaypoint(state, car);
}

/** The next intersection ahead on the car's street. */
function pickWaypoint(state, car) {
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
    next = car.dir > 0 ? CITY.half : -CITY.half;
  }
  if (car.axis === 'x') {
    car.wpX = next;
    car.wpZ = car.lane;
  } else {
    car.wpX = car.lane;
    car.wpZ = next;
  }
}

/**
 * At an intersection, pick the heading (straight, or either turn) whose next block is
 * closest to the player in Manhattan distance — greedy grid pursuit.
 */
function chooseTurn(state, car) {
  const p = state.player;
  const options = [
    { axis: car.axis, dir: car.dir },
    { axis: car.axis === 'x' ? 'z' : 'x', dir: 1 },
    { axis: car.axis === 'x' ? 'z' : 'x', dir: -1 },
  ];
  let best = options[0];
  let bestD = Infinity;
  for (const opt of options) {
    const nx = opt.axis === 'x' ? car.x + opt.dir * 60 : car.x;
    const nz = opt.axis === 'z' ? car.z + opt.dir * 60 : car.z;
    const d = Math.abs(nx - p.x) + Math.abs(nz - p.z);
    if (d < bestD - 1) {
      bestD = d;
      best = opt;
    }
  }
  if (best.axis !== car.axis) {
    car.axis = best.axis;
    car.dir = best.dir;
    const cross = nearestStreetCoord(car.axis === 'x' ? car.x : car.z);
    if (car.axis === 'x') {
      car.z = cross + (car.z < cross ? -3.5 : 3.5);
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      car.x = cross + (car.x < cross ? -3.5 : 3.5);
      car.angle = car.dir > 0 ? 0 : Math.PI;
    }
    car.lane = car.axis === 'x' ? car.z : car.x;
  } else {
    car.dir = best.dir;
    car.angle = car.axis === 'x'
      ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2)
      : (car.dir > 0 ? 0 : Math.PI);
  }
  pickWaypoint(state, car);
}

export function stepPolice(state, dt) {
  const p = state.player;
  const random = state.random;
  const want = Math.min(state.wanted, POLICE.maxCars);
  let have = 0;
  for (const car of state.cars) if (car.kind === 'police' && car.active) have += 1;

  // Spawn up to the wanted level; clear them when the heat is off.
  if (state.wanted > 0 && have < want) {
    for (let tries = 0; tries < 6 && have < want; tries += 1) {
      const q = randomStreetPoint(random);
      if (dist2(q.x, q.z, p.x, p.z) < 1600) continue; // at least 40 away
      if (dist2(q.x, q.z, p.x, p.z) > POLICE.spawnDist * POLICE.spawnDist * 4) continue;
      // Spread the units out: two cars spawning on top of each other just collide.
      let crowded = false;
      for (const other of state.cars) {
        if (other.kind === 'police' && other.active && dist2(q.x, q.z, other.x, other.z) < 400) {
          crowded = true;
          break;
        }
      }
      if (crowded) continue;
      const car = createCar(state, { kind: 'police', x: q.x, z: q.z, color: 0x1a3a6b, random });
      car.targetSpeed = CAR.policeSpeed;
      initPursuit(state, car);
      have += 1;
    }
  } else if (state.wanted === 0) {
    for (const car of state.cars) {
      if (car.kind === 'police') car.active = false;
    }
  }

  // Pursuit: on the grid from a distance, straight at the player up close.
  let nearest = Infinity;
  for (const car of state.cars) {
    if (car.kind !== 'police' || !car.active) continue;
    const d = dist2(car.x, car.z, p.x, p.z);
    if (d < nearest) nearest = d;
    // Ram: a police car touching the player's car damages it.
    if (p.car && d < (CAR.radius + CAR.radius) * (CAR.radius + CAR.radius)) {
      damageCar(state, p.car, POLICE.ramDamage * dt);
    }
    if (d < 25 * 25) {
      // Close in: steer straight at the player.
      const wantAngle = Math.atan2(p.x - car.x, p.z - car.z);
      car.steer = Math.max(-1, Math.min(1, angleDiff(wantAngle, car.angle) * 2));
      car.throttle = 1;
    } else {
      // Grid pursuit: drive to the next intersection, then turn toward the player.
      if (dist2(car.x, car.z, car.wpX, car.wpZ) < 49) chooseTurn(state, car);
      const wantAngle = Math.atan2(car.wpX - car.x, car.wpZ - car.z);
      car.steer = Math.max(-1, Math.min(1, angleDiff(wantAngle, car.angle) * 1.5));
      car.throttle = 1;
    }
    // Stuck against a wall: reverse out, then carry on.
    if (car.speed < 1.5) {
      car.stuck = (car.stuck || 0) + dt;
      if (car.stuck > 1) {
        car.throttle = -1;
        car.steer = 1;
        if (car.stuck > 1.6) car.stuck = 0;
      }
    } else {
      car.stuck = 0;
    }
  }

  // Bust: a police car close by while the player is slow (on foot or crawling).
  const playerSpeed = p.onFoot ? p.speed : (p.car ? Math.abs(p.car.speed) : 0);
  if (state.wanted > 0 && nearest < POLICE.bustRange * POLICE.bustRange && playerSpeed < 2) {
    state.bustTimer = (state.bustTimer || 0) + dt;
    if (state.bustTimer > POLICE.bustTime) {
      state.busted = true;
      state.bustTimer = 0;
    }
  } else {
    state.bustTimer = 0;
  }
  return 0;
}
