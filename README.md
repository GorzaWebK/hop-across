# Hop Across

An original, endless "hop across the lanes" arcade game for the browser, built with
[Three.js](https://threejs.org/) and low-poly voxel graphics.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 (also printed on your LAN for phone testing)
```

Production build (static files in `dist/`, open from any web server):

```bash
npm run build
npm run preview
```

## Controls

| Action        | Desktop          | Mobile             |
| ------------- | ---------------- | ------------------ |
| Hop forward   | ↑ / W            | Tap or swipe up    |
| Hop back      | ↓ / S            | Swipe down         |
| Hop left/right| ← → / A D        | Swipe left / right |
| Start / retry | Space / Enter    | Tap                |

## Why Vite instead of a CDN script tag?

Three.js is installed from npm and bundled by Vite. That keeps the code in clean ES modules
with real imports, gives instant hot-reload while developing, and produces a single small
static bundle that works offline and doesn't depend on a third-party CDN being reachable.

## Code layout

```
src/
  main.js        game bootstrap, state machine, main loop
  config.js      tuning constants + small helpers
  voxel.js       box-list -> merged, vertex-colored geometry (1 draw call per model, cached)
  models.js      world models: ground strips, trees, rocks, vehicles...
  characters.js  playable characters
  lanes.js       lane types: grass, road, river (logs / lily pads), railway
  events.js      tiny event bus (gameplay -> audio/effects)
  world.js       procedural lane generator, spawning ahead / recycling behind
  player.js      grid hopping, input queue, squash & stretch, death states
  camera.js      fixed isometric orthographic camera rig (auto-scrolls forward)
  hunter.js      the sky hunter that snatches players who lag behind
  input.js       keyboard + touch (tap / swipe)
  ui.js          DOM HUD and screens
  storage.js     localStorage wrapped in try/catch
```
