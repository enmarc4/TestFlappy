function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawBackground(ctx, state) {
  const { width, height } = state.world;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#90faff");
  gradient.addColorStop(0.5, "#3ab9ff");
  gradient.addColorStop(1, "#0a4f8f");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.24;
  for (let i = 0; i < 24; i += 1) {
    const y = ((i * 46 + state.totalTime * 32) % (height + 50)) - 26;
    ctx.strokeStyle = i % 2 === 0 ? "#c7ffff" : "#93dcff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.lineTo(width + 10, y + (i % 4 === 0 ? 14 : -14));
    ctx.stroke();
  }
  ctx.restore();
}

function drawObstacle(ctx, obstacle, state) {
  const topHeight = obstacle.gapY - obstacle.gapHeight * 0.5;
  const bottomY = obstacle.gapY + obstacle.gapHeight * 0.5;
  const bottomHeight = state.world.height - bottomY;

  ctx.fillStyle = "#102f69";
  ctx.fillRect(obstacle.x, 0, obstacle.width, topHeight);
  ctx.fillRect(obstacle.x, bottomY, obstacle.width, bottomHeight);

  ctx.fillStyle = "#30f2ff";
  ctx.fillRect(obstacle.x - 2, topHeight - 10, obstacle.width + 4, 10);
  ctx.fillRect(obstacle.x - 2, bottomY, obstacle.width + 4, 10);

  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = "#93f9ff";
  ctx.fillRect(obstacle.x + obstacle.width * 0.22, 0, obstacle.width * 0.17, topHeight);
  ctx.fillRect(obstacle.x + obstacle.width * 0.22, bottomY, obstacle.width * 0.17, bottomHeight);
  ctx.restore();
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

  ctx.fillStyle = "#fff7d7";
  ctx.beginPath();
  ctx.ellipse(0, 0, player.radius + 3, player.radius - 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0f5089";
  ctx.beginPath();
  ctx.arc(6, -5, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff955f";
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(20, -2);
  ctx.lineTo(10, 4);
  ctx.closePath();
  ctx.fill();

  if (state.activePowerUp?.type === "shield" && state.shieldHitsRemaining > 0) {
    ctx.strokeStyle = "#89fff2";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 8 + Math.sin(state.totalTime * 16) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.overheatTimer > 0) {
    ctx.strokeStyle = "#ff6037";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 11 + Math.sin(state.totalTime * 18) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
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
      "F: fullscreen | R: reiniciar",
      "Click o Space para empezar",
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
