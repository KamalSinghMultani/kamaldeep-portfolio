# Phoenix free flight

This is the first playable flight milestone on `experiment/portfolio-minigame`.
It uses the exact `island.glb` and `phoenix_bird.glb` supplied by the user, with
their original geometry, texture maps, and source animations preserved in the
asset files. Both creator credits are visible in the experience.

## Run

```powershell
python -m pip install -r requirements-dev.txt
python site/build.py
python -m http.server 8767 --bind 127.0.0.1 --directory dist/site
```

Open http://127.0.0.1:8767/flight.html and choose **Take flight**.

- **W / S**: forward/backward; **A / D**: sideways.
- **Left / Right arrows**: turn in place or while moving.
- **Space / C**, or **Up / Down arrows**: straight up/down.
- **Shift**: move faster; **X**: stop and cancel a trick.
- **Q / E**: roll left/right while continuing to steer.
- **L**: a vertical loop, available when its complete route has clearance.
  Start it while moving forward in a straight line. It follows its route for
  3.2 seconds; **C / Down** or **X** cancels it.
- **P / Escape**: pause; **R**: return to the starting position.
- **F**, or **Island view**: hold flight and inspect the island. Drag or use
  arrow keys to orbit; scroll to zoom. **Follow phoenix** returns to flight.
- Canvas dragging turns/climbs. The touch stick moves forward/back and turns;
  coarse-pointer devices also have
  climb/descent buttons, a held boost button, and roll/loop buttons.

The bird starts in a stationary hover. No key means no translation. Up/down
alone changes only world height, including immediately after forward movement.
Released axes stop immediately; held axes accelerate smoothly. Turning alone
changes facing without moving the bird. Pitch/bank never steer translation.
Only combined movement commands produce diagonal travel, with their combined
speed normalized. Rolls/loops are explicit optional maneuvers. The camera
tracks the pilot rather than the animated wing/body joints. The sky's distant
boundary limits outward movement; the visitor chooses the return direction.
Descending input immediately stops upward travel, even while visual pitch eases
through level. Obstacles can stop or slide the body, but never trigger an automatic
climb. A blocked descent stays blocked until the visitor turns or climbs clear.

## Model integration

- `phoenix-island.mjs` owns model loading, scene presentation, and inputs.
- `phoenix-flight-core.mjs` owns numerically tested, frame-rate-independent flight.
- `phoenix-input.mjs` maps independent keyboard/touch commands to movement axes.
- `phoenix-collision.mjs` spatially indexes the selected solid meshes and sweeps
  a body sphere continuously against real faces, edges, and vertices. Openings
  and undersides retain their actual geometry. Camera sweeps stop at the first
  obstruction and shorten the follow arm instead of lifting above a heightfield.
- `phoenix-camera.mjs` follows body translation immediately and damps its orbit
  and focus offsets. Tricks leave the horizon steady.
- `phoenix-model.mjs` shares the exact asset transforms with model/world checks.
  It removes the imported body's translational flap bob while retaining the
  supplied wing, tail, and joint animation.
- `phoenix-terrain.mjs` is retained as an earlier heightfield experiment. The
  flight runtime no longer uses it.
- The authored island presentation/turntable animation is not played. The island
  remains stationary while the visitor controls the phoenix.
- The phoenix's supplied `Take 001` clip drives its real 89-joint skeleton.
  Flight position, yaw, pitch, and bank belong to an independent parent group.
- Resize, pause, hidden-tab, blur, and model-loading failures have explicit paths.
  The quick resume remains accessible without using the flight experience.

The exact bounds, axes, original texture properties, and animation findings are
in [ASSET-INSPECTION.md](ASSET-INSPECTION.md). Actual REA CLI commands, retained
evidence, and source-derived architecture findings are in
[REA-RESEARCH.md](REA-RESEARCH.md).

## Verification and limits

Run `python tools/check.py` after building. Flight checks compare frame rates and
cover input reversal, collisions, bounds, tricks, pause, and reset. Collision tests
cover arches, undersides, corners, narrow passages, and continuous face/edge/vertex
hits. Model tests advance the actual skeleton through descending/turning/rolling
poses and verify its body stays anchored. Whole-island checks use the actual GLB
triangles. Asset checks inspect the shipped rig/embedded resources; release checks
also serve the modules and assets via HTTP.

Collision uses a 1.2-unit sphere around the phoenix's body; wing tips and selected
decorative foliage remain approximate. It supports openings large enough for the
body, although the wings may visually overlap narrow openings. There is no deep
rock teleport recovery; normal movement uses continuous sweeps from a clear spawn.
This is an arcade flight controller to tune through hands-on feedback.

The user's next planned interaction remains: free flight, land at a resume
destination, read the section, and choose **Fly away**. That landing/read/takeoff
loop is not implemented in this milestone. The provided bird has no separate
landing, perched, or takeoff clips; its transition and landing locations should
be agreed with the user before adding that behavior.

Measured landmark proposals and landing-space limitations are in
[ISLAND-LANDINGS.md](ISLAND-LANDINGS.md). No resume section is assigned yet.
