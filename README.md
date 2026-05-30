# Sky Circuits: Tactical Flap

Sky Circuits is a browser arcade game built with vanilla JavaScript, HTML, and CSS. The current `chain_v1` core turns the classic flap loop into a rhythm and chain challenge: one action controls flight, beat timing drives `Perfect` / `Sync` / `Offbeat` feedback, and linked sectors build score multipliers.

## Features

- Canvas-based game loop with keyboard and touch controls.
- One-action `SYNC + CHAIN` gameplay mode.
- Three visual environments that change every 50 points.
- Passive chain assists: Pulse Shield, Gap Widen, and Flux Boost.
- Local high score and telemetry snapshots for run starts, duration, sync accuracy, chain peaks, and linked-sector rate.
- Deterministic debug hooks for browser automation and gameplay validation.

## Run locally

This project uses browser-native ES modules, so serve the folder over HTTP instead of opening `index.html` directly.

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Controls

- Desktop: `Space` to flap/start, `P` to pause, `R` to restart, `F` for fullscreen.
- Mobile: tap the game canvas to flap/start.

## Project structure

- `index.html` and `styles.css`: game shell, responsive UI, and public-facing controls.
- `src/main.js`: DOM wiring, canvas resize, telemetry UI, and runtime loop.
- `src/systems.js`: gameplay state transitions, physics, collisions, scoring, sync, and chain logic.
- `src/render.js`: canvas drawing and sprite fallbacks.
- `src/testing-hooks.js`: automation hooks used during validation.
- `BACKLOG.md`, `CHANGELOG.md`, and `progress.md`: maintenance notes and roadmap.

## Maintenance roadmap

Current priorities are listed in `BACKLOG.md`: qualitative playtesting, cross-browser QA for `chain_v1`, onboarding feedback for chain breaks, and telemetry by environment phase.
