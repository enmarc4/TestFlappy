# Backlog

## 2026-02-15 - Estado tras entrega P1 + P2 (game-first)
- Alcance previo: juego jugable + landing + sistema de progreso visual por fases de score.
- Alcance actual: juego como pantalla principal + instrucciones colapsables + bloqueo de zoom en mobile + 3 ambientes + audio + telemetria.
- Prioridad actual: consolidar QA cross-browser y mejorar rejugabilidad.

## Completado (P1 + P2)
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

## Prioridad P1
- Hacer QA cross-browser real (Chromium, Safari, Firefox) y cerrar incidencias.
- Revisar copy/legibilidad final de la pantalla principal de juego con distintos viewport.
- Evaluar latencia de carga inicial de assets y, si hace falta, optimizar compresion adicional.

## Prioridad P2
- Implementar leaderboard online opcional.
- Implementar modo `daily challenge` con seed fija y ranking diario.
- Anadir telemetria por fase (tiempo por ambiente, score medio al cambiar de ambiente).

## Prioridad P3
- Preparar assets de marca (logo corto, mini trailer, capturas curadas) para difusion externa.
- Publicar changelog de gameplay para comunicar diferencias frente al clon base.
