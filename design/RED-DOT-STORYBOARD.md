# Red Dot — playable film

User-approved structure: five résumé acts; meaningful résumé interactions move
the action; explicit Previous/Next controls remain available; full reversal
across every location. Original flat black/white/crimson silhouettes remain.

## Beat map

| Act | Scene | URL beats | Held positions |
| --- | --- | --- | --- |
| About | Red Dot | 0–2 | Quiet room → map alert → car on linked CCTV |
| About | The Arrival | 3–5 | Parked car → crew exits → bank door opens |
| Skills | The Robbery | 6–8 | CCTV → breach → money/CCTV close-up |
| Skills | Escape | 9–11 | Run to car → wheelspin → hero takes coat |
| Projects | The Car | 12–14 | Dashboard map → turn → getaway spotted |
| Projects | City Chase | 15–17 | Two cars → truck near miss → garage entry |
| Experience | Parking Garage | 18–20 | 15 metres → abandoned car → ambush |
| Experience | First Confrontation | 21–23 | Block/counter → shot/dodge → disarm/moving signal |
| Contact | The Real Target | 24–26 | Rooftop → mask removed → villain draws pistol |
| Contact | Final Action | 27–29 | Bullet close-up/dodge → punch clash/disarm → villain defeated |
| Contact | The Twist | 30–32 | Phone signal → city-wide dots → black/final signal |

Each numbered position holds while ambient motion continues. Fractional
positions animate action between those anchors. The final portion of a scene
uses a diagonal comic-panel wipe to its successor; reversing exposes the same
two locations in the opposite order. Jumps show intervening scenes, with a
duration of 0.6 + 0.48 × distance seconds (about 16 seconds end to end).

## Interaction contract

- Selecting a main résumé section targets the beginning of its act.
- Selecting skills, project content, build steps, opening an experience
  disclosure or a lab advances one beat, bounded by that act's end.
- Moving to a previous project chapter rewinds one beat within the act.
- Closing a disclosure and selecting an already active tool do not advance.
- Contact links and copy-email can advance the finale; they retain their
  ordinary destination/action and never require watching the story first.
- Next beat crosses act boundaries and selects the corresponding résumé section.
- Previous beat reverses across acts. The last beat's button replays from About.
- Desktop scene buttons select any of the eleven locations directly.
- The fragment encodes both views, e.g. `#targets/ad/build?beat=16`.
  Missing/invalid beats normalize to valid act positions. Every entry is given
  an explicit beat so browser Back cannot inherit a later action position.
- Beat-only navigation does not rebuild résumé markup, change focus, reset
  scrolling or close an open disclosure. Scene announcements have their own
  polite live region; controls remain semantic buttons and links.

## Rendering

`movie-scene.js` exports the pure timeline and scene/beat/effect functions before
its browser guard. The browser renderer uses authored canvas polygons, linework
and screentone; it does not load bitmap characters or use a 3D engine. Cars,
walks, dodges, the bullet, shattered light, fallen figures, bag halves and bills
derive from the action playhead. No irreversible particle emitter owns story
state. New destinations retain current position and bounded momentum.

The environmental clock only moves forward. It drives multiple rain depths,
wind, splashes, flutter, the live terminal, fans, wipers, flicker and idle coat
motion. The garage uses sheltered runoff instead of outdoor rain. The gunshot
has a local displacement/wake field. Action effects can rewind while ordinary
weather continues.

Sound uses a user-enabled Web Audio layer with synthesized noise, engine hum,
signals, tension pulses, sirens and impact tones. It is silent on first load,
quiets when motion is paused or the page is hidden, and uses no external clips.
The final dialogue is a comic speech panel. No voice acting is claimed.

Motion-off navigation selects the destination instantly. System reduced motion
is respected unless explicitly overridden. Rendering stops when the canvas is
offscreen or the document is hidden; pixel density is capped at 1.6.

## Validation

`check-movie.cjs` verifies all eleven locations in both traversal directions,
deterministic reconstruction, rapid retargeting and the independent weather
clock. `check-movie-integration.cjs` runs every drawing and every wipe through
a canvas adapter that rejects non-finite geometry, then tests actual navigation,
URL restoration, disclosure events, pause and hidden-page behavior.
`check-game-menu.cjs` exercises all factual résumé renderers and legacy routes.

The retained `alley-scene.js` is the prior single-confrontation motion study.
The new version is a complete playable storyboard, with three held poses per
scene. User review should guide further character drawing, additional in-between
choreography and scene-specific timing rather than generating speculative art.


## Art revision — 11 September 2026

User feedback replaced the simplified desk and bank staging:

- Seated protagonist with bent legs, typing hands, chair back, pedestal and casters.
- Four active surveillance displays: a district map with river and bridges,
  bank CCTV, east-bridge traffic, and a scrolling terminal. Cables, coffee,
  desk hardware and fan animation complete the room.
- Bank facade has divided windows, reflections, stone piers and sills,
  two bracket-mounted CCTV cameras, and hinged glass entrance doors.
  The lead robber reaches for the door as the entrance opens on the playhead.
- Hooded robbers have full white masks with three crimson marking variations,
  short jackets, straps and duffel bags. The protagonist retains his fedora.
- Bank lobby includes lighting fixtures, a clock, teller grilles, counter
  terminals and queue ropes. Two tellers raise their hands; three distinct
  customers crouch in the foreground. Cash moves into the robber's bag.
- Fictional banknotes have borders, 100 denomination markings, an engraved
  medallion, seal and fine linework. The same note drawing is used at the teller,
  on the garage floor, and in the rooftop burst, with larger foreground bills.
- Desktop framing fits the staged vertical bounds to retain chairs, shoes,
  vehicles and hostages, rather than cropping them from wide viewports.

Bank staging reference supplied by the user: The Dark Knight opening heist.
Architectural reference consulted: [Interiors — The Dark Knight](https://www.intjournal.com/0712/the-dark-knight).
All scene artwork remains authored canvas geometry; no film stills are shipped.

### Opening surveillance correction

The operator is now seen from behind, seated directly in front of the district
map. The former ambiguous foreground shape is removed. Monitor stands, keyboard,
mouse and coffee saucer meet one desk plane; cables drop beneath its edge.

The left screen is the bank's exterior camera looking down onto its steps, curb
and street, rather than a picture of the bank facade. The opening playhead now
orders the map signal, camera link, tracked car arrival, and camera push/cut.
The exterior arrival begins with that car already parked. All of these events
reverse with navigation; feed rain, scanlines, typing and fans continue on the
environment clock. Core checks cover this ordering and reconstruction.

### Full-film environment and proportion pass

- Rebuilt the bank hall around a single floor perspective and two teller bays.
  Adult customers crouch through bent knees; tellers surrender with spread
  fingers. Raised eyebrows, wide eyes, open mouths and protective poses are
  visible from the first held robbery beat. Counter layering hides staff at
  consistent waist height; money stacks sit behind the bag carrier.
- Outlined trousers and shoes throughout the film so silhouettes remain
  legible against dark floors. Reduced oversized masked heads and varied the
  opponents' mask markings across the garage and rooftop scenes.
- Added street lamps, fire escapes, signals, drains, crossing markings and
  additional vehicle glazing, trim, lights and collision damage.
- Replaced the driving composition with a rear-facing driver, steering contact,
  instrument gauges, a rear-view mirror, dashboard map and paired wipers.
- Rebuilt the garage with perspective parking bays, wheel stops, parked cars,
  ceiling pipes, fluorescent housings, CCTV, stairs signage and localized leaks.
  The initial fight is now visible beside the pillar before the MC takes cover
  and emerges toward the gunman.
- Added roof-access hardware, ventilation grilles and rotating fans, an anchored
  water tower, aerials, cables, windblown litter and rippling puddles. The money
  bag begins on the roof, rises into the characters' hands and tears apart.
- The twist reveals links between the citywide signals. Network growth follows
  the reversible action; beacon pulses follow the ambient clock.

Desktop and phone-sized visual review accompanies the renderer, navigation,
reversal, reduced-motion and résumé regression checks. Artwork is still authored
canvas geometry; the existing factual résumé and section routes are retained.


## Continuity and guided exploration revision

The latest direction supersedes the earlier rooftop ambush: the rooftop has
only the MC and the last robber, revealed as the main villain. Defeated garage
attackers never appear on the roof. The villain stays down during the twist.

- Civilians kneel with shins and feet tucked behind their knees and hands
  behind their heads, following the user's pose reference.
- The driver sits behind a seat back with bent elbows at the wheel. The chase
  uses rear-view cars on a common road perspective; the parking entrance leads
  into the actual garage drawing rather than a separate mismatched facade.
- `garageSequence` renders both garage chapters on one continuous timeline.
  Cars, cover column, scattered cash and opponents retain their positions.
- An articulated pose rig interpolates attacks, blocks, crouches, disarms,
  recoil and fallen poses. Held comic close-ups explain the dodge, wrist release,
  bullet and fist clash. Ambient motion continues independently.
- The guide is part of the live interface: short section-aware prompts explain
  how résumé interactions advance the film. It works on mobile and desktop,
  follows navigation, can be dismissed/reopened, and persists that preference.

Regression checks observe actual renderer calls to enforce garage continuity,
only two rooftop participants, and defeated/unarmed outcomes. Navigation tests
also cover guide updates and dismissal without advancing the story.
