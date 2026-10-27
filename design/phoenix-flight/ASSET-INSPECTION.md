# Phoenix and island integration inspection

The supplied files were inspected directly, without changing them. The repeatable
inspector is `python tools/inspect-flight-assets.py`; its default input directory
is the current user's Downloads. The JSON report includes actual transformed
vertices and skinned vertices, embedded image dimensions, materials, and animation
targets. No browser scene was altered by this inspection.

## Island

- File: `island.glb`, 11,960,316 bytes. 22 mesh nodes, 61,963 triangles.
- No required extensions, compressed geometry dependencies, external textures,
  cameras, or skins. Seven embedded textures are 1024 by 1024 pixels; six JPEGs
  and one RGBA PNG. Standard local GLTFLoader is sufficient.
- All geometry already imports into a Y-up scene. The FBX conversion wrappers
  cancel their opposing X-axis rotations; the top wrapper also scales by 0.625.
  Keep those internal wrappers intact and normalize a new external parent.
- **Do not measure the whole scene to choose island scale.** The ocean, clouds,
  moon, and star geometry span roughly 750 source units; solid land spans only
  about 129. Whole-scene normalization would make the actual island very small.
- **Do not play the entire `Base Stack` animation.** It is 38.4000 seconds with
  seven channels. `ISLE_17.position`, `ISLE_17.quaternion`, and `ROT.quaternion`
  move/rotate the entire environment by hundreds of source units. This is the
  source presentation sequence, not player motion. The separate seagull channels
  (`MOUETTE_DEF.quaternion`, and morph weights on meshes `0`, `1`, `2`) can be
  retained separately if desired.

The main source surface groups are exposed as separate meshes:

| Mesh | Purpose | Collision recommendation |
| --- | --- | --- |
| `ISLE_17_ile-sable_0` | Sand and shoreline terrain | Include |
| `ISLE_17_ile-herbe_0` | Grass terrain | Include |
| `ISLE_17_ile-roc_0` | Island rocky body | Include |
| `ISLE_17_roc_0` | Exposed rocks and ridges | Include |
| `ISLE_17_buisson_0` | Bushes | Visual or coarse obstacle |
| `ISLE_17_maison-toit_0`, `ISLE_17_maison-bois_0` | Roofs, buildings, structures | Include or coarse obstacle |
| `ISLE_17_maison-light_0`, `ISLE_17_phare-light_0`, `ISLE_17_maison-or_0` | Lights and small building detail | Usually visual only |
| `ISLE_17_bato-bois_0`, `ISLE_17_bato-voile_0` | Boats | Visual or coarse obstacle |
| `ISLE_17_palmier-tronc_0`, `ISLE_17_palmier-feuilles_0` | Palms | Coarse obstacle; avoid as landing surface |
| `ISLE_17_ile-o_0`, `ISLE_17_ile-ecume_0` | Ocean and foam | Exclude from terrain raycasts; impose separate water floor |
| `ISLE_17_ile-nuage_0`, `ISLE_17_LUNE_0` | Atmosphere, moon, stars | Exclude from all flight/landing collision |
| `ISLE_17_ile-lave_0` | Lava near the underside | Exclude from landing candidates |

For an approximately 240-unit-wide landmass, use a parent with uniform scale
`1.866809003874327` and position
`[-1.5093930651113723, 407.1977139700876, 1.8787131657133382]`. This centers the
solid rocks horizontally and places the source ocean's top surface (`y=-218.125`)
at world `y=0`. The highest rock then reaches about `y=110.5`. A coastal spawn
at height 30–40 is viable, but an inland flight path needs actual terrain clearance.
These constants depend on this exact supplied model and the 240-unit convention.

The artist's baked night appearance is carried by base-color and emissive textures.
Do not overwrite all materials with a flat palette. Preserve `emissiveMap` and
its color factors, use normal glTF color-space handling, and evaluate exposure in
the real renderer. The cloud material uses alpha blending. Ocean is metallic and
textured; it is not an exported physical water simulation.

## Phoenix

- File: `phoenix_bird.glb`, 1,630,364 bytes. Two skinned meshes, 4,064 triangles,
  one skeleton with 89 joints. Four embedded PNG images: two 512 by 512 RGBA
  color textures and two 256 by 256 RGB maps. No external resources or extensions.
- Exactly one animation is supplied: **`Take 001`**, duration **3.3333333 s**,
  with 264 transform channels. Wing, tail, feather, jaw, and body joints animate.
  There are no separate named landing, takeoff, walking, or perched idle clips.
- The full clip contains repeated flap motion. Sampling at 0, 0.8333, 1.6667,
  and 2.5 seconds hits almost the same phase. Sample intermediate times such as
  0.1, 0.3, and 0.5 to inspect the actual wing range.
- Preserve the source skeleton and let AnimationMixer drive it. The root joint
  already bobs and translates within the flap (about 45 source units); put pilot
  position, heading, banking, and pitch on independent outer groups. Do not animate
  `gltf.scene.position` with a clip and also use it as the flight controller root.

The imported bird faces approximately **+X**, with a small negative-Z component.
At the first pose its body root is `[-41.22199,116.22089,-14.98684]`, and the head
is `[131.81978,219.94254,-24.27291]`. To align its horizontal forward direction
with a controller where yaw zero points down **-Z**, use a visual wrapper yaw of
`+1.5171840055` radians, approximately **86.928 degrees**. Keep the fixed source
correction separate from controller yaw and bank.

For a body-centered flight pivot, first offset the inner model by the negative
of that body-root position: `[41.22199,-116.22089,14.98684]`. Then scale and rotate
the external visual wrapper. This avoids centering on the long decorative tail.
An explicit hierarchy is:

```text
pilot (world position and heading)
  bankPitch (visual attitude)
    assetBasis (yaw 1.517184, uniform scale 0.0062019383)
      assetOffset (position 41.22199,-116.22089,14.98684)
        untouched gltf.scene + AnimationMixer
```

The sampled complete flap spans 1,128.6794 source units across its wings (source
Z). Scale **0.0062019383** gives a maximum wing span of about **7 world units**,
body-plus-tail length about **6.18**, and full vertical feather/wing sweep about
**5.99**. These are sampled envelopes, not analytical guarantees; add clearance.
The wing tip can sweep roughly three units below the body pivot at this scale,
so a body-center terrain floor of 2.5 units would be too low during a downstroke.
A minimum body clearance around **4–5 units** is a safer first prototype setting.

Both feather materials are double-sided, alpha blended, and emissive-textured.
Preserve their original texture colors and alpha. Opaque replacement materials
would turn the feather cards into rectangular sheets. If transparency sorting
is visibly problematic, test a small alpha-test cutoff and depth-write behavior
on the real model rather than globally replacing transparency.

## Landing implications

Free-flight can use the supplied clip immediately. A convincing landing needs a
separate authored/procedural transition or another compatible animation asset;
there is no hidden landing clip in this download. Discuss the desired perch and
wing-fold behavior with the user before assuming how that sequence should look.
Choose landing locations only after checking surface slope and vegetation/roof
clearance. A seven-unit wingspan suggests a clear pad radius of at least 6–8 units
for comfortable approach, orientation change, and takeoff.

Both selected Sketchfab pages report CC Attribution. Preserve the creator names
and model links in the eventual experience's credits. The inspection is technical
evidence about these downloads; it does not claim authorship of either model.
