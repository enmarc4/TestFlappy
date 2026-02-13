# Changelog

## 2026-02-11
- feat: implementado juego completo "Sky Circuits: Tactical Flap" (web, Canvas, vanilla JS).
- feat: loop de juego con menu -> run -> game over, reinicio inmediato y fullscreen.
- feat: mecanica base estilo Flappy (flap/gravedad/obstaculos/colisiones/score).
- feat: sistema tactico de power-ups con cargas recogibles y activacion manual.
- feat: power-ups incluidos: Pulse Shield, Gap Widen, Flux Boost (seleccion ponderada).
- feat: heat meter con disipacion, umbral de overheat y penalizacion de vuelo.
- feat: escalado de dificultad por fases temporales (1/2/3).
- feat: controles desktop y movil (tap + boton power dedicado).
- feat: HUD de estado completo y persistencia de high score en localStorage.
- feat: hooks de automatizacion y test: render_game_to_text, advanceTime, resetGame.
- docs: agregado progress.md con trazabilidad de decisiones, estado y siguientes pasos.
- feat: creada landing de presentacion del juego en la misma pagina (hero, mecanicas, flujo y demo jugable).
- feat: rediseño responsive completo de estilos para desktop y movil, con identidad visual orientada a presentacion.
- test: validada integracion landing + runtime con Playwright (`output/web-game/landing-run`) y capturas full-page (`output/web-game/landing-desktop-full.png`, `output/web-game/landing-mobile-full.png`).
- docs: actualizado progress.md y creado BACKLOG.md por cambio de alcance hacia presentacion + juego.
