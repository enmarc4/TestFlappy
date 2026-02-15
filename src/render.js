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

const SPRITES = {
  player: loadSprite(new URL("../assets/sprites/player.png", import.meta.url).href),
  pipeBody: loadSprite(new URL("../assets/sprites/pipe-body.png", import.meta.url).href),
  pipeCap: loadSprite(new URL("../assets/sprites/pipe-cap.png", import.meta.url).href),
};

function drawBackground(ctx, state) {
  const { width, height } = state.world;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#8fd5ff");
  gradient.addColorStop(0.55, "#4ca9f4");
  gradient.addColorStop(1, "#1e69bb");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 8; i += 1) {
    const cloudX = ((i * 190 - state.totalTime * (22 + i * 1.2)) % (width + 220)) - 110;
    const cloudY = 60 + (i % 4) * 90 + Math.sin(state.totalTime * 0.6 + i) * 6;
    const cloudW = 120 + (i % 3) * 28;

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#f7fcff";
    ctx.beginPath();
    ctx.ellipse(cloudX, cloudY, cloudW * 0.26, 20, 0, 0, Math.PI * 2);
    ctx.ellipse(cloudX + cloudW * 0.18, cloudY - 10, cloudW * 0.18, 24, 0, 0, Math.PI * 2);
    ctx.ellipse(cloudX + cloudW * 0.34, cloudY, cloudW * 0.22, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawObstacleFallback(ctx, obstacle, state) {
  const topHeight = obstacle.gapY - obstacle.gapHeight * 0.5;
  const bottomY = obstacle.gapY + obstacle.gapHeight * 0.5;
  const bottomHeight = state.world.height - bottomY;

  const bodyGradient = ctx.createLinearGradient(obstacle.x, 0, obstacle.x + obstacle.width, 0);
  bodyGradient.addColorStop(0, "#596575");
  bodyGradient.addColorStop(0.5, "#a8b3c0");
  bodyGradient.addColorStop(1, "#4d5764");

  const finGradient = ctx.createLinearGradient(obstacle.x, 0, obstacle.x + obstacle.width, 0);
  finGradient.addColorStop(0, "#de3223");
  finGradient.addColorStop(1, "#ff604b");

  const capGradient = ctx.createLinearGradient(0, 0, 0, topHeight);
  capGradient.addColorStop(0, "#ff5a48");
  capGradient.addColorStop(1, "#ce2216");

  const drawRocketPipe = (x, y, pipeHeight, upsideDown) => {
    if (pipeHeight <= 0) return;

    const tipSize = Math.min(32, pipeHeight * 0.35);
    const bodyY = upsideDown ? y + tipSize : y;
    const bodyHeight = pipeHeight - tipSize;
    const tipY = upsideDown ? y : y + bodyHeight;

    if (bodyHeight > 0) {
      ctx.fillStyle = bodyGradient;
      ctx.fillRect(x, bodyY, obstacle.width, bodyHeight);

      ctx.fillStyle = "rgba(255,255,255,0.33)";
      ctx.fillRect(x + obstacle.width * 0.2, bodyY, obstacle.width * 0.14, bodyHeight);

      ctx.fillStyle = finGradient;
      ctx.fillRect(x - 7, bodyY + 16, 8, Math.max(14, bodyHeight * 0.22));
      ctx.fillRect(x + obstacle.width - 1, bodyY + 16, 8, Math.max(14, bodyHeight * 0.22));
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

    ctx.fillStyle = "#252b35";
    ctx.fillRect(x - 2, upsideDown ? y + pipeHeight - 6 : y - 4, obstacle.width + 4, 8);
  };

  drawRocketPipe(obstacle.x, 0, topHeight, false);
  drawRocketPipe(obstacle.x, bottomY, bottomHeight, true);
}

function drawPipeCap(ctx, x, y, width, height, flipped) {
  ctx.save();
  ctx.translate(x + width * 0.5, y + height * 0.5);
  if (flipped) {
    ctx.rotate(Math.PI);
  }
  ctx.drawImage(SPRITES.pipeCap.image, -width * 0.5, -height * 0.5, width, height);
  ctx.restore();
}

function drawObstacle(ctx, obstacle, state) {
  if (!canDrawSprite(SPRITES.pipeBody)) {
    drawObstacleFallback(ctx, obstacle, state);
    return;
  }

  const topHeight = obstacle.gapY - obstacle.gapHeight * 0.5;
  const bottomY = obstacle.gapY + obstacle.gapHeight * 0.5;
  const bottomHeight = state.world.height - bottomY;

  ctx.drawImage(SPRITES.pipeBody.image, obstacle.x, 0, obstacle.width, topHeight);
  ctx.drawImage(SPRITES.pipeBody.image, obstacle.x, bottomY, obstacle.width, bottomHeight);

  if (!canDrawSprite(SPRITES.pipeCap)) {
    return;
  }

  const capWidth = obstacle.width * 1.36;
  const capHeight = capWidth * (SPRITES.pipeCap.image.height / SPRITES.pipeCap.image.width);
  const capX = obstacle.x - (capWidth - obstacle.width) * 0.5;

  drawPipeCap(ctx, capX, topHeight - capHeight * 0.52, capWidth, capHeight, true);
  drawPipeCap(ctx, capX, bottomY - capHeight * 0.48, capWidth, capHeight, false);
}

function drawCollectible(ctx, collectible, pulse) {
  const ringRadius = collectible.radius + Math.sin(pulse) * 1.8;

  ctx.save();
  ctx.strokeStyle = "#f8ff87";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(collectible.x, collectible.y, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#ffdb3d";
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

  if (canDrawSprite(SPRITES.player)) {
    const spriteWidth = (player.radius + 7) * 3.4;
    const spriteHeight = spriteWidth * (SPRITES.player.image.height / SPRITES.player.image.width);
    ctx.drawImage(
      SPRITES.player.image,
      -spriteWidth * 0.54,
      -spriteHeight * 0.5,
      spriteWidth,
      spriteHeight
    );
  } else {
    drawPlayerFallback(ctx, player);
  }

  ctx.restore();
  drawPlayerEffects(ctx, state);
}

function drawHudPanel(ctx, x, y, w, h) {
  ctx.fillStyle = "rgba(8, 31, 64, 0.73)";
  ctx.strokeStyle = "rgba(176, 241, 255, 0.82)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
}

function drawHud(ctx, state) {
  const panelWidth = Math.min(360, state.world.width - 24);
  drawHudPanel(ctx, 12, 12, panelWidth, 84);

  ctx.fillStyle = "#ecffff";
  ctx.font = "600 16px 'Chakra Petch', sans-serif";
  ctx.fillText(`Score: ${state.score}`, 24, 36);
  ctx.fillText(`Record: ${state.highScore}`, 24, 58);
  ctx.fillText(`Cargas: ${state.charges}/2`, 130, 36);
  ctx.fillText(`Fase: ${state.difficultyPhase}`, 130, 58);
  ctx.fillText(`Power: ${state.ui.activePowerLabel}`, 230, 36);

  const heatRatio = Math.max(0, Math.min(1, state.heat / 100));
  const barX = 230;
  const barY = 48;
  const barW = 126;
  const barH = 13;
  ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
  ctx.fillRect(barX, barY, barW, barH);

  const heatR = Math.round(lerp(68, 255, heatRatio));
  const heatG = Math.round(lerp(255, 110, heatRatio));
  const heatColor = `rgb(${heatR}, ${heatG}, 75)`;
  ctx.fillStyle = heatColor;
  ctx.fillRect(barX, barY, barW * heatRatio, barH);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.strokeRect(barX, barY, barW, barH);

  if (state.overheatTimer > 0) {
    ctx.fillStyle = "#ff4d4d";
    ctx.font = "700 14px 'Chakra Petch', sans-serif";
    ctx.fillText(`OVERHEAT ${state.overheatTimer.toFixed(1)}s`, 230, 78);
  }
}

function drawCenterCard(ctx, state, title, subtitle, lines) {
  const cardWidth = Math.min(560, state.world.width - 80);
  const cardHeight = 250;
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
  ctx.font = "700 30px 'Bungee', sans-serif";
  ctx.fillText(title, state.world.width / 2, y + 56);

  ctx.font = "600 17px 'Chakra Petch', sans-serif";
  ctx.fillStyle = "#bceeff";
  ctx.fillText(subtitle, state.world.width / 2, y + 90);

  ctx.font = "500 16px 'Chakra Petch', sans-serif";
  ctx.fillStyle = "#ecffff";

  let cursorY = y + 124;
  for (const line of lines) {
    ctx.fillText(line, state.world.width / 2, cursorY);
    cursorY += 26;
  }

  ctx.textAlign = "left";
}

function drawModeOverlay(ctx, state) {
  if (state.mode === "menu") {
    drawCenterCard(ctx, state, "Sky Circuits", "Runs tacticas de 60-90s", [
      "Space o tap: flap",
      "Shift o boton Power: activar power-up",
      "Recoge aros para cargar habilidades (max 2)",
      "F: fullscreen | P: pausar | R: reiniciar",
      "Click o Space para empezar",
    ]);
    return;
  }


  if (state.mode === "paused") {
    drawCenterCard(ctx, state, "Pausa táctica", "Respira, observa y reengancha", [
      "Pulsa P para continuar",
      "Space o tap también reanudan la run",
      "Usa esta pausa para planear el próximo power-up",
    ]);
    return;
  }

  if (state.mode === "gameover") {
    drawCenterCard(ctx, state, "Game Over", `Score ${state.score} | Record ${state.highScore}`, [
      "Gestiona mejor el heat para evitar OVERHEAT",
      "Busca aros en rutas de riesgo para cargar power-ups",
      "Pulsa R, Space o tap para reiniciar",
    ]);
  }
}

export function renderGame(ctx, state) {
  drawBackground(ctx, state);

  for (const obstacle of state.obstacles) {
    drawObstacle(ctx, obstacle, state);
  }

  const pulse = state.totalTime * 12;
  for (const collectible of state.collectibles) {
    drawCollectible(ctx, collectible, pulse);
  }

  drawPlayer(ctx, state);
  drawHud(ctx, state);
  drawModeOverlay(ctx, state);
}
