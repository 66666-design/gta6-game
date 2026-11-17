[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/66666-design/gta6-game/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/66666-design/gta6-game/reward.svg)](https://make.fun/bounty/gta6-01)

# SOLMAR: Streets of Gold

An open-world crime game in the sun-soaked coastal city of Solmar, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). You are Rook, a driver
fresh off the boat with $250 and a name nobody knows. Marisol Vega, the fixer who
runs the plaza, has five jobs for you — and the Solmar police have a wanted system
with a long memory.

## What is in the game

- **A city to drive and walk:** a 7×7-block procedural city on a 60-unit street
  pitch — casino, plaza, safehouse, chop shop, marina and beach on the south edge —
  with traffic that follows the lanes, pedestrians on the sidewalks, palms and lamps.
- **Cars to steal and drive:** arcade physics, car-car bumps, and a steal that
  raises your heat. Your own car is free; everyone else's costs you stars.
- **A wanted level that fights back:** heat from 0–100 across five stars, police
  cars that spawn to match the stars, chase you along the street grid, ram your car
  and bust you when you are cornered and slow.
- **Five story jobs for Marisol Vega:** meet her at the plaza fountain, steal the
  gold sedan, run a package to the casino with a tail on you, take out a crew at
  the marina, and crack the vault in the big score — $100 to $3,000 a job.
- **Combat:** shoot on foot with a crosshair aim; the marina crew shoots back.
- **Feel and polish:** a DOM HUD (cash, health, wanted stars, objective, context
  prompt), a live minimap, title / pause / busted / wasted screens, save to
  localStorage, and synthesized WebAudio sound (engine, siren, gunshots, music) —
  no audio files anywhere.
- **Everything procedural:** the city, the cars, the people and the sound are all
  generated in code. The only vendored file is three.js r168
  (`game/vendor/three.module.min.js`).

## Controls

| Key | Action |
| --- | --- |
| WASD | Move on foot / drive |
| Mouse | Look (pointer lock) |
| Click / F | Shoot |
| E | Interact (enter or steal a car, start a job, hold E to crack the vault) |
| Shift | Run |
| P | Pause |
| M | Mute |

## How to play

Serve it locally with `node serve.ts`, then open http://localhost:8080. No build
step, no network at runtime — the game loads its ES modules and the vendored
three.js from disk.

## Screenshots

Four staged shots, each played forward from the real simulation
(`?shot=chase|street|mission|start`):

1. `1-chase.jpg` — a three-star police chase on the delivery job (the cover).
2. `2-street.jpg` — on foot in the city, meeting Marisol.
3. `3-mission.jpg` — the marina hit: four rivals, the beacon, the sea.
4. `4-start.jpg` — the title screen over the city.

## Layout

```
game/
  index.html          page shell: canvas, HUD DOM, minimap canvas
  src/
    main.js           boot, screens, fixed-step loop, ?shot= mode
    config.js         every tuning number in one place
    random.js         seeded mulberry32
    world.js          state container and the step order
    city.js           procedural city, landmarks, collision helpers
    player.js         on-foot movement, entering and leaving cars
    vehicles.js       arcade car physics, car-car bumps
    traffic.js        lane-following traffic, despawn/respawn
    pedestrians.js    sidewalk walkers, fleeing
    police.js         wanted pursuit on the street grid, busting
    combat.js         bullets, rival return fire
    missions.js       the five jobs for Marisol Vega
    save.js           localStorage save and load
    hud.js            DOM HUD: cash, health, stars, objective, prompts
    minimap.js        2D canvas minimap
    audio.js          WebAudio synth: engine, siren, shots, music
    render.js         three.js scene, follow camera, shot cameras
    shots.js          the staged screenshot scenes
  vendor/
    three.module.min.js   three.js r168, minified ES-module build
```

## License

MIT — see `LICENSE`. SOLMAR, its city and its story are original work; nothing in
it is taken from Rockstar or any commercial game.
