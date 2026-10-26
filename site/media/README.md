# Project demo clips

Drop a file in here and the matching briefing in TARGETS grows a player. Nothing else
to change — `build.py` scans this folder on every build and prints what it found.

| File | Project |
|---|---|
| `demo-ad.mp4` | 01 · Windows Server 2022 AD Infrastructure |
| `demo-hive.mp4` | 02 · HiveMind |
| `demo-flex.mp4` | 03 · FlexiFit |

Optional poster, shown before playback and under reduced motion:
`demo-ad.jpg` (or `.png` / `.webp`), same names, same aspect.

## Recording spec

- **~20 seconds.** It loops silently, so make it a tight loop of the one thing worth
  seeing — not a tour. Start and end on a similar frame so the wrap is not jarring.
- **16:9**, 1280×720 is plenty. The slot is 16:9; anything else gets letterboxed.
- **MP4, H.264.** Plays everywhere without a second source file.
- **No audio.** The player is muted and has no volume control, so an audio track is
  dead weight.
- **Under 3 MB each** if you can. Screen captures compress very well. These ship as
  separate files next to `index.html`, so they do not bloat the page — but a recruiter
  on hotel wifi still has to fetch them.
- **Crop to the work.** The console, the app, the GNS3 canvas — not your whole desktop
  with a taskbar and notifications.

## Recording on Windows

`Win + G` opens Game Bar, which records a single window. OBS Studio if you want more
control. To get the size down afterwards, HandBrake: preset *Fast 720p30*, RF around
28, audio track removed.

## What each clip should probably show

- **AD** — `repadmin /replsummary` returning clean, or a client joining across the site
  boundary. The thing the diagram claims, actually happening.
- **HiveMind** — two windows side by side, a task moving in one and appearing in the
  other. Real-time is hard to show any other way.
- **FlexiFit** — the member flow end to end: browse a class, register, see it land.

## How it behaves

The file is only fetched when someone opens that briefing — never on page load, even
for the first card, which starts open. Opening a briefing starts the clip; closing it
or opening another one stops it. Under `prefers-reduced-motion` nothing autoplays and
the poster waits behind a PLAY button.
