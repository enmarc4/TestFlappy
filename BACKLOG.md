# Backlog

## 2026-02-15 - Estado tras vertical slice Chain Core
- Alcance previo: game-first + 3 ambientes + anti-zoom mobile + sistema tactico con power manual.
- Alcance actual: `chain_v1` en 1 accion con `SYNC + CHAIN`, passivos automaticos, telemetria ampliada y HUD renovado.
- Prioridad actual: tuning fino por playtest cualitativo para reforzar percepcion de juego de sincronizacion (no clon).

## Completado (P1 + P2 + Chain Core)
- Cambio de ambiente cada 50 puntos.
- Barra/linea de progreso superior (canvas + UI externa).
- Definicion e integracion de 3 esteticas de fase (paleta, fondo, tuberia, HUD).
- Transiciones de fase legibles y sin corte brusco.
- Sprites de tuberia por fase (body + cap para 3 ambientes).
- Fondos por fase integrados.
- Validacion visual de legibilidad en desktop y mobile.
- SFX WebAudio (flap, pickup, shield-hit, game over).
- Ajuste de balance en heat/power-ups.
- Telemetria basica: clicks CTA, inicios de run, duracion media de run.
- Refactor de interfaz a modo game-first (sin landing larga) con panel de instrucciones bajo demanda.
- Bloqueo de zoom mobile (viewport + guard anti doble tap).
- Core `chain_v1` con una sola accion (`Space/tap`) y sin power manual.
- Sistema de timing (`Perfect/Sync/Offbeat`) y scoring por sectores enlazados.
- Reconversion de aros a `Sync Anchors` y de power-ups a pasivos automaticos.
- Hook `setDebugSync(payload)` y snapshot de estado ampliado (`sync`, `chain`, `passives`).
- Telemetria ampliada con medias de precision sync, pico de cadena y linked rate.

## Prioridad P1
- Ejecutar playtest cualitativo (8-10 testers, 3 runs) y validar si >=70% describe el juego como sincronizacion/cadena antes que Flappy.
- Ajustar ventanas de sync y umbrales pasivos segun resultados del playtest para estabilizar runs de 60-90s.
- Cerrar QA cross-browser real (Chromium, Safari, Firefox) en `chain_v1`.

## Prioridad P2
- Mejorar onboarding in-game con feedback de `chain-break` y lectura de beat en primeros 20s.
- Añadir telemetria por fase (tiempo por ambiente, score medio al cambiar, caidas por tipo).
- Implementar `daily challenge` con seed fija sobre el core `chain_v1`.

## Prioridad P3
- Preparar assets de marca (logo corto, mini trailer, capturas curadas) para difusion externa.
- Leaderboard online opcional y comparativas por precision/cadena.
