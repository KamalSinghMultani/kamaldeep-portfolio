# Phoenix free-flight milestone - 26 October 2026

- [x] Inspect the actual user-supplied island and phoenix models, rigs and maps.
- [x] Use official REA CLI analysis on public source and record retained evidence.
- [x] Integrate fixed island, original phoenix wing animation, and independent pilot controls.
- [x] Add damped steering/speed/pitch/bank, chase camera, pause, reset, and mobile inputs.
- [x] Add geometry-derived terrain clearance and controller/terrain/asset/release checks.
- [ ] Tune the flight feel with the user's hands-on feedback.
- [ ] Agree on landing/perched/takeoff behavior and select resume landing locations.
- [ ] Add land, read a resume section, and fly-away interactions.

# Quick resume workshop experiment - 26 October 2026

- [x] Research public portfolio source and creator case studies.
- [x] Replace polygon character loops with a real skinned and animated character.
- [x] Add local workshop geometry, lighting, shadows, and a single authored sequence.
- [x] Unify quick-view typography, spacing, buttons, and panels.
- [x] Preserve reduced motion, pause, visibility suspension, and factual content.
- [x] Package local model/modules, credits, and meaningful animation checks.
- [ ] User visual review of the experimental branch before merging to main.

# CI/CD and repository workflow - 26 October 2026

- [x] Automated production build and all interaction, motion, audio, HTML/link/HTTP/PDF checks.
- [x] GitHub Pages deployment after successful validation on `main`.
- [x] Pinned workflow actions, weekly dependency updates, and ignored generated releases.
- [x] Conventional Commit guidance, contribution commands, and rollback documentation.
- [ ] Verify external social-card rendering and choose a custom domain if needed.

# Animated Quick résumé — 25 September 2026

- [x] Six original animated companion scenes and normal scrolling transitions.
- [x] Interactive skill-tool highlights; all factual content remains expanded.
- [x] Continuous city walk, masked workshop sparks, passing architecture and calling-card gesture.
- [x] Reduced motion, pause/resume, hidden/offscreen suspension and mobile layout review.
- [x] Shared résumé/PDF build, rendering/lifecycle tests and local release validation.

# Recruiter-ready finish — 18 September 2026

- [x] Prominent desktop/mobile Quick résumé entry; cinematic experience remains default.
- [x] Ungated résumé page and downloadable single-page PDF in the normal build.
- [x] Tutorial progress retained across quick/cinematic navigation; coach updates preserve reading scroll.
- [x] Mobile reading space, touch controls, keyboard focus, and quick-page anchor fixes.
- [x] Scene rendering capped and local performance counters added without changing timeline semantics.
- [x] Forward/reverse scene staging review, navigation/tutorial/audio checks, and PDF visual/text/link verification.
- [x] Production output prepared in `dist/site/` and served locally.
- [ ] Add real project demo recordings and repository-specific links when available.
- [ ] Choose a custom domain if needed and verify external social-card rendering; GitHub Pages is automated by the CI/CD workflow above.

The remaining historical checklists below describe earlier iterations.

---

# Current direction — Red Dot (10 September 2026)

The eleven-scene script replaces the single-alley sequence. Implemented:

- [x] Five approved résumé acts and 33 explicit story beats.
- [x] Original authored bedroom, bank, street, car, garage, rooftop and city art.
- [x] Reversible camera wipes, vehicle paths, fight poses, gunshot, destruction and money effects.
- [x] Independent rain, room activity, wipers, gutter leaks and ambient motion.
- [x] Résumé interactions advance the act; explicit controls cover every beat.
- [x] Beat-aware fragment links, browser Back and immediate retargeting.
- [x] Desktop film/reading split and phone film above scrollable details.
- [x] Reduced motion, pause, hidden-page suspension and optional synthesized sound.
- [x] Timeline, drawing and navigation checks; desktop and mobile browser review.
- [ ] User review of the full story's art, choreography and pacing.

The current files and exact scene mapping are documented in
[Red Dot storyboard](design/RED-DOT-STORYBOARD.md). Older checklists below
are historical and do not describe the current implementation.

---

# Portfolio motion plan

> **9 September 2026: visual direction superseded.** The user rejected the generated
> artwork and current presentation. The proposed replacement is documented in
> [Game-menu rebuild plan](design/GAME-MENU-REBUILD-PLAN.md). The checklist below
> records the earlier implementation; it does not indicate visual approval.

## Implemented game-menu pass

- [x] Persistent slanted menu and separate content stage on desktop.
- [x] Mobile menu screen with full-width section detail views and Back to menu.
- [x] Five live sections matching the approved concepts, with plain-language subtitles.
- [x] Profile dossier; project chapters; experience timeline; skills with related labs; contact card.
- [x] Nine project chapters across AD Infrastructure, HiveMind, and FlexiFit.
- [x] Both experience roles, including a labelled illustrative support workflow.
- [x] Cancellable scene transitions, staggered content entrances, and persistent artwork motion.
- [x] Browser history, deep links, keyboard menu selection, and modal focus handling.
- [x] Original artwork without flags, crests, logos, or seal-like emblems.
- [x] Motion starts from the system setting, with an explicit site override.
- [x] Automated control and navigation checks, including rapid interrupted navigation.
- [ ] User review of the new visual pass and motion timing in desktop and mobile browsers.

The site implementation is in `site/game-menu.css` and `site/game-menu.js`.
`site/index.src.html` retains the original content and data as a fallback.
`site/duality.js` supplies the shared lens effect. Build with `python site/build.py`.
Run `node tools/check-game-menu.cjs` and `node tools/check-duality.cjs` for checks.
The original preview concepts remain in `design/section-concepts-v1/`.

The plan below records the initial phases. Most of Parts 2 and 3 are now implemented;
real project recordings, screenshots, and final visual review remain follow-up work.

## Part 1 — Layout and lenticular artwork

- [x] Recompose the opening screen around a prominent anime collector card.
- [x] Create aligned Kakashi / Obito portraits for a two-identity lens effect.
- [x] Add angle-driven lens strips, perspective, foil and a moving reflection.
- [x] Keep text and navigation stable while the artwork reacts to the pointer.
- [x] Provide a touch/keyboard slider and direct identity selection.
- [x] Respect reduced motion, with a manual motion-off control.
- [x] Preserve a CSS fallback when WebGL is unavailable.
- [ ] User review of the layout and physical hologram feel.

## Part 2 — Animated project stories

- Start with the Active Directory project and its existing diagram.
- Add Problem, My Approach, and Result chapters with short explanations.
- Animate the technical flow: sites, domain controllers, replication, OU policy,
  and verification. Show evidence that exists; never fabricate output or metrics.
- Reuse the chapter pattern for HiveMind and FlexiFit.
- Include Next, Back, Replay, a readable overview, and reduced-motion states.

## Part 3 — Experience stories and polish

- Turn the two experience cards into real buttons with illustrated walkthroughs.
- Separate documented work from representative process illustrations.
- Fix the existing lab overlay's inside-click dismissal behavior.
- Review keyboard focus, mobile diagrams, copy density, and loading behavior.
- Add project demo clips when available.

## Where Part 1 lives

`site/index.src.html` contains the hero markup and existing portfolio.
`site/duality.css` and `site/duality.js` contain its layout and lens implementation.
`site/build.py` inlines these into `site/index.html`.
`site/media/duality-atlas.png` is the two-panel texture atlas and must ship beside
the built page. It is intentionally external so it can be cached separately.

The existing canvas artboards and their build remain separate. Parts 2 and 3 are
planned; the current implementation completes the first visual pass of Part 1.
