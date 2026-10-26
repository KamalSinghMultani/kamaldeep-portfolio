# An interactive résumé with the presence of a game menu

Proposed direction · 9 September 2026 · Planning only

**Confirmed clarification:** the user chose an illustrated environment with a
character performing actions and moving between scenes. A typography-and-objects
only world is not the intended direction. The first review deliverable is a
playable storyboard of the studio-to-project-wall transition, using a drawn
stand-in character. Its room, character appearance, and timing are proposals,
not approved final art. See `STUDIO-STORYBOARD.md` for the current scope.

This supersedes the visual direction in `section-concepts-v1` and the first game-menu pass. The user rejected the generated artwork and the current presentation. The existing site stays unchanged during this planning step.

## Reference and diagnosis

Reference: [Persona 5 Strikers Special Menu/Option Animations (Reupload), Dops Gaming](https://www.youtube.com/watch?v=SGRSXXXqaBc).

Reviewed selected frames and a playback excerpt; this is not a frame-by-frame timing analysis. Useful reference points are the green options composition around 0:10, red character statistics around 0:48, inventory around 1:36, the orange request detail around 2:53, and the blue scene transition around 3:07. These compositions give different activities their own color, framing, and visual subject. The readable selection list remains a clear anchor within the illustration.

The current implementation uses a persistent left menu, a reused portrait, and similar panel entrances. Its navigation works, but changing sections does not substantially change the staging. The generated character and support panels do not meet the user's visual standard. Code checks alone did not establish whether the experience felt right.

The rebuild should make selection, entry, inspection, and return feel like connected actions. Information remains understandable on the first visit.

## Art direction: an illustrated studio with a character

Create a coherent illustrated workspace inhabited by a character: a workbench, nighttime window, project wall, and tool storage. Section selection triggers a character action and a camera move toward the relevant part of the environment. Keep the character, foreground, room, and interface separately animated. Use strong perspective, hard shadows, oversized cropped lettering, and restrained halftone.

The home composition follows the user's sketch: identity at the top, five staggered choices at the lower left, a large scene to the right, and breathing room. A selected item has one unmistakable highlight. Red, black, and warm white form the shared palette; one secondary accent distinguishes each section. Body copy stays horizontal and readable even when its surrounding shapes are angled.

Use simple authored drawings for the storyboard only. The final character and environment require a consistent illustration or stylized 3D asset pipeline, to be chosen after staging review. The character is central to the intended experience. Remove generated portraits and comic panels from the rebuilt experience. No flags, seals, decorative anime screenshots, or generated replacements. Do not mistake the storyboard's stand-in figure for approved character art.

The earlier lenticular idea becomes an optional view of the work: a solid system silhouette reveals its wireframe or connected architecture as the pointer moves. Limit this to a small visual area; provide an explicit “Inside view” control for touch and keyboard. Essential information never depends on finding an angle. Validate this effect after the menu's core motion works.

## Navigation contract

Use the existing names with permanent plain-language subtitles: STATUS / About me, TARGETS / Projects, RECORDS / Experience, ARSENAL / Skills, CONTACT / Get in touch.

Hover or keyboard focus previews a destination without opening it. Click, tap, or Enter opens it immediately. The selected label moves into the section heading position; other choices recede, the scene reframes, and the relevant content appears. Back reverses the spatial direction and restores the previous choice, scroll position, and keyboard focus.

Keep a visible Back control, current location, browser history, and direct section/project URLs. Escape returns one level. Rapid input changes destination cleanly rather than queuing animations. No required intro, unlock sequence, drag gesture, or sound. Provide a direct readable résumé view and print styling; offer a PDF download only when an actual file is available.

## Section treatments

| Section | Game-menu interaction | What the visitor learns |
| --- | --- | --- |
| Status | The workspace frames an identity display; selecting a specialty illuminates related work. | Name, role, location, education, and a short introduction. Use factual labels instead of invented power levels or skill percentages. |
| Targets | A project selector brings the active project's schematic forward. Confirm expands it into a navigable breakdown. | The problem, personal contribution, implementation decisions, and available evidence. |
| Records | A chapter selector moves between the two workplaces. Choosing a responsibility activates a short process diagram. | Employer, role, dates, responsibilities, and documented scope. Illustrative workflows are clearly identified. |
| Arsenal | A tool rack highlights the selected technology and draws connections to actual projects or roles. | What the tool was used for, with links to that work. No implied mastery from arbitrary ratings. |
| Contact | The scene resolves into a simple communication console with large actions. | Email, LinkedIn, GitHub, and a copy-email action with visible feedback. |

For every project and role, the first view contains a useful summary. Deeper animation explains the work; readers can move directly to any step and read all steps without waiting for a sequence.

## First complete interaction: Active Directory

1. Focus TARGETS. The highlight moves immediately; the right-hand scene previews the project's network structure and one-line summary.
2. Confirm. TARGETS travels into the heading, the menu recedes, and project choices arrive as the scene moves closer.
3. Select Active Directory. Its name, purpose, personal contribution, and stack are visible together. Other projects remain easy to reach.
4. Choose “How I built it.” The diagram advances through sites and domain controllers, replication, OU-scoped policy, and verification. Each step has one plain-language explanation; navigation can skip or replay it.
5. Choose “Evidence.” Show existing diagrams and honest descriptions of verification. Add real captures or recordings when available. Do not fabricate terminal output, screenshots, or performance results.
6. Back returns to the project selection with Active Directory still selected, then to the same home-menu choice.

Use the same information structure for HiveMind and FlexiFit, but author their diagrams around their actual implementations. Do not make every section a reskinned project panel.

## Motion specification

These are starting targets for tuning in a browser, not measurements of the video:

- Focus response: roughly 80–120 ms, with a decisive highlight movement and minimal displacement.
- Enter a section: roughly 350–550 ms total. Overlap label movement, foreground wipe, scene movement, and content reveal; avoid a chain of separate waits.
- Change a project or chapter: roughly 180–280 ms. Preserve stable labels and move the relevant visual.
- Back: roughly 250–400 ms, preserving the direction and hierarchy established on entry.
- Idle: small, slow background movement only. Reading surfaces stay still. Pause decorative work when hidden.

Favor a strong initial movement and controlled settling, with occasional small overshoot on the selection indicator. Avoid continuous wobbling, repeated screen flashes, and the same fade-slide on every element. Optional original sound cues come last, default off.

With reduced motion, preserve the selected state and hierarchy using immediate changes or short opacity transitions. Decorative movement, perspective travel, and lenticular animation stop.

## Mobile composition

Design at 390 px alongside desktop from the first prototype; also check 320–360 px and short landscape screens. Home shows large touch targets and a compact scene. Entering a section gives the content the available width with Back and the current location always findable.

Diagram chapters use focused steps with readable labels instead of shrinking the desktop network to fit. Provide at least 44 px touch targets, visible focus, and ordinary scrolling for longer content. Navigation must work without hover, dragging, or device tilt.

## Delivery phases and review gates

1. **Composition and storyboard.** Make desktop/mobile layouts and the six key frames of the Active Directory interaction using real text and vector shapes. Decide hierarchy, visual subject, and transitions before detail styling.
2. **Working motion prototype.** Implement only the home-to-project-to-detail-to-back path. Test interruption, keyboard input, browser Back, touch, and reduced motion. Review the actual moving prototype with the user before spreading the treatment across the site.
3. **Complete the résumé.** Apply the agreed motion language to all five sections with their distinct interactions, factual copy, direct links, readable résumé view, and evidence handling. Retain useful existing data and navigation behavior.
4. **Finish the visual system.** Refine the authored scene, chapter diagrams, typography, optional lenticular reveal, and optional sound. Remove rejected artwork dependencies from the rebuilt site; retain source history separately.
5. **Browser and device review.** Inspect desktop and phone layouts, record representative transitions, and profile performance. Aim for smooth 60 fps on representative devices and simplify expensive effects if necessary. Verify text legibility, contrast, focus order, deep links, and motion settings.

Phase 2 succeeds when a visitor can identify the portfolio owner, open Projects, understand one contribution, inspect how it works, and return without instruction. The user should judge the interaction's feel in motion before the remaining visual work proceeds. A static generated mockup cannot pass this gate.

## Implementation boundaries

Keep the current plain HTML/JavaScript build initially. Introduce explicit menu, section, selection, and chapter state with interruptible transitions and a persistent scene layer. Animate scene geometry separately from semantic HTML content. Prefer transforms, opacity, and simple masks; add rendering complexity only when the prototype demonstrates a need.

Reuse the existing résumé data, project diagrams, hash routing concepts, lab behavior, and motion preference handling where they fit. Replace the repeated panel composition and portrait-led design. The existing automated navigation checks remain useful, but real browser review is required to assess the requested experience.

No runtime files were changed to create this plan. The next deliverable is the first interactive path described above.
