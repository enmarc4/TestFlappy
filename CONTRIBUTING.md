# Contributing

Thanks for taking an interest in Sky Circuits: Tactical Flap.

## Useful areas

Current priorities are tracked in `BACKLOG.md`. The most useful contributions are:

- Cross-browser QA for the `chain_v1` gameplay loop.
- Playtest notes about sync timing, chain breaks, and first-run onboarding.
- Small fixes that improve mobile readability or input behavior.
- Documentation updates for setup, controls, and testing hooks.

## Local setup

Serve the repository over HTTP so browser-native ES modules load correctly:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Pull request checklist

- Keep changes focused and explain the gameplay or maintenance reason.
- Do not commit generated screenshots, temporary action logs, or local browser state.
- Test the game in at least one desktop browser before opening a PR.
- For gameplay changes, include a short note about how the change affects run length, sync timing, or scoring.
