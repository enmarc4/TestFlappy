# Changelog

## 2026-02-15
- feat: generados sprites personalizados con `imagegen` para personaje y canonadas (raw en `output/imagegen/`).
- feat: añadidos assets finales del runtime en `assets/sprites/` (`player.png`, `pipe-body.png`, `pipe-cap.png`).
- feat: actualizado `src/render.js` para renderizar personaje y obstáculos con sprites, manteniendo fallback vectorial si una imagen falla al cargar.
- tweak: ajustada escala del sprite del personaje para mejorar legibilidad y personalidad en gameplay.
- test: validación visual del runtime con cliente Playwright (estado `playing`/`gameover` y render correcto de sprites).
- docs: actualizado `BACKLOG.md` y `progress.md` con plan V1.3 de progreso visual por score (cambio de ambiente cada 50 puntos, barra superior y 3 esteticas con sprites de tuberia).
- feat: implementado sistema de ambientes por score (`50` puntos por fase) con transicion visual y `themeIndex` por obstaculo.
- feat: añadidos 3 backgrounds de fase en `assets/backgrounds/` y sprites de tuberia por fase en `assets/sprites/phases/`.
- feat: añadida barra de progreso superior en canvas + barra de progreso en `play-zone` para hito de ambiente.
- feat: incorporados SFX WebAudio (`flap`, `pickup`, `shield-hit`, `gameover`) con desbloqueo por interaccion.
- feat: añadida telemetria basica persistente (`skyCircuits.telemetry.v1`) para clicks CTA, inicios de run y duracion media.
- feat: extendidos hooks de test con `window.setDebugScore(score)` para validar fases y arte por ambiente.
- tweak: afinado balance de heat/power-ups (menos calor por uso, mas disipacion, menor overheat, ajuste de duraciones/pesos).
- fix: remaquetado HUD compacto de canvas en mobile para evitar solapamientos de texto en overlays.
- test: validacion visual de fases (`output/web-game/prio12-phase{1,2,3}.png`) y snapshots de estado por ambiente.
- test: validacion responsive final en desktop/mobile (`output/web-game/prio12-desktop-full-v2.png`, `output/web-game/prio12-mobile-full-v2.png`).
- docs: actualizado `progress.md` con trazabilidad completa de V1.3 y `BACKLOG.md` con P1+P2 completadas.
- feat: refactor de `index.html` + `styles.css` a experiencia `game-first` (el juego pasa a ser la pantalla principal).
- feat: añadidas instrucciones colapsables (`details/summary`) para ver ayuda solo bajo demanda.
- fix: deshabilitado zoom molesto en mobile (meta viewport con `user-scalable=no` + guard anti doble tap en `src/main.js`).
- test: validacion visual game-first en desktop/mobile (`output/web-game/game-first-desktop-full.png`, `output/web-game/game-first-mobile-full.png`).
- test: comprobacion de escala tras doble tap en mobile emulado (sin cambio de escala: `1 -> 1`).

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
