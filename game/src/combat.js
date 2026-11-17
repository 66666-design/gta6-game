// Shooting: the player's hitscan-style bullets (with travel and a tracer) and the rival
// crew's return fire. Bullets are a fixed pool; nothing here allocates per shot.
import { CAR, COMBAT, WANTED } from './config.js';
import { dist2, insideBuilding } from './city.js';
import { damageCar } from './vehicles.js';

export const EVENT_SHOT = 1;
export const EVENT_KILL = 2;

/** Spawn a rival crew member at (x, z): a ped that shoots back. */
export function createRival(state, x, z) {
  const ped = {
    x, z,
    angle: Math.atan2(state.player.x - x, state.player.z - z),
    speed: 0,
    state: 'walk',
    color: 0x8e2f2f,
    health: COMBAT.rivalHealth,
    rival: true,
    shootTimer: 1 + state.random() * 2,
    active: true,
  };
  state.peds.push(ped);
  return ped;
}

function fireBullet(state, from, x, y, z, tx, tz) {
  let b = null;
  for (const item of state.bullets) {
    if (item.life <= 0) {
      b = item;
      break;
    }
  }
  if (!b) {
    if (state.bullets.length >= 32) return;
    b = { x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0, speed: 0, life: 0, damage: 0, from: '' };
    state.bullets.push(b);
  }
  const dx = tx - x;
  const dz = tz - z;
  const len = Math.hypot(dx, dz) || 1;
  b.x = x;
  b.y = y;
  b.z = z;
  b.dx = dx / len;
  b.dy = 0;
  b.dz = dz / len;
  b.speed = COMBAT.bulletSpeed;
  b.life = 1.5;
  b.damage = from === 'player' ? COMBAT.damage : COMBAT.rivalDamage;
  b.from = from;
}

export function stepCombat(state, dt, actions) {
  let events = 0;
  const p = state.player;
  const random = state.random;
  if (p.fireTimer === undefined) p.fireTimer = 0;
  if (p.fireTimer > 0) p.fireTimer -= dt;

  // The player's shot: from the player (or their car) toward the aim point.
  if (actions.shoot && p.fireTimer <= 0 && p.health > 0) {
    const ox = p.onFoot ? p.x : (p.car ? p.car.x : p.x);
    const oz = p.onFoot ? p.z : (p.car ? p.car.z : p.z);
    fireBullet(state, 'player', ox, 1.2, oz, actions.aimX ?? ox + 10, actions.aimZ ?? oz + 10);
    p.fireTimer = COMBAT.fireInterval;
    state.stats.shotsFired += 1;
    state.heat = Math.min(100, state.heat + WANTED.shotHeat);
    state.lastCrime = state.time;
    state.lastShotAt = { x: ox, z: oz, t: state.time };
    events |= EVENT_SHOT;
  }

  // Rival return fire: in range, on a timer, with a spread.
  for (const ped of state.peds) {
    if (!ped.active || !ped.rival || ped.state === 'down') continue;
    ped.shootTimer -= dt;
    const d = dist2(ped.x, ped.z, p.x, p.z);
    if (ped.shootTimer <= 0 && d < COMBAT.rivalRange * COMBAT.rivalRange && p.health > 0) {
      const spread = (random() - 0.5) * 6;
      fireBullet(state, 'rival', ped.x, 1.2, ped.z, p.x + spread, p.z + spread);
      ped.shootTimer = COMBAT.fireInterval * (1.6 + random());
    }
  }

  // Bullets fly, hit walls, peds, cars, and the player.
  for (const b of state.bullets) {
    if (b.life <= 0) continue;
    b.x += b.dx * b.speed * dt;
    b.z += b.dz * b.speed * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    if (insideBuilding(state.city, b.x, b.z)) {
      b.life = 0;
      continue;
    }
    if (b.from === 'player') {
      let hit = false;
      for (const ped of state.peds) {
        if (!ped.active || ped.state === 'down') continue;
        if (dist2(b.x, b.z, ped.x, ped.z) < 1.4) {
          ped.health -= b.damage;
          if (ped.health <= 0) {
            ped.state = 'down';
            ped.active = true; // a downed ped stays visible, lying still
            state.stats.kills += 1;
            state.heat = Math.min(100, state.heat + WANTED.killHeat);
            state.lastCrime = state.time;
            events |= EVENT_KILL;
          }
          b.life = 0;
          hit = true;
          break;
        }
      }
      if (hit) continue;
      for (const car of state.cars) {
        if (!car.active) continue;
        if (dist2(b.x, b.z, car.x, car.z) < CAR.radius * CAR.radius + 1) {
          damageCar(state, car, b.damage);
          b.life = 0;
          break;
        }
      }
    } else {
      // Rival bullet: the player, or their car.
      if (p.health > 0 && dist2(b.x, b.z, p.x, p.z) < 1.2) {
        p.health -= b.damage;
        p.lastDamage = state.time;
        p.invulnerable = 0.4;
        if (p.health <= 0) {
          p.health = 0;
          state.wasted = true;
        }
        b.life = 0;
      } else if (p.car && dist2(b.x, b.z, p.car.x, p.car.z) < CAR.radius * CAR.radius + 1) {
        damageCar(state, p.car, b.damage);
        b.life = 0;
      }
    }
  }
  return events;
}
