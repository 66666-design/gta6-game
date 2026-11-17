// Every tuning number in one place. Solmar is a 7x7-block coastal city on a 60-unit
// street pitch; the marina and beach sit on its south edge. All world units are metres,
// all angles radians, all speeds metres per second. The simulation runs in fixed 1/60 s
// steps whatever the display's rate, so a seeded run is reproducible.

export const STEP = 1 / 60;

/** City geometry: streets run both ways on a 60-unit pitch; blocks are 46 wide. */
export const CITY = {
  pitch: 60,
  roadW: 14,
  blockW: 46,
  blocks: 7,
  half: 210, // outermost street centre
  bound: 235, // playable edge (fence)
  streets: [-210, -150, -90, -30, 30, 90, 150, 210],
};

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 9.5,
  radius: 0.7,
  health: 100,
  turnSpeed: 9,
};

export const CAR = {
  accel: 16,
  brake: 26,
  reverseMax: 9,
  maxSpeed: 30,
  trafficSpeed: 11,
  policeSpeed: 38,
  turnRate: 2.4,
  grip: 6,
  radius: 1.6,
  length: 4.4,
  width: 2,
  health: 100,
};

export const TRAFFIC = { count: 14, spawnDist: 120, despawnDist: 260 };
export const PEDS = { count: 22, walkSpeed: 1.6, fleeSpeed: 4.5 };

export const POLICE = {
  maxCars: 5,
  spawnDist: 70,
  ramDamage: 12,
  bustRange: 4,
  bustTime: 3,
  sirenRange: 120,
};

/** Heat 0-100; stars are thresholds. Heat decays only while no police unit is near. */
export const WANTED = {
  stars: [0, 12, 32, 55, 78, 92],
  decay: 2.2,
  decayDelay: 6,
  stealHeat: 16,
  shotHeat: 8,
  killHeat: 18,
  missionHeat: 20,
};

export const COMBAT = {
  range: 55,
  damage: 34,
  rivalHealth: 100,
  rivalDamage: 9,
  rivalRange: 30,
  fireInterval: 0.45,
  bulletSpeed: 90,
  ammo: Infinity,
};

export const MISSIONS = {
  rewards: [100, 400, 800, 1200, 3000],
  vaultTime: 10,
};

/** Sun-soaked Solmar palette: warm stucco, terracotta, pastel, deep sea. */
export const PALETTE = {
  sky: 0x8ec8e8,
  fog: 0xa8d0e8,
  sun: 0xfff2d0,
  ground: 0x9a8f7a,
  road: 0x3a3f46,
  roadLine: 0xe8d44d,
  sidewalk: 0xb8ab90,
  sand: 0xe8d8a8,
  sea: 0x2e7fa8,
  building: [0xe8dcc8, 0xd8b89a, 0xf0e0c0, 0xc8a888, 0xe0c8a8, 0xd0b090, 0xead9b8, 0xcfa07a],
  casino: 0xd4af37,
  palmTrunk: 0x8a6a48,
  palmLeaf: 0x3f8f4f,
  car: [0xc0392b, 0x2980b9, 0xf1c40f, 0x7f8c8d, 0x8e44ad, 0x16a085, 0xe67e22, 0x2c3e50],
  police: 0x1a3a6b,
  player: 0x2ecc71,
  rival: 0x8e2f2f,
  marker: 0xf2c94c,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the save is kept between visits (this browser only). */
export const SAVE_KEY = 'solmar.save.v1';

export const GAME_TITLE = 'SOLMAR';
export const GAME_SUBTITLE = 'Streets of Gold';

/** The default seed: the same seed always rebuilds the same Solmar. */
export const DEFAULT_SEED = 1337;
