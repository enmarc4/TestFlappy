# Backlog

## 2026-02-15 - Estado tras entrega P1 + P2
- Alcance previo: juego jugable + landing + sistema de progreso visual por fases de score.
- Alcance actual: alcance previo + 3 ambientes de runtime + audio + telemetria basica + validacion desktop/mobile.
- Prioridad actual: consolidar distribucion, QA final y mejoras de rejugabilidad.

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

## Prioridad P1
- Hacer QA cross-browser real (Chromium, Safari, Firefox) y cerrar incidencias.
- Revisar copy/legibilidad final de landing con distintos viewport (incluyendo overlays del canvas).
- Evaluar latencia de carga inicial de assets y, si hace falta, optimizar compresion adicional.

## Prioridad P2
- Implementar leaderboard online opcional.
- Implementar modo `daily challenge` con seed fija y ranking diario.
- Anadir telemetria por fase (tiempo por ambiente, score medio al cambiar de ambiente).

## Prioridad P3
- Preparar assets de marca (logo corto, mini trailer, capturas curadas) para difusion externa.
- Publicar changelog de gameplay para comunicar diferencias frente al clon base.
