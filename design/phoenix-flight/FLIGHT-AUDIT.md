# Flight correction audit — 28 October 2026

The user reported weak steering, glitches, and downward steering that could still
raise the phoenix. Three parallel agents audited flight, collision, and camera;
the integration was then exercised in the in-app browser.

## Causes and changes

- The previous controller raised target pitch for terrain clearance, overriding
  descent input, and clamped position to an upper terrain surface. Both behaviors
  are removed. The controller sweeps the body against actual 3D triangles. A slope
  response that introduces unrequested ascent blocks that movement instead.
- The previous chase camera independently rose above an upper heightfield. The
  new camera follows body translation immediately, damps its relative orbit and
  focus, and retracts at actual obstructions. Its collision anchor remains inside
  the bird's safe body envelope, including beneath ceilings.
- The source wing clip translates the body root during each flap. Stabilization
  now removes that translation while preserving articulated wings and tail.
- Separate touch pointers could overwrite steering or release another held
  vertical control. Steering now owns its pointer, and held actions are tracked
  individually. Closing credits restores keyboard flight focus.
- Rolls remain steerable. Loops use a real vertical path, prechecked for geometry
  and flight bounds. Descend/slow cancels a loop; interruption eases the exit.
- The final loop review found an instantaneous horizontal reversal on a mid-loop
  cancel. A short tangent-velocity recovery now removes that discontinuity while
  downward input still acts immediately. Shader programs are also warmed before
  enabling the start button to reduce a first-flight compilation hitch.

## Automated coverage

`python site/build.py` then `python tools/check.py` exercises the portfolio and
flight together. The flight-specific tests include:

| Check | Evidence |
| --- | --- |
| Input and maneuvers | Multiple refresh rates, climb/descent reversal, bounds without automatic yaw, boost/slow, rolls, loops, cancellation, pause/reset |
| Collision fixtures | Swept sphere against faces/edges/vertices, undersides, arches, narrow passages, corners, first-hit camera clipping, transformed geometry |
| Animated model | Real supplied skeleton advanced through 600 descent/turn/roll frames; body-anchor drift below 1e-5 world units |
| Actual island | 11 solid meshes, 32,616 triangles; 36 high descents, 36 lower coastal approaches, 36 overhead transects, three maneuvers, cliff-loop rejection |

The actual-island run covers 97,530 simulation steps, 195,157 collision queries,
and 3,751 sampled body-clearance assertions. None of the descending route steps
raised the body. Timings are logged for diagnosis, without machine-dependent
pass/fail thresholds.

Textures are omitted only from the in-memory Node test asset. The geometry,
transforms, skin, animation, and shipped GLBs are unchanged.

## In-app browser observations

Using actual keyboard controls on the rendered page:

- A two-second descent near the island moved body altitude from 78.00 to 59.10;
  camera altitude moved from 84.00 to 65.10.
- After climbing, reversing to descent moved body altitude from 86.85 to 78.62
  and camera altitude from 92.85 to 84.62 over the sampled second.
- A six-second held right turn completed approximately a full circle, with
  altitude remaining 78.00 and the camera following the turn.
- Left roll and vertical loop activated through their real keyboard controls;
  pausing mid-loop preserved the maneuver and resuming continued it.
- On the final cancellation build, descending out of an active loop lowered
  altitude from 93.42 to 91.47 during the sampled exit, without a reset teleport.
- No browser warning or error logs were present during those observations.

These observations verify behavior at sampled moments. They are not a claim that
the flight feel has received the user's approval.

## Limits and next milestone

The body sphere is 1.2 world units. Wing tips and decorative leaf cards do not
have articulated collision shapes. Routes sample the whole island, but do not
exhaust every cave or possible player input. Native multi-touch feel still needs
hands-on device feedback. The controller is arcade flight, with scripted loop
geometry rather than a full aerodynamic simulation.

Resume landing destinations, landing/perch animation, readable sections, and
**Fly away** remain the next interaction milestone.
