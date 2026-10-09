# ShadySherlock

A forensic investigation simulator that runs in the browser on desktop, phone and VR headsets. Walk through a realistic crime scene, examine evidence, run AI reconstruction on damaged items, and watch the probability of each suspect update as you go.

## Cases

| Case | Scene | Type |
| --- | --- | --- |
| The Hale Penthouse | Night-time penthouse with city view | Homicide |
| Death at Silver Lake | Misty lakeshore, dock and cabin at dawn | Suspicious death |
| The Meridian Diamond | Museum hall after hours | Burglary |

Each case has persons of interest, 6–8 evidence items with lab results, a damaged item that needs AI reconstruction, and two hidden AI findings.

## How it plays

1. Pick a case file and read the briefing.
2. Walk the scene and examine the numbered evidence tents. Each item shows lab results, an analyst assessment and its effect on every suspect.
3. Examine the damaged item, then run **AI reconstruction**. Fragments reassemble, the trajectory or drift path is projected, ghost figures replay the event, and new findings appear.
4. Open the **case board** and charge the person the evidence supports. You are scored on evidence coverage, time, sweeps used and wrong charges, and given a rank.

### How the probabilities work

Every hypothesis starts equal. Each evidence item carries a likelihood ratio per suspect: how much more (×>1) or less (×<1) likely that finding is if they did it. Examining an item multiplies those ratios and renormalises (Bayes' rule). The case board shows which evidence pushes each suspect up or down.

## Controls

| | Desktop | Phone / tablet | VR headset |
| --- | --- | --- | --- |
| Look | Drag the mouse, or capture it (Settings) | Move the phone (Motion on), or drag | Head tracking |
| Move | WASD / arrows, Shift to run | Left joystick, push to the edge to run | Left stick |
| Turn | Mouse | Drag | Right stick (snap turn) |
| Examine | Click the item, or `E` | Aim the centre dot and tap **Examine**, or tap the item | Point the laser, pull the trigger |
| Case tools | `Q` sweep · `H` nearest lead · `R` AI recon · `B` board · `L` log · `Esc` menu | On-screen buttons | **A/X** case tablet · **B/Y** sweep |

In VR everything happens inside the headset: a lobby to pick a case, and a case tablet with the evidence details, suspect probabilities, charges and the result screen.

On iPhone and iPad the browser asks for motion-sensor permission when you enter a scene.

## Settings and performance

Settings (title screen or pause menu) cover graphics quality (Auto / High / Medium / Low), a frame-rate meter, music and effects volume, look sensitivity, invert-Y, mouse capture, phone motion controls and VR snap-turn angle.

The renderer merges static geometry by material, renders shadows once instead of every frame, strips the expensive glass "transmission" pass and embedded lights from the models, and lowers the resolution automatically when the frame rate drops.

## Music and sound

Music and ambience are synthesised live with Web Audio (no audio files): a different theme per location that builds tension after the AI reconstruction and as you close in on the culprit.

## Running locally

The 3D models load with `fetch`, so serve the folder over HTTP rather than opening the file directly:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

On GitHub Pages it works as is. Motion controls need HTTPS.

## Project layout

```
index.html          page shell, HUD and dialogs
css/style.css       interface styling
js/data.js          case files: suspects, evidence, lab data, likelihood ratios
js/perf.js          quality presets, settings, geometry merging, dynamic resolution
js/textures.js      procedural textures (wood, marble, rugs, skyline, paintings…)
js/props.js         procedural props, figures and evidence objects; glTF loader
js/scenes.js        penthouse, lake and museum environments
js/audio.js         procedural music, ambience and sound effects
js/controls.js      keyboard, mouse, joystick, touch-look, device motion, VR movement
js/vr.js            VR lobby, case tablet, lasers and notifications
js/game.js          game flow, Bayesian engine, highlighting, AI reconstruction, scoring, settings
assets/models/      compressed glTF models (see CREDITS.md)
```

## Adding a case

Add an entry to `CASES` in `js/data.js`. Each evidence item needs a position, an object type from `P.EV` in `js/props.js` (or a glTF `model`), lab `data` rows and likelihood ratios in `lr`. To use a new location, add a builder to `js/scenes.js` that returns `walk`, `groundAt` and `tick`.

All cases are fictional and intended for training.
