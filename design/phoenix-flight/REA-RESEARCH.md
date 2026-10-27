# REA study for the phoenix flight prototype

## What actually ran

The official [morluto/rea](https://github.com/morluto/rea) package was used through
its CLI, not merely read as a reference. No MCP registration, global installation,
Codex configuration, native reverse-engineering provider, or target execution was
needed.

- Package: `rea-agents@6.8.0` from npm; its package metadata identifies the official
  `morluto/rea` repository.
- Runtime: portable official Node.js `v26.12.1`, downloaded from `nodejs.org` and
  SHA-256 checked against that release's `SHASUMS256.txt`. The host's Node 22.16.0
  did not meet this REA version's engine requirement.
- Task-local tooling cache:
  `C:/Users/kamal/.cache/codex-tools/phoenix-rea/`.
- Target: a sparse, read-only research checkout of
  [Bruno Simon's folio-2025](https://github.com/brunosimon/folio-2025), commit
  `41046b57eeed8d156d9c3fd7fa259900baef7816`, selecting `sources/Game/`.

Using the portable Node executable and REA's `scripts/rea.mjs` entry point, these
commands completed with exit code 0:

```text
capabilities --json
analyze-javascript-application <research-checkout>/sources/Game --json
inspect-analysis-view <task-cache>/folio-view-request.json --json
```

The projection request used `source.kind = evidence-file`, the saved
`folio-evidence.json`, and `view.kind = summary`, following the official
[CLI documentation](https://github.com/morluto/rea/blob/main/docs/cli.md).

## Evidence retained outside the application repository

All paths below are relative to the task-local tooling cache:

| File | Purpose |
| --- | --- |
| `capabilities.json` | The actual CLI capability and package-identity result |
| `folio-evidence.json` | Complete static analysis, 119,034,980 bytes |
| `folio-analysis-stderr.txt` | REA analysis progress records |
| `folio-view-request.json` | Request for a bounded summary projection |
| `folio-summary.json` | REA's 11,189-byte summary projection |

Parent evidence ID:
`ev_cac91d5e2175772380a7f6aba1232aebf8a3c94fc3f725dae6c8f4ed6e2e627d`.

Summary evidence ID:
`ev_ebd655c04f833df0f943abec265031c618f0ebc0f63a5fd83d56707582787258`.

REA parsed all 118 selected JavaScript files (995,483 text bytes), with 143,175 AST
nodes visited, 2,308 findings, and zero syntax parse failures. This is a bounded
source study, not a full checkout or live-behavior analysis. Application graph
coverage is partial; semantic coverage remains unknown, with 33,234 semantic
unknowns retained. Static imports and event relationships do not prove runtime
execution. No complete-reconstruction claim is made.

## Useful patterns, checked against the referenced source

- The update sequence separates input, physical movement, player state, camera,
  visual detail, and rendering. See the
  [documented loop order](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/readme.md#game-loop).
- The camera tracks a separate smoothed focus position, then derives its offset
  and look target; zoom also eases rather than jumping. Camera roll has its own
  damping. See
  [View.js, lines 637-724](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/View.js#L637-L724).
- Visual transforms follow the physical vehicle, while smaller details have
  their own smoothing. See
  [VisualVehicle.js, lines 418-457](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/World/VisualVehicle.js#L418-L457).
- Asset loading uses explicit loader types, per-path caching, and a completion
  boundary before dependent scene construction. See
  [ResourcesLoader.js](https://github.com/brunosimon/folio-2025/blob/41046b57eeed8d156d9c3fd7fa259900baef7816/sources/Game/ResourcesLoader.js).

## Adaptation to this project

These are our implementation decisions, not claims about Bruno's bird controls:

1. Use the provided phoenix's authored wing clip through `AnimationMixer`; move
   an outer flight group so free-flight orientation does not overwrite the rig.
2. Keep steering, speed, pitch, and banking in a testable flight controller.
   Smooth acceleration and turning independently of render frame rate.
3. Update flight state, bird transform, clip animation, chase camera, then render.
   The camera follows a damped position and forward-looking focus, rather than
   being rigidly parented to every small wing/body motion.
4. Discard accumulated wall-clock time after pause or hidden-tab suspension.
5. Measure the imported island and enforce terrain clearance before adding
   landing sites. Preserve each imported model's material and animation intent.

Only architectural techniques were studied. Bruno's artwork, vehicle code,
environment geometry, and branding were not copied into this portfolio.
