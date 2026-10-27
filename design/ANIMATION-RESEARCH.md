# Quick resume animation study

## References inspected

- [Bruno Simon's portfolio source](https://github.com/brunosimon/folio-2025),
  including the README's game-loop order and package manifest: authored Blender
  assets, a controlled update/render pipeline, and separate animation, lighting,
  physics, and interaction concerns. The takeaway here is a tangible miniature
  with a single clock and purpose, rather than adding physics to a resume.
- [Podium's creator case study](https://tympanus.net/codrops/2026/06/23/podium-building-a-website-where-running-becomes-storytelling/):
  a consistent motion language, restrained transitions, and letting the actual
  content carry the visual sequence. Applied here through one hero scene and
  quieter, consistent factual sections.
- [Clay Boan's creator case study](https://tympanus.net/codrops/2025/10/14/the-underdogs-crown-clay-boans-3d-playground-of-design-motion-and-gsap-magic/):
  artwork is designed as animatable parts before code orchestrates it. Adding an
  animation library cannot repair a poorly designed character.
- [Three.js r160 skinning/morph example and source](https://github.com/mrdoob/three.js/blob/r160/examples/webgl_animation_skinning_morph.html):
  named animation clips, AnimationMixer, crossfading, and one-shot emotes. The
  local loader and model use the same r160 version as the existing Three.js.

## What changed

The previous renderer combined a polygon character, IK approximations, moving
street lines, and rain. Numeric tests proved joint lengths and canvas validity,
but did not establish appealing artwork or convincing animation. That distinction
matters: passing geometry tests is not visual approval.

The experiment uses a properly skinned CC0 character with authored walking, idle,
and greeting clips. A 20-second sequence stages an approach, pause, greeting, and
return. Transitions blend over 280 ms; the robot turns before walking. A greeting
temporarily holds the route rather than letting the character slide while waving.

The desk, monitor, keyboard, lamp, server rack, cables, and platform are local
Three.js geometry. Their materials share the same stone, charcoal, and red palette
as the page. Soft directional shadows ground the objects. Pointer movement makes
a small damped camera adjustment; it does not rotate the reading surface.

The remaining five cartoon scenes were removed from the quick view. Consistent
type, buttons, spacing, and panel styles keep the resume readable. All original
project, employment, education, contact, and PDF content remains available.

## Runtime and verification

Motion starts still for reduced-motion preferences. Pause, offscreen suspension,
and hidden-tab suspension preserve the playhead, without replaying elapsed wall
time. Pixel density is capped at 1.5. The character asset is about 464 KB; the
existing local Three.js build is reused, with no runtime CDN dependency.

WebGL/model failure retains the static workshop fallback and the complete resume.
The model, local loader dependencies, license, and module scripts are packaged
with the production output. A single static server runs the experiment.

Tests check the real asset's skeleton/clips and bounds, choreography continuity,
clock behavior, controls, packaged module delivery, links, and PDF. Browser review
checks actual appearance and the rendered result at desktop and narrow widths.
This remains an animation prototype for user review, not a claim of AAA character
production or an original custom character.

## Attribution

[RobotExpressive](https://github.com/mrdoob/three.js/tree/r160/examples/models/gltf/RobotExpressive)
is by Tomás Laulhé (Quaternius), with modifications by Don McCurdy, CC0 1.0.
Three.js and its loader utilities are MIT licensed. Credits are included locally
and linked from the quick resume footer. Reference portfolios informed technique;
their artwork, branding, page designs, and source were not copied into this site.
