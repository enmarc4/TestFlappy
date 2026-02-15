Original prompt: Quiero hacer un juego estilo Flappy Bird, pero vamos a darle alguna vuelta de tuerca para que sea un poco mas dinamico e interesante que se diferencie del juego original.

## 2026-02-11 - Implementacion V1 (Sky Circuits: Tactical Flap)

### Hecho
- Se creo un juego web completo en vanilla JS + Canvas con modo menu, partida y game over.
- Se implemento fisica tipo flap con gravedad fija y simulacion por timestep fijo (60 FPS logicos).
- Se implementaron obstaculos, scoring (+1 por obstaculo superado) y colisiones con techo/suelo/obstaculos.
- Se implementaron coleccionables de carga en rutas de riesgo con bonus de score.
- Se implementaron 3 power-ups ponderados: Pulse Shield, Gap Widen, Flux Boost.
- Se implemento economia tactica: max 2 cargas, activacion manual, heat meter, overheat con penalizacion temporal.
- Se implemento curva de dificultad por fases (0-20s, 20-45s, 45s+).
- Se implemento HUD con score, high score, cargas, fase, power activo, barra heat y aviso OVERHEAT.
- Se implementaron controles desktop (Space flap, Shift power, R restart, F fullscreen) y movil (tap flap + boton power).
- Se implemento persistencia de high score en localStorage (key: skyCircuits.highScore.v1).
- Se expusieron hooks de test: window.render_game_to_text, window.advanceTime(ms), window.resetGame().

### Archivos creados
- index.html
- styles.css
- src/config.js
- src/state.js
- src/systems.js
- src/render.js
- src/input.js
- src/testing-hooks.js
- src/main.js

### Notas
- V1 se dejo sin audio segun alcance final.
- El modo restart desde tecla R durante partida vuelve a menu; en game over reinicia run.

### TODO sugerido (V1.1)
- Añadir SFX ligeros por WebAudio (flap, pickup, shield-hit, game over).
- Afinar balance de duraciones/pesos de power-up tras playtesting.
- Añadir leaderboard online opcional.

## 2026-02-11 - Landing de presentacion (V1.1)

### Hecho
- Se reconstruyo `index.html` como landing de presentacion del juego con:
  - Hero con propuesta de valor y CTAs.
  - Bloque de mecanicas principales y flujo de partida.
  - Seccion de demo jugable embebida.
- Se rediseno `styles.css` para una identidad visual mas marcada:
  - Nuevo sistema de color y tipografia (`Sora`, `Bungee`, `Chakra Petch`).
  - Layout responsive desktop/movil para toda la landing.
  - Animaciones ligeras de entrada y fondos atmosfericos.
- Se mantuvieron `#game-canvas` y `#power-btn` para preservar integracion con `src/main.js` sin cambios de runtime.

### Validacion
- Test de juego con cliente Playwright de la skill:
  - `node "$WEB_GAME_CLIENT" --url http://127.0.0.1:4173 --actions-file tmp_web_actions_skycircuits.json --iterations 2 --pause-ms 220 --screenshot-dir output/web-game/landing-run`
  - Resultado: ejecucion correcta, sin errores de consola.
- Revision visual de artefactos de juego:
  - `output/web-game/landing-run/shot-0.png`
  - `output/web-game/landing-run/shot-1.png`
  - `output/web-game/landing-run/state-0.json`
  - `output/web-game/landing-run/state-1.json`
- Capturas full-page de landing (desktop y movil):
  - `output/web-game/landing-desktop-full.png`
  - `output/web-game/landing-mobile-full.png`

### Notas
- No hay repositorio Git inicializado en el directorio de trabajo (`.git` ausente).

### TODO sugerido (V1.2)
- Añadir CTA secundario para iniciar run y hacer scroll/focus directo al canvas.
- Incorporar telemetria basica de interaccion en landing (click CTA, scroll depth, inicio de run).
- Ajustar copy de onboarding dentro del canvas para alinearlo al mensaje de la landing.

## 2026-02-15 - Sprites personalizados (V1.2)

### Hecho
- Se generaron nuevos assets visuales con la skill `imagegen` usando `scripts/image_gen.py`:
  - Personaje (drone-colibri estilizado).
  - Cuerpo de canonada.
  - Boca/cap de canonada.
- Se guardaron los renders base en `output/imagegen/` y se prepararon assets runtime en `assets/sprites/`.
- Se actualizo `src/render.js` para:
  - Cargar sprites al iniciar (`player`, `pipe-body`, `pipe-cap`).
  - Renderizar obstáculos con sprites (cuerpo + cap), incluyendo top/bottom.
  - Renderizar personaje con sprite rotado segun velocidad vertical.
  - Mantener fallback vectorial si algun sprite no carga.
- Se ajusto el tamaño final del sprite del personaje para mejorar lectura en pantalla y personalidad visual.

### Validacion
- Se ejecuto test con cliente Playwright en local y se revisaron capturas de runtime con estado `playing` y `gameover`.
- Se verifico que:
  - Los obstáculos se dibujan con el nuevo look de canonada.
  - El personaje usa el sprite nuevo durante vuelo.
  - No hay bloqueo del loop si fallara la carga de imagen (fallback activo).

### TODO sugerido (V1.3)
- Implementar sistema de fases de ambiente por score (cambio cada 50 puntos).
- Anadir una linea/barra de progreso superior para mostrar avance al siguiente cambio de fase.
- Definir 3 ambientes base para la partida con estilo diferenciable y coherente entre si.
- Generar sprites de canonada por ambiente (pipe-body + pipe-cap para cada una de las 3 fases).
- Validar transiciones de fase para que mantengan legibilidad de obstaculos y claridad de gameplay.

## 2026-02-15 - Progreso visual por fases + telemetria + audio (V1.3)

### Hecho
- Se implemento progresion visual por score con cambio de ambiente cada 50 puntos.
- Se definieron 3 ambientes con identidad completa (fondo, HUD, acentos y tuberias):
  - `Stratos Labs` (azul/cyan).
  - `Ember Foundry` (ambar/cobre).
  - `Ion Storm` (grafito/cyan electrico).
- Se prepararon y conectaron assets por fase:
  - Fondos: `assets/backgrounds/bg-phase-1.png`, `bg-phase-2.png`, `bg-phase-3.png`.
  - Tuberias: `assets/sprites/phases/pipe-body-phase-{1,2,3}.png` y `pipe-cap-phase-{1,2,3}.png`.
- Se actualizo renderizado para:
  - Pintar background por ambiente con crossfade en transicion.
  - Spawnear obstaculos con `themeIndex` para mantener consistencia visual por obstaculo.
  - Dibujar barra superior de progreso dentro del canvas (avance al siguiente hito).
  - Adaptar HUD en modo compacto para mobile y mantener legibilidad.
- Se anadio barra de progreso tambien en la UI externa (`play-zone`) con label en vivo.
- Se implemento SFX WebAudio:
  - `flap`, `collectible-pickup`, `shield-hit`, `gameover`.
- Se incorporo telemetria basica persistente en `localStorage` (`skyCircuits.telemetry.v1`):
  - clicks en CTA,
  - inicios de run,
  - duracion media de run.
- Se afino balance de power-ups y heat en `src/config.js`:
  - menor calor por uso,
  - mayor disipacion,
  - menor castigo de overheat,
  - ajuste de duraciones/pesos.
- Se extendieron hooks de testing con `window.setDebugScore(score)` para validar fases visuales rapidamente.

### Validacion
- Smoke test runtime con cliente Playwright (skill `develop-web-game`):
  - `output/web-game/prio12-smoke/`
  - `output/web-game/prio12-smoke-v2/`
  - `output/web-game/prio12-smoke-v3/`
- Validacion visual de fases forzando score via hook:
  - Canvas fase 1: `output/web-game/prio12-phase1.png`
  - Canvas fase 2: `output/web-game/prio12-phase2.png`
  - Canvas fase 3: `output/web-game/prio12-phase3.png`
  - Estados: `output/web-game/prio12-phase{1,2,3}.json`
- Validacion responsive desktop/mobile:
  - `output/web-game/prio12-desktop-full-v2.png`
  - `output/web-game/prio12-mobile-full-v2.png`
  - Comprobacion mobile de ambiente 2 en canvas: `output/web-game/prio12-mobile-phase2-canvas-v3.png`
- Validacion funcional de telemetria CTA/runs en UI mediante Playwright evaluate.

### TODO sugerido (V1.4)
- Anadir un modo diario (`daily seed`) con ranking local para reforzar rejugabilidad.
- Evaluar una animacion ligera del sprite del player (2-3 frames) para feedback de propulsion.
- Registrar telemetria adicional de cambio de ambiente (tiempo hasta hito, score por fase).

## 2026-02-15 - Game-first UI + anti-zoom mobile

### Hecho
- Se separo la landing de presentacion del flujo principal:
  - `index.html` pasa a priorizar la partida como primer bloque visible.
  - Se eliminan secciones largas de marketing del flujo inicial.
- Se anadieron instrucciones bajo demanda en panel colapsable (`details/summary`) para no interrumpir la entrada al juego.
- Se mantuvo intacta la integracion runtime del juego (`#game-canvas`, `#power-btn`, HUD y telemetria).
- Se simplifico y rehizo `styles.css` para layout game-first desktop/mobile.
- Se implemento bloqueo de zoom molesto en mobile:
  - Meta viewport con `maximum-scale=1` y `user-scalable=no`.
  - Guard JS anti doble tap en `src/main.js` (`touchend` + fallback `gesturestart` en iOS).

### Validacion
- Smoke test de runtime con Playwright (sin regresiones de loop/estado):
  - `output/web-game/game-first-smoke/`
- Validacion visual game-first:
  - Desktop full page: `output/web-game/game-first-desktop-full.png`
  - Mobile full page: `output/web-game/game-first-mobile-full.png`
- Validacion funcional de instrucciones colapsables (closed -> open) en mobile emulado.
- Validacion de anti-zoom doble tap en mobile emulado:
  - `visualViewport.scale` antes/despues: `1 -> 1`.

### TODO sugerido (V1.4)
- Si se quiere mejorar accesibilidad, ofrecer toggle opcional para permitir zoom en mobile fuera de partida.
- Añadir acceso rapido desde teclado para abrir/cerrar instrucciones (ej. tecla `I`).

## 2026-02-15 - Vertical Slice Chain Core (chain_v1)

### Hecho
- Se reemplazo el core de gameplay por `chain_v1` en modo 1 accion (`Space/tap`) y se retiro la activacion manual de power-up.
- Se implemento sistema de sincronizacion por beat (`Perfect`, `Sync`, `Offbeat`) con BPM y ventanas por ambiente.
- Se implemento sistema de `Cadena tactica` por sectores:
  - `Linked Sector` cuando hay taps de calidad en ventana.
  - `Broken Sector` cuando se rompe el ritmo.
  - Multiplicador por racha y scoring por sector.
- Se reconvirtio el coleccionable en `Sync Anchor` (bonus + estabilizacion temporal de cadena).
- Se reconvirtieron los power-ups a pasivos automaticos por cadena:
  - `Pulse Shield` por umbral de sectores enlazados.
  - `Gap Widen` por umbral de racha.
  - `Flux Boost` tras sector perfecto.
- Se mantuvo la progresion visual por ambientes cada `50` puntos usando los mismos assets existentes.
- Se actualizo el HUD de canvas con barra de beat, estado de cadena, multiplicador, calidad de sync y pasivo activo.
- Se actualizo UI externa (`index.html`, `styles.css`, `main.js`) a copy y estados `SYNC + CHAIN`.
- Se amplian hooks y estado de test:
  - `window.render_game_to_text` ahora incluye `sync`, `chain`, `passives`.
  - `window.setDebugSync(payload)` para pruebas deterministas (`phase`/`seed`).
- Se amplio telemetria local (`skyCircuits.telemetry.v1`) con:
  - `avg_sync_accuracy`
  - `avg_chain_peak`
  - `linked_sector_rate`

### Validacion
- Sintaxis OK en todo `src/*.js` (`node --check`).
- Smoke con cliente Playwright de la skill:
  - `output/web-game/chain-v1-smoke-final/`
- Validacion mecanica y mobile con script Playwright:
  - `tmp/validate_chain_v1.mjs`
  - reporte: `output/web-game/chain-v1-validation/report.json`
  - capturas:
    - `output/web-game/chain-v1-validation/desktop-full-chain.png`
    - `output/web-game/chain-v1-validation/mobile-full-chain.png`
    - `output/web-game/chain-v1-validation/desktop-canvas-chain.png`
- Check explicito de zoom mobile: `visualViewport.scale` se mantiene `1 -> 1` tras doble tap.
- Check explicito de ambientes por score:
  - score 0 -> ambiente 1
  - score 55 -> ambiente 2
  - score 110 -> ambiente 3

### TODO sugerido (Chain v1.1)
- Ajustar tuning fino de ventanas `Perfect/Sync` tras playtest humano (sin debug).
- Afinar umbrales pasivos para mantener runs objetivo de `60-90s` en skill media.
- Añadir indicador visual mas fuerte de `chain-break` para aprendizaje temprano.
