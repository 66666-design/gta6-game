// Cars: arcade kinematics on the ground plane. Every car carries its own throttle and
// steering, set by whoever controls it (the player's input, traffic, or the police);
// stepVehicles applies the same physics to all of them, then resolves car-car bumps.
import { CAR, CITY, PALETTE } from './config.js';
import { collideCircle, dist2, randomStreetPoint } from './city.js';

let nextId = 1;

/** Create a car in the world. Without x/z it spawns on a random street. */
export function createCar(state, spec) {
  const rng = spec.random || state.random || Math.random;
  const p = spec.x !== undefined ? { x: spec.x, z: spec.z } : randomStreetPoint(rng);
  const car = {
    id: nextId,
    x: p.x,
    z: p.z,
    angle: spec.angle !== undefined ? spec.angle : 0,
    speed: 0,
    throttle: 0,
    steer: 0,
    targetSpeed: CAR.trafficSpeed,
    color: spec.color !== undefined ? spec.color : PALETTE.car[Math.floor(rng() * PALETTE.car.length)],
    kind: spec.kind || 'traffic',
    active: true,
    health: CAR.health,
    driver: null,
    // Traffic state: which street it is on, which way, which lane, next turn point.
    axis: 'x',
    dir: 1,
    lane: 3.5,
    wpX: 0,
    wpZ: 0,
    stuck: 0,
  };
  nextId += 1;
  state.cars.push(car);
  return car;
}

/** One physics step for a single car: steering, accel, friction, walls, and the road. */
function moveCar(state, car, dt) {
  const speedSign = car.speed >= 0 ? 1 : -1;
  const grip = Math.min(1, Math.abs(car.speed) / 8);
  car.angle += car.steer * CAR.turnRate * grip * speedSign * dt;
  car.speed += car.throttle * CAR.accel * dt;
  // Rolling resistance and the brake.
  if (car.throttle === 0) car.speed -= car.speed * 1.2 * dt;
  if (car.throttle < 0 && car.speed > 0) car.speed += car.throttle * CAR.brake * dt;
  const max = car.kind === 'police' ? CAR.policeSpeed : CAR.maxSpeed;
  if (car.speed > max) car.speed = max;
  if (car.speed < -CAR.reverseMax) car.speed = -CAR.reverseMax;
  if (Math.abs(car.speed) < 0.05 && car.throttle === 0) car.speed = 0;

  const fx = Math.sin(car.angle);
  const fz = Math.cos(car.angle);
  let nx = car.x + fx * car.speed * dt;
  let nz = car.z + fz * car.speed * dt;
  // Lateral drift bleeds off: arcade grip, not a sim.
  const fixed = collideCircle(state.city, nx, nz, CAR.radius);
  if (fixed.x !== nx || fixed.z !== nz) {
    // Hit a wall: kill the speed along the wall and bounce a little.
    if (fixed.x !== nx) car.speed *= 0.4;
    if (fixed.z !== nz) car.speed *= 0.4;
  }
  car.x = fixed.x;
  car.z = fixed.z;
}

export function stepVehicles(state, dt, actions) {
  // The player's car answers the input.
  if (state.player.car && state.player.car.active) {
    const car = state.player.car;
    car.throttle = actions.throttle || 0;
    car.steer = actions.steer || 0;
  }
  for (const car of state.cars) {
    if (!car.active) continue;
    moveCar(state, car, dt);
  }
  // Car-car bumps: push overlapping cars apart (cheap pairwise pass, ~20 cars).
  const cars = state.cars;
  for (let i = 0; i < cars.length; i += 1) {
    const a = cars[i];
    if (!a.active) continue;
    for (let j = i + 1; j < cars.length; j += 1) {
      const b = cars[j];
      if (!b.active) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d2 = dx * dx + dz * dz;
      const min = (CAR.radius + CAR.radius) * 0.9;
      if (d2 >= min * min || d2 < 0.0001) continue;
      const d = Math.sqrt(d2);
      const push = (min - d) / 2;
      const ux = dx / d;
      const uz = dz / d;
      a.x -= ux * push;
      a.z -= uz * push;
      b.x += ux * push;
      b.z += uz * push;
      a.speed *= 0.7;
      b.speed *= 0.7;
    }
  }
  return 0;
}

/** Damage a car; a wrecked player car ejects its driver on foot. */
export function damageCar(state, car, amount) {
  car.health -= amount;
  if (car.health > 0) return;
  car.active = false;
  car.health = 0;
  if (state.player.car === car) {
    state.player.car = null;
    state.player.onFoot = true;
    state.player.x = car.x;
    state.player.z = car.z;
  }
}
