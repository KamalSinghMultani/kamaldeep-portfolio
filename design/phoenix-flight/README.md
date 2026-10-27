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

- **W / Up**: climb; **S / Down**: descend.
- **A / Left** and **D / Right**: turn and bank.
- **Shift**: boost; **Space**: slow flight.
- **P / Escape**: pause; **R**: return to the starting position.
- **F**, or **Island view**: switch between chase camera and island overview.
- Mouse/touch dragging also steers. Coarse-pointer devices have a virtual stick,
  climb/descent buttons, and a held boost button.

The bird cruises without holding a forward key. Steering has acceleration and
damping; release the turn input to settle back to straight flight. The camera
tracks the pilot rather than the animated wing/body joints. The sky's distant
boundary gently turns the bird back toward the island.

## Model integration

- `phoenix-island.mjs` owns model loading, scene presentation, camera, and inputs.
- `phoenix-flight-core.mjs` owns numerically tested, frame-rate-independent flight.
- `phoenix-terrain.mjs` bakes actual world-space triangles into a conservative
  height field once. Controller updates use four-array-read lookups rather than
  raycasting the full model repeatedly.
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

Run `python tools/check.py` after building. Flight checks compare the controller
at 30/60/120/144 Hz and cover steering, boost/brake, pause, terrain/altitude/bounds,
and reset. Terrain tests cover world transforms, indexed/nonindexed geometry,
narrow ledges, and conservative clearance. Asset checks inspect the real shipped
GLBs and their rig/embedded resources; the release check also serves them via HTTP.

The terrain field is an upper-surface approximation. It avoids penetrating the
island, but does not support flight through arches or under overhangs. Wing-tip
and foliage-side collisions remain approximate. This is an initial flight
controller to tune through user feedback, not a full aerodynamic simulation.

The user's next planned interaction remains: free flight, land at a resume
destination, read the section, and choose **Fly away**. That landing/read/takeoff
loop is not implemented in this milestone. The provided bird has no separate
landing, perched, or takeoff clips; its transition and landing locations should
be agreed with the user before adding that behavior.
