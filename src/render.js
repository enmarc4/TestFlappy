import { GAME_CONFIG } from "./config.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function loadSprite(src) {
  const image = new Image();
  const sprite = {
    image,
    ready: false,
    failed: false,
  };

  image.addEventListener("load", () => {
    sprite.ready = true;
  });
  image.addEventListener("error", () => {
    sprite.failed = true;
  });
  image.src = src;

  return sprite;
}

function canDrawSprite(sprite) {
  return sprite.ready && !sprite.failed;
}

const PLAYER_SPRITE = loadSprite(new URL("../assets/sprites/player.png", import.meta.url).href);

const ENVIRONMENT_SPRITES = GAME_CONFIG.environments.map((environment) => ({
  background: loadSprite(new URL(`../assets/backgrounds/${environment.backgroundSprite}`, import.meta.url).href),
  pipeBody: loadSprite(new URL(`../assets/sprites/phases/${environment.pipeBodySprite}`, import.meta.url).href),
  pipeCap: loadSprite(new URL(`../assets/sprites/phases/${environment.pipeCapSprite}`, import.meta.url).href),
}));

function drawCoverImage(ctx, image, width, height, offsetX = 0, offsetY = 0) {
  const imageW = image.width;
  const imageH = image.height;
  if (!imageW || !imageH) {
    return;
  }

  const scale = Math.max(width / imageW, height / imageH);
  const drawW = imageW * scale;
  const drawH = imageH * scale;
  const x = (width - drawW) * 0.5 + offsetX;
  const y = (height - drawH) * 0.5 + offsetY;

  ctx.drawImage(image, x, y, drawW, drawH);
}

function drawBackgroundFallback(ctx, state, environment) {
  const { width, height } = state.world;
  const fallback = environment.backgroundFallback;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, fallback.top);
  gradient.addColorStop(0.56, fallback.mid);
  gradient.addColorStop(1, fallback.bottom);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const cloudTint = environment.id === "ember-foundry" ? "rgba(255, 219, 170, 0.2)" : "rgba(237, 249, 255, 0.22)";
  for (let i = 0; i < 6; i += 1) {
    const cloudX = width * (0.1 + i * 0.15) + Math.sin(state.totalTime * 0.2 + i) * 16;
    const cloudY = height * (0.2 + (i % 3) * 0.24) + Math.cos(state.totalTime * 0.33 + i) * 7;
    ctx.fillStyle = cloudTint;
    ctx.beginPath();
    ctx.ellipse(cloudX, cloudY, 80 + (i % 2) * 28, 20 + (i % 3) * 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBackgroundLayer(ctx, state, themeIndex, alpha = 1) {
  const theme = GAME_CONFIG.environments[themeIndex] ?? GAME_CONFIG.environments[0];
  const sprites = ENVIRONMENT_SPRITES[themeIndex] ?? ENVIRONMENT_SPRITES[0];
  const { width, height } = state.world;

  ctx.save();
  ctx.globalAlpha *= alpha;

  if (sprites && canDrawSprite(sprites.background)) {
    const xDrift = Math.sin(state.totalTime * 0.12 + themeIndex) * 20;
    const yDrift = Math.cos(state.totalTime * 0.08 + themeIndex) * 6;
    drawCoverImage(ctx, sprites.background.image, width, height, xDrift, yDrift);
  } else {
    drawBackgroundFallback(ctx, state, theme);
  }

  const vignette = ctx.createLinearGradient(0, 0, 0, height);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0.15)");
  vignette.addColorStop(0.2, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.82, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.3)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

function drawBackground(ctx, state) {
  const activeIndex = state.environment.activeIndex;
  const previousIndex = state.environment.previousIndex;
  const transition = clamp(state.environment.transitionProgress, 0, 1);

  if (activeIndex !== previousIndex && transition < 1) {
    drawBackgroundLayer(ctx, state, previousIndex, 1);
    drawBackgroundLayer(ctx, state, activeIndex, transition);
    return;
  }

  drawBackgroundLayer(ctx, state, activeIndex, 1);
}

function drawObstacleFallback(ctx, obstacle, state, environment) {
  const topHeight = obstacle.gapY - obstacle.gapHeight * 0.5;
  const bottomY = obstacle.gapY + obstacle.gapHeight * 0.5;
  const bottomHeight = state.world.height - bottomY;
  const palette = environment.pipeFallback;

  const bodyGradient = ctx.createLinearGradient(obstacle.x, 0, obstacle.x + obstacle.width, 0);
  bodyGradient.addColorStop(0, palette.bodyStart);
  bodyGradient.addColorStop(0.52, palette.bodyMid);
  bodyGradient.addColorStop(1, palette.bodyEnd);

  const finGradient = ctx.createLinearGradient(obstacle.x, 0, obstacle.x + obstacle.width, 0);
  finGradient.addColorStop(0, palette.finStart);
  finGradient.addColorStop(1, palette.finEnd);

  const capGradient = ctx.createLinearGradient(0, 0, 0, topHeight);
  capGradient.addColorStop(0, palette.capStart);
  capGradient.addColorStop(1, palette.capEnd);

  const drawPipe = (x, y, pipeHeight, upsideDown) => {
    if (pipeHeight <= 0) {
      return;
    }

    const tipSize = Math.min(32, pipeHeight * 0.35);
    const bodyY = upsideDown ? y + tipSize : y;
    const bodyHeight = pipeHeight - tipSize;
    const tipY = upsideDown ? y : y + bodyHeight;

    if (bodyHeight > 0) {
      ctx.fillStyle = bodyGradient;
      ctx.fillRect(x, bodyY, obstacle.width, bodyHeight);

      ctx.fillStyle = "rgba(255,255,255,0.23)";
      ctx.fillRect(x + obstacle.width * 0.22, bodyY, obstacle.width * 0.12, bodyHeight);

      ctx.fillStyle = finGradient;
      ctx.fillRect(x - 6, bodyY + 15, 7, Math.max(14, bodyHeight * 0.2));
      ctx.fillRect(x + obstacle.width - 1, bodyY + 15, 7, Math.max(14, bodyHeight * 0.2));
    }

    ctx.fillStyle = capGradient;
    ctx.beginPath();
    if (upsideDown) {
      ctx.moveTo(x, tipY + tipSize);
      ctx.lineTo(x + obstacle.width * 0.5, tipY);
      ctx.lineTo(x + obstacle.width, tipY + tipSize);
    } else {
      ctx.moveTo(x, tipY);
      ctx.lineTo(x + obstacle.width * 0.5, tipY + tipSize);
      ctx.lineTo(x + obstacle.width, tipY);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = palette.rim;
    ctx.fillRect(x - 2, upsideDown ? y + pipeHeight - 6 : y - 4, obstacle.width + 4, 8);
  };

  drawPipe(obstacle.x, 0, topHeight, false);
  drawPipe(obstacle.x, bottomY, bottomHeight, true);
}

function drawPipeCap(ctx, image, x, y, width, height, flipped) {
  ctx.save();
  ctx.translate(x + width * 0.5, y + height * 0.5);
  if (flipped) {
    ctx.rotate(Math.PI);
  }
  ctx.drawImage(image, -width * 0.5, -height * 0.5, width, height);
  ctx.restore();
}

function drawObstacle(ctx, obstacle, state) {
  const themeIndex = obstacle.themeIndex ?? state.environment.activeIndex;
  const theme = GAME_CONFIG.environments[themeIndex] ?? GAME_CONFIG.environments[0];
  const sprites = ENVIRONMENT_SPRITES[themeIndex] ?? ENVIRONMENT_SPRITES[0];

  if (!sprites || !canDrawSprite(sprites.pipeBody)) {
    drawObstacleFallback(ctx, obstacle, state, theme);
    return;
  }

  const topHeight = obstacle.gapY - obstacle.gapHeight * 0.5;
  const bottomY = obstacle.gapY + obstacle.gapHeight * 0.5;
  const bottomHeight = state.world.height - bottomY;

  ctx.drawImage(sprites.pipeBody.image, obstacle.x, 0, obstacle.width, topHeight);
  ctx.drawImage(sprites.pipeBody.image, obstacle.x, bottomY, obstacle.width, bottomHeight);

  if (!canDrawSprite(sprites.pipeCap)) {
    return;
  }

  const capWidth = obstacle.width * 1.34;
  const capHeight = capWidth * (sprites.pipeCap.image.height / sprites.pipeCap.image.width);
  const capX = obstacle.x - (capWidth - obstacle.width) * 0.5;

  drawPipeCap(ctx, sprites.pipeCap.image, capX, topHeight - capHeight * 0.52, capWidth, capHeight, true);
  drawPipeCap(ctx, sprites.pipeCap.image, capX, bottomY - capHeight * 0.48, capWidth, capHeight, false);
}

function drawCollectible(ctx, collectible, pulse, environment) {
  const ringRadius = collectible.radius + Math.sin(pulse) * 1.8;

  ctx.save();
  ctx.strokeStyle = environment.collectible.outer;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(collectible.x, collectible.y, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = environment.collectible.inner;
  ctx.beginPath();
  ctx.arc(collectible.x, collectible.y, collectible.radius * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPlayerFallback(ctx, player) {
  const rocketBody = ctx.createLinearGradient(-16, -10, 16, 20);
  rocketBody.addColorStop(0, "#c6d2dc");
  rocketBody.addColorStop(0.45, "#f4f7fb");
  rocketBody.addColorStop(1, "#8793a0");

  ctx.fillStyle = rocketBody;
  ctx.beginPath();
  ctx.roundRect(-12, -18, 24, 34, 12);
  ctx.fill();

  ctx.fillStyle = "#eb3b2e";
  ctx.beginPath();
  ctx.moveTo(-11, -18);
  ctx.lineTo(0, -30);
  ctx.lineTo(11, -18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#273443";
  ctx.beginPath();
  ctx.roundRect(-9, -7, 18, 13, 6);
  ctx.fill();

  ctx.fillStyle = "#ffe157";
  ctx.beginPath();
  ctx.arc(-3, -1, 4.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111820";
  ctx.beginPath();
  ctx.arc(-2, -1, 1.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff9f2b";
  ctx.beginPath();
  ctx.moveTo(2, 1);
  ctx.lineTo(9, 0);
  ctx.lineTo(2, 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e43526";
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.lineTo(-20, 4);
  ctx.lineTo(-12, 8);
  ctx.closePath();
  ctx.moveTo(12, -2);
  ctx.lineTo(20, 4);
  ctx.lineTo(12, 8);
  ctx.closePath();
  ctx.fill();

  const flame = 10 + Math.max(0, player.vy * 0.01);
  const flameGradient = ctx.createLinearGradient(0, 12, 0, 24 + flame);
  flameGradient.addColorStop(0, "#fff18b");
  flameGradient.addColorStop(0.45, "#ff9d2f");
  flameGradient.addColorStop(1, "#ff4b16");
  ctx.fillStyle = flameGradient;
  ctx.beginPath();
  ctx.moveTo(-5, 16);
  ctx.quadraticCurveTo(0, 26 + flame, 5, 16);
  ctx.closePath();
  ctx.fill();
}

function drawPlayerEffects(ctx, state) {
  const { player } = state;

  if (state.activePowerUp?.type === "shield" && state.shieldHitsRemaining > 0) {
    ctx.strokeStyle = "#fff6c0";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      player.x,
      player.y,
      player.radius + 8 + Math.sin(state.totalTime * 16) * 1.5,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }

  if (state.overheatTimer > 0) {
    ctx.strokeStyle = "#ff6037";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(
      player.x,
      player.y,
      player.radius + 11 + Math.sin(state.totalTime * 18) * 1.5,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }
}

function drawPlayer(ctx, state) {
  const { player } = state;
  const wobble = Math.sin(state.totalTime * 10) * 0.12;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(Math.max(-0.38, Math.min(0.38, player.vy / 800)) + wobble);

  if (state.invulnerabilityTimer > 0) {
    ctx.shadowColor = "#83ffef";
    ctx.shadowBlur = 15;
  }

  if (canDrawSprite(PLAYER_SPRITE)) {
    const spriteWidth = (player.radius + 7) * 3.4;
    const spriteHeight = spriteWidth * (PLAYER_SPRITE.image.height / PLAYER_SPRITE.image.width);
    ctx.drawImage(PLAYER_SPRITE.image, -spriteWidth * 0.54, -spriteHeight * 0.5, spriteWidth, spriteHeight);
  } else {
    drawPlayerFallback(ctx, player);
  }

  ctx.restore();
  drawPlayerEffects(ctx, state);
}

function drawTopProgressLine(ctx, state, environment) {
  const margin = 14;
  const y = 8;
  const width = state.world.width - margin * 2;
  const height = 9;
  const compact = state.world.width < 500;
  const progress = clamp(state.environment.progressToNext, 0, 1);
  const pointsToNext = Math.max(0, state.environment.nextMilestone - state.score);

  ctx.fillStyle = environment.hud.progressTrack;
  ctx.beginPath();
  ctx.roundRect(margin, y, width, height, 999);
  ctx.fill();

  const fillGradient = ctx.createLinearGradient(margin, 0, margin + width, 0);
  fillGradient.addColorStop(0, environment.hud.progressStart);
  fillGradient.addColorStop(1, environment.hud.progressEnd);
  ctx.fillStyle = fillGradient;
  ctx.beginPath();
  ctx.roundRect(margin, y, width * progress, height, 999);
  ctx.fill();

  ctx.strokeStyle = environment.hud.progressStroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(margin, y, width, height, 999);
  ctx.stroke();

  ctx.fillStyle = environment.hud.textSoft;
  ctx.font = compact ? "600 11px 'Chakra Petch', sans-serif" : "600 12px 'Chakra Petch', sans-serif";
  ctx.textAlign = "left";
  const leftLabel = compact
    ? `A${state.environment.activeIndex + 1}: ${environment.label}`
    : `Ambient ${state.environment.activeIndex + 1} · ${environment.label}`;
  ctx.fillText(leftLabel, margin, 30);

  ctx.textAlign = "right";
  ctx.fillText(compact ? `${pointsToNext} pts` : `${pointsToNext} pts per canvi`, state.world.width - margin, 30);
  ctx.textAlign = "left";
}

function drawHudPanel(ctx, x, y, w, h, environment) {
  ctx.fillStyle = environment.hud.panel;
  ctx.strokeStyle = environment.hud.stroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
}

function drawHud(ctx, state) {
  const environment = GAME_CONFIG.environments[state.environment.activeIndex] ?? GAME_CONFIG.environments[0];
  drawTopProgressLine(ctx, state, environment);

  const compact = state.world.width < 500;
  const panelWidth = Math.min(compact ? 360 : 430, state.world.width - 24);
  const panelX = 12;
  const panelY = 38;
  const panelHeight = compact ? 118 : 90;
  drawHudPanel(ctx, panelX, panelY, panelWidth, panelHeight, environment);

  const heatRatio = Math.max(0, Math.min(1, state.heat / 100));
  let barX;
  let barY;
  let barW;
  const barH = 13;

  ctx.fillStyle = environment.hud.text;

  if (compact) {
    ctx.font = "700 11px 'Chakra Petch', sans-serif";
    ctx.fillText(`Score: ${state.score}`, panelX + 10, panelY + 20);
    ctx.fillText(`Record: ${state.highScore}`, panelX + 10, panelY + 39);
    ctx.fillText(`Cargas: ${state.charges}/2`, panelX + 124, panelY + 20);
    ctx.fillText(`Fase: ${state.difficultyPhase}`, panelX + 124, panelY + 39);
    ctx.fillText(`Power: ${state.ui.activePowerLabel}`, panelX + 10, panelY + 58);
    ctx.fillText(`Hito: ${state.environment.nextMilestone}`, panelX + 124, panelY + 58);
    barX = panelX + 10;
    barY = panelY + 82;
    barW = panelWidth - 20;
  } else {
    ctx.font = "600 16px 'Chakra Petch', sans-serif";
    ctx.fillText(`Score: ${state.score}`, panelX + 12, panelY + 24);
    ctx.fillText(`Record: ${state.highScore}`, panelX + 12, panelY + 46);
    ctx.fillText(`Cargas: ${state.charges}/2`, panelX + 122, panelY + 24);
    ctx.fillText(`Dificultad: ${state.difficultyPhase}`, panelX + 122, panelY + 46);
    ctx.fillText(`Power: ${state.ui.activePowerLabel}`, panelX + 260, panelY + 24);
    ctx.fillText(`Siguiente hito: ${state.environment.nextMilestone}`, panelX + 260, panelY + 46);
    barX = panelX + 260;
    barY = panelY + 56;
    barW = 154;
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
  ctx.fillRect(barX, barY, barW, barH);

  const heatR = Math.round(lerp(68, 255, heatRatio));
  const heatG = Math.round(lerp(255, 110, heatRatio));
  const heatColor = `rgb(${heatR}, ${heatG}, 75)`;
  ctx.fillStyle = heatColor;
  ctx.fillRect(barX, barY, barW * heatRatio, barH);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.fillStyle = environment.hud.heatLabel;
  ctx.font = "600 12px 'Chakra Petch', sans-serif";
  ctx.fillText("Heat", barX, barY - 3);

  if (state.overheatTimer > 0) {
    ctx.fillStyle = environment.hud.overheat;
    ctx.font = "700 14px 'Chakra Petch', sans-serif";
    ctx.fillText(`OVERHEAT ${state.overheatTimer.toFixed(1)}s`, barX, compact ? panelY + 112 : panelY + 86);
  }
}

function drawPhaseBadge(ctx, state) {
  if (state.environment.labelTimer <= 0 || state.world.width < 500) {
    return;
  }

  const environment = GAME_CONFIG.environments[state.environment.activeIndex] ?? GAME_CONFIG.environments[0];
  const total = GAME_CONFIG.progression.labelDuration || 1;
  const elapsedRatio = 1 - state.environment.labelTimer / total;
  const fadeIn = clamp(elapsedRatio / 0.2, 0, 1);
  const fadeOut = clamp(state.environment.labelTimer / 0.35, 0, 1);
  const alpha = Math.min(fadeIn, fadeOut);

  const width = Math.min(360, state.world.width - 80);
  const height = 38;
  const x = (state.world.width - width) * 0.5;
  const y = state.world.width < 500 ? 118 : 44;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = environment.phaseBadge.bg;
  ctx.strokeStyle = environment.phaseBadge.border;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 999);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = environment.phaseBadge.text;
  ctx.font = "700 15px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Ambient: ${environment.label}`, state.world.width * 0.5, y + 25);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawCenterCard(ctx, state, title, subtitle, lines) {
  const compact = state.world.width < 500;
  const cardWidth = Math.min(compact ? 460 : 560, state.world.width - (compact ? 26 : 80));
  const cardHeight = compact ? 280 : 250;
  const x = (state.world.width - cardWidth) / 2;
  const y = (state.world.height - cardHeight) / 2;

  ctx.fillStyle = "rgba(7, 28, 61, 0.82)";
  ctx.strokeStyle = "rgba(141, 232, 255, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, cardWidth, cardHeight, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f2ffff";
  ctx.textAlign = "center";
  ctx.font = compact ? "700 24px 'Bungee', sans-serif" : "700 30px 'Bungee', sans-serif";
  ctx.fillText(title, state.world.width / 2, y + (compact ? 48 : 56));

  ctx.font = compact ? "600 15px 'Chakra Petch', sans-serif" : "600 17px 'Chakra Petch', sans-serif";
  ctx.fillStyle = "#bceeff";
  ctx.fillText(subtitle, state.world.width / 2, y + (compact ? 78 : 90));

  ctx.font = compact ? "500 14px 'Chakra Petch', sans-serif" : "500 16px 'Chakra Petch', sans-serif";
  ctx.fillStyle = "#ecffff";

  let cursorY = y + (compact ? 110 : 124);
  for (const line of lines) {
    ctx.fillText(line, state.world.width / 2, cursorY);
    cursorY += compact ? 24 : 26;
  }

  ctx.textAlign = "left";
}

function drawModeOverlay(ctx, state) {
  const compact = state.world.width < 500;

  if (state.mode === "menu") {
    drawCenterCard(
      ctx,
      state,
      "Sky Circuits",
      "Runs tacticas con 3 ambientes",
      compact
        ? [
            "Space o tap: flap",
            "Shift o boton: power-up",
            "Cada 50 puntos cambia ambiente",
            "F: fullscreen | P: pausa",
            "Click o Space para empezar",
          ]
        : [
            "Space o tap: flap",
            "Shift o boton Power: activar power-up",
            "Cada 50 puntos cambia el ambiente",
            "F: fullscreen | P: pausar | R: reiniciar",
            "Click o Space para empezar",
          ]
    );
    return;
  }

  if (state.mode === "paused") {
    drawCenterCard(
      ctx,
      state,
      "Pausa táctica",
      "Respira, observa y reengancha",
      compact
        ? [
            "Pulsa P para continuar",
            "Space o tap reanudan la run",
            "Planifica el próximo power-up",
          ]
        : [
            "Pulsa P para continuar",
            "Space o tap también reanudan la run",
            "Usa esta pausa para planear el próximo power-up",
          ]
    );
    return;
  }

  if (state.mode === "gameover") {
    drawCenterCard(
      ctx,
      state,
      "Game Over",
      `Score ${state.score} | Record ${state.highScore}`,
      compact
        ? [
            "Gestiona heat para evitar OVERHEAT",
            "Recoge aros para cargar power-ups",
            "Pulsa R, Space o tap para reiniciar",
          ]
        : [
            "Gestiona mejor el heat para evitar OVERHEAT",
            "Busca aros en rutas de riesgo para cargar power-ups",
            "Pulsa R, Space o tap para reiniciar",
          ]
    );
  }
}

export function renderGame(ctx, state) {
  drawBackground(ctx, state);

  for (const obstacle of state.obstacles) {
    drawObstacle(ctx, obstacle, state);
  }

  const pulse = state.totalTime * 12;
  const activeEnvironment = GAME_CONFIG.environments[state.environment.activeIndex] ?? GAME_CONFIG.environments[0];
  for (const collectible of state.collectibles) {
    drawCollectible(ctx, collectible, pulse, activeEnvironment);
  }

  drawPlayer(ctx, state);
  drawHud(ctx, state);
  drawPhaseBadge(ctx, state);
  drawModeOverlay(ctx, state);
}
