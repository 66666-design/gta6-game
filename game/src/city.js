// Solmar itself: a procedural city on the street grid, built once from the seeded RNG.
// Blocks hold 1-4 buildings each; a few blocks are reserved for landmarks (casino, plaza,
// safehouse, chop shop, marina). Everything here is data — render.js draws it, and the
// collision helpers keep cars, peds and the player on the roads and out of the walls.
import { CITY, PALETTE } from './config.js';

const { pitch, streets, blocks } = CITY;
const HALF_BLOCK = CITY.blockW / 2;

/** Block centres along one axis: -180, -120, -60, 0, 60, 120, 180. */
export function blockCentres() {
  const out = [];
  for (let i = 0; i < blocks; i += 1) out.push(-180 + i * pitch);
  return out;
}

/** Landmark blocks, keyed by grid position (bx, bz in block indices 0..6). */
const LANDMARKS = {
  '3,1': 'casino', // centre-north: the golden casino
  '3,3': 'plaza', // dead centre: fountain plaza, no buildings
  '0,6': 'safehouse', // south-west: Rook's safehouse
  '6,3': 'chopshop', // east edge: the chop shop warehouse
};

function blockCentre(i) {
  return -180 + i * pitch;
}

/**
 * Build the city. Returns buildings (AABBs with height and colour), palms, lamps,
 * landmark rectangles, the marina (water + piers, south of the grid) and the beach.
 */
export function createCity(random) {
  const buildings = [];
  const palms = [];
  const lamps = [];
  const landmarks = {};

  for (let bx = 0; bx < blocks; bx += 1) {
    for (let bz = 0; bz < blocks; bz += 1) {
      const cx = blockCentre(bx);
      const cz = blockCentre(bz);
      const kind = LANDMARKS[`${bx},${bz}`];
      if (kind === 'plaza') {
        landmarks.plaza = { x: cx, z: cz, half: HALF_BLOCK };
        for (let p = 0; p < 4; p += 1) {
          palms.push({ x: cx + (p % 2 === 0 ? -14 : 14), z: cz + (p < 2 ? -14 : 14) });
        }
        continue;
      }
      if (kind === 'casino') {
        landmarks.casino = { x: cx, z: cz, half: HALF_BLOCK };
        buildings.push({ x: cx, z: cz, hx: 20, hz: 16, h: 34, color: PALETTE.casino, landmark: 'casino' });
        continue;
      }
      if (kind === 'safehouse') {
        landmarks.safehouse = { x: cx, z: cz, half: HALF_BLOCK };
        buildings.push({ x: cx - 8, z: cz, hx: 9, hz: 8, h: 9, color: 0x7fb069, landmark: 'safehouse' });
        buildings.push({ x: cx + 10, z: cz + 6, hx: 7, hz: 6, h: 6, color: 0x6a994e, landmark: 'safehouse' });
        continue;
      }
      if (kind === 'chopshop') {
        landmarks.chopshop = { x: cx, z: cz, half: HALF_BLOCK };
        buildings.push({ x: cx, z: cz, hx: 18, hz: 14, h: 12, color: 0x5d6d7e, landmark: 'chopshop' });
        continue;
      }
      // Ordinary block: 1-4 buildings on a 2x2 sub-grid, heights 8-38.
      const count = 1 + Math.floor(random() * 4);
      const slots = [-11, 11];
      let placed = 0;
      for (const sx of slots) {
        for (const sz of slots) {
          if (placed >= count) break;
          if (random() < 0.25) continue;
          const w = 9 + random() * 7;
          const d = 9 + random() * 7;
          buildings.push({
            x: cx + sx + (random() - 0.5) * 4,
            z: cz + sz + (random() - 0.5) * 4,
            hx: w / 2,
            hz: d / 2,
            h: 8 + random() * 30,
            color: PALETTE.building[Math.floor(random() * PALETTE.building.length)],
          });
          placed += 1;
        }
        if (placed >= count) break;
      }
      if (random() < 0.5) palms.push({ x: cx + (random() - 0.5) * 30, z: cz + (random() - 0.5) * 30 });
    }
  }

  // Marina and beach: south of the grid, past the last street.
  landmarks.marina = { x: 0, z: 252, half: 60 };
  landmarks.beach = { x: 0, z: 228, half: 110 };
  landmarks.docks = { x: -40, z: 246, half: 30 };

  // Street lamps at every intersection corner (two per corner, deterministic).
  for (const sx of streets) {
    for (const sz of streets) {
      lamps.push({ x: sx + 8, z: sz + 8 });
      lamps.push({ x: sx - 8, z: sz - 8 });
    }
  }

  return { buildings, palms, lamps, landmarks };
}

/** Push a circle (x, z, radius) out of every building AABB it overlaps; also clamp to the fence. */
export function collideCircle(city, x, z, r) {
  for (let i = 0; i < city.buildings.length; i += 1) {
    const b = city.buildings[i];
    const nx = Math.max(b.x - b.hx, Math.min(x, b.x + b.hx));
    const nz = Math.max(b.z - b.hz, Math.min(z, b.z + b.hz));
    const dx = x - nx;
    const dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      x = nx + (dx / d) * r;
      z = nz + (dz / d) * r;
    } else {
      // Centre inside the box: push out along the smallest penetration axis.
      const px = b.hx + r - Math.abs(x - b.x);
      const pz = b.hz + r - Math.abs(z - b.z);
      if (px < pz) x = b.x + (x >= b.x ? b.hx + r : -(b.hx + r));
      else z = b.z + (z >= b.z ? b.hz + r : -(b.hz + r));
    }
  }
  const B = CITY.bound;
  x = Math.max(-B, Math.min(B, x));
  z = Math.max(-B, Math.min(B, z));
  return { x, z };
}

/** True when the point is inside a building (used to keep spawns on open ground). */
export function insideBuilding(city, x, z) {
  for (let i = 0; i < city.buildings.length; i += 1) {
    const b = city.buildings[i];
    if (Math.abs(x - b.x) < b.hx + 1 && Math.abs(z - b.z) < b.hz + 1) return true;
  }
  return false;
}

/** Snap a point to the nearest street centre line (traffic lanes live on streets). */
export function nearestStreetCoord(v) {
  let best = streets[0];
  let bestD = Math.abs(v - streets[0]);
  for (let i = 1; i < streets.length; i += 1) {
    const d = Math.abs(v - streets[i]);
    if (d < bestD) {
      bestD = d;
      best = streets[i];
    }
  }
  return best;
}

/** A random point on a random street (for traffic and police spawns). */
export function randomStreetPoint(random) {
  const along = streets[Math.floor(random() * streets.length)];
  const across = -CITY.half + random() * (CITY.half * 2);
  if (random() < 0.5) return { x: along, z: across };
  return { x: across, z: along };
}

/** A random open point on a sidewalk (for pedestrians): just off a street, off buildings. */
export function randomSidewalkPoint(city, random) {
  for (let tries = 0; tries < 20; tries += 1) {
    const p = randomStreetPoint(random);
    const off = (random() < 0.5 ? -1 : 1) * (CITY.roadW / 2 + 1.5);
    const q = Math.abs(p.x - nearestStreetCoord(p.x)) < 0.01
      ? { x: p.x + off, z: p.z }
      : { x: p.x, z: p.z + off };
    if (!insideBuilding(city, q.x, q.z)) return q;
  }
  return { x: 0, z: 30 };
}

/** Straight-line distance on the ground plane. */
export function dist2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}
