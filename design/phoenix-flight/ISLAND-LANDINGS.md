# Island inspection — 28 October 2026

These are measured locations in the supplied island, not finished landing pads.
Resume assignments remain undecided. The model was examined in the rendered
overview and by transforming its real triangles into the flight world's axes.

| Existing landmark | World X, Y, Z | Finding |
| --- | --- | --- |
| Broad western beach | -98, 2.44, -92 | Strongest natural candidate. Sampled radius 6, height range 1.27, outer slopes up to 7.25°. Still needs a level landing surface. |
| Southern rock terrace | -44, 14.99, 66 | Promising smaller candidate. Sampled radius 4, height range .79. Its 8-unit diameter only slightly exceeds the bird's 7-unit wingspan. |
| Eastern hillside huts | 25, 30.59, 13 | Sloping ground among structures and palms. Choose a dedicated adjacent platform. |
| Two high hillside huts | -50, 80.77, -17 | The measured point identifies the hut area; it lies between/under building footprints. It is not a clear pad. |
| Lighthouse | 85.97, 30.53, -74.18 | Position marks the structure roof, which is too small for the phoenix. Nearby ground is around height 11.3; use an adjacent ledge. |
| Highest rocky spire | -44, 109.5, -45 | Scenic destination requiring an authored platform and edge clearance. Nearby maximum height is 110.51. |

No location has certified continuous wing/foot clearance. Beach/terrace probes
sampled concentric rings and a body sphere; final approach, level pad geometry,
foot contact, wing folding, perched pose, and takeoff still need implementation.
The source phoenix supplies a flight clip but no separate landing/perch clip.

The high spire is not confirmed to be a volcano. The model's separate lava mesh
is below the normalized ocean, so its name alone is not evidence of a visible
volcano.

`island-landmarks.json` retains measurement methods and caveats. Run
`node tools/inspect-island-plan.cjs` to regenerate `island-plan.json`, a top view
of actual ground faces clipped at the ocean surface. The interactive conversation
plan uses this geometry and the measured landmark coordinates.

## Direct-command verification

The user clarified that free flight means no automatic cruise and independent
vertical movement. The new default is stationary hover. Tests cover neutral
hold, every separate axis, release/reversal, yaw in place, combinations, collisions,
and explicitly triggered maneuvers. The updated real-island run passes 97,903
simulation steps and 3,837 sampled clearance checks.

In the in-app browser, Up raised Y from 78.00 to 100.66 while X stayed 64.00 and
Z stayed 155.00. Subsequent neutral observations retained the same position with
zero speed. Forward then Down was also exercised; tests verify that releasing
forward leaves X/Z exactly fixed during the subsequent vertical command.
