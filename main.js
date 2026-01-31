import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";

const root = document.getElementById("game-root");
const goldEl = document.getElementById("gold");
const livesEl = document.getElementById("lives");
const waveEl = document.getElementById("wave");
const statusEl = document.getElementById("status");
const buildButton = document.getElementById("build-tower");
const startWaveButton = document.getElementById("start-wave");

const config = {
  tileSize: 64,
  gridWidth: 12,
  gridHeight: 9,
};

const assetUrls = {
  tower: "assets/tower.svg",
  enemy: "assets/enemy.svg",
};

const boardWidth = config.tileSize * config.gridWidth;
const boardHeight = config.tileSize * config.gridHeight;

const towerCost = 50;
const towerRange = 150;
const towerFireRate = 1.0;
const towerDamage = 12;
const bulletSpeed = 280;

const state = {
  gold: 120,
  lives: 12,
  wave: 0,
  isPlacing: false,
  waveInProgress: false,
  gameOver: false,
  enemiesToSpawn: 0,
  spawnInterval: 0.8,
  spawnTimer: 0,
  towers: [],
  enemies: [],
  bullets: [],
};

const pathNodes = [
  { x: 0, y: 4 },
  { x: 3, y: 4 },
  { x: 3, y: 1 },
  { x: 8, y: 1 },
  { x: 8, y: 6 },
  { x: 11, y: 6 },
];

const pathCells = buildPathCells(pathNodes);
const pathKeySet = new Set(pathCells.map((cell) => `${cell.x},${cell.y}`));
const pathWaypoints = pathCells.map((cell) => cellCenter(cell));

const app = new PIXI.Application();
await app.init({
  width: window.innerWidth,
  height: window.innerHeight,
  background: 0x101318,
  antialias: true,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
});
root.appendChild(app.canvas);

await PIXI.Assets.load([assetUrls.tower, assetUrls.enemy]);
const textures = {
  tower: PIXI.Texture.from(assetUrls.tower),
  enemy: PIXI.Texture.from(assetUrls.enemy),
};

const boardContainer = new PIXI.Container();
boardContainer.eventMode = "static";
boardContainer.interactive = true;
boardContainer.hitArea = new PIXI.Rectangle(0, 0, boardWidth, boardHeight);
app.stage.addChild(boardContainer);

const background = new PIXI.Graphics();
background.beginFill(0x1b1f26);
background.drawRect(0, 0, boardWidth, boardHeight);
background.endFill();
boardContainer.addChild(background);

const pathGraphics = new PIXI.Graphics();
pathGraphics.beginFill(0x2a303b);
for (const cell of pathCells) {
  pathGraphics.drawRect(
    cell.x * config.tileSize,
    cell.y * config.tileSize,
    config.tileSize,
    config.tileSize
  );
}
pathGraphics.endFill();
boardContainer.addChild(pathGraphics);

const gridGraphics = new PIXI.Graphics();
gridGraphics.lineStyle(1, 0xffffff, 0.08);
for (let x = 0; x <= config.gridWidth; x += 1) {
  gridGraphics.moveTo(x * config.tileSize, 0);
  gridGraphics.lineTo(x * config.tileSize, boardHeight);
}
for (let y = 0; y <= config.gridHeight; y += 1) {
  gridGraphics.moveTo(0, y * config.tileSize);
  gridGraphics.lineTo(boardWidth, y * config.tileSize);
}
boardContainer.addChild(gridGraphics);

const startMarker = new PIXI.Graphics();
startMarker.beginFill(0x3ecf8e);
startMarker.drawCircle(0, 0, 8);
startMarker.endFill();
const startPos = pathWaypoints[0];
startMarker.position.set(startPos.x, startPos.y);
boardContainer.addChild(startMarker);

const endMarker = new PIXI.Graphics();
endMarker.beginFill(0xffb347);
endMarker.drawCircle(0, 0, 8);
endMarker.endFill();
const endPos = pathWaypoints[pathWaypoints.length - 1];
endMarker.position.set(endPos.x, endPos.y);
boardContainer.addChild(endMarker);

const towersLayer = new PIXI.Container();
const enemiesLayer = new PIXI.Container();
const bulletsLayer = new PIXI.Container();
boardContainer.addChild(towersLayer, enemiesLayer, bulletsLayer);

const placementHighlight = new PIXI.Graphics();
placementHighlight.visible = false;
boardContainer.addChild(placementHighlight);

layoutBoard();
window.addEventListener("resize", layoutBoard);

boardContainer.on("pointerdown", handleBoardPointerDown);
boardContainer.on("pointermove", handleBoardPointerMove);
boardContainer.on("pointerout", () => {
  placementHighlight.visible = false;
});

buildButton.addEventListener("click", () => {
  setBuildMode(!state.isPlacing);
});

startWaveButton.addEventListener("click", () => {
  if (state.gameOver) {
    return;
  }
  if (state.waveInProgress) {
    setStatus("Wave already running.");
    return;
  }
  startWave();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setBuildMode(false);
  }
});

updateUI();
updateButtons();

app.ticker.add(() => {
  updateGame(app.ticker.deltaMS / 1000);
});

function layoutBoard() {
  app.renderer.resize(window.innerWidth, window.innerHeight);
  boardContainer.x = Math.round((app.screen.width - boardWidth) / 2);
  boardContainer.y = Math.round((app.screen.height - boardHeight) / 2);
}

function updateGame(deltaSec) {
  if (state.gameOver) {
    return;
  }

  updateSpawning(deltaSec);
  updateTowers(deltaSec);
  updateBullets(deltaSec);
  updateEnemies(deltaSec);

  if (
    state.waveInProgress &&
    state.enemiesToSpawn <= 0 &&
    state.enemies.length === 0
  ) {
    state.waveInProgress = false;
    setStatus(`Wave ${state.wave} cleared. Ready for the next wave.`);
    updateButtons();
  }
}

function startWave() {
  state.wave += 1;
  state.waveInProgress = true;
  state.enemiesToSpawn = 6 + state.wave * 2;
  state.spawnInterval = Math.max(0.35, 0.9 - state.wave * 0.05);
  state.spawnTimer = 0;
  setStatus(`Wave ${state.wave} started.`);
  updateUI();
  updateButtons();
}

function updateSpawning(deltaSec) {
  if (!state.waveInProgress || state.enemiesToSpawn <= 0) {
    return;
  }

  state.spawnTimer -= deltaSec;
  while (state.spawnTimer <= 0 && state.enemiesToSpawn > 0) {
    spawnEnemy();
    state.enemiesToSpawn -= 1;
    state.spawnTimer += state.spawnInterval;
  }
}

function spawnEnemy() {
  const maxHp = 40 + state.wave * 14;
  const enemy = {
    hp: maxHp,
    maxHp,
    speed: 45 + state.wave * 4,
    reward: 12 + state.wave * 2,
    waypointIndex: 0,
    sprite: new PIXI.Container(),
    hpBar: new PIXI.Graphics(),
    isRemoved: false,
  };

  const body = new PIXI.Sprite(textures.enemy);
  body.anchor.set(0.5);
  body.width = 36;
  body.height = 36;
  enemy.sprite.addChild(body);

  enemy.hpBar.y = -26;
  enemy.sprite.addChild(enemy.hpBar);
  updateEnemyHpBar(enemy);

  const start = pathWaypoints[0];
  enemy.sprite.position.set(start.x, start.y);
  enemiesLayer.addChild(enemy.sprite);
  state.enemies.push(enemy);
}

function updateEnemies(deltaSec) {
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];

    if (enemy.hp <= 0) {
      handleEnemyKilled(enemy, i);
      continue;
    }

    if (enemy.waypointIndex >= pathWaypoints.length - 1) {
      handleEnemyEscaped(enemy, i);
      continue;
    }

    const nextPoint = pathWaypoints[enemy.waypointIndex + 1];
    if (!nextPoint) {
      handleEnemyEscaped(enemy, i);
      continue;
    }

    const dx = nextPoint.x - enemy.sprite.x;
    const dy = nextPoint.y - enemy.sprite.y;
    const distance = Math.hypot(dx, dy);
    const step = enemy.speed * deltaSec;

    if (distance <= step) {
      enemy.sprite.position.set(nextPoint.x, nextPoint.y);
      enemy.waypointIndex += 1;
    } else {
      enemy.sprite.x += (dx / distance) * step;
      enemy.sprite.y += (dy / distance) * step;
    }

    updateEnemyHpBar(enemy);
  }
}

function updateTowers(deltaSec) {
  for (const tower of state.towers) {
    tower.cooldown -= deltaSec;
    if (tower.cooldown > 0) {
      continue;
    }

    const target = findTarget(tower);
    if (!target) {
      continue;
    }

    fireBullet(tower, target);
    tower.cooldown = 1 / tower.fireRate;
  }
}

function updateBullets(deltaSec) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    const target = bullet.target;
    if (!target || target.isRemoved) {
      removeBulletAt(i);
      continue;
    }

    const dx = target.sprite.x - bullet.sprite.x;
    const dy = target.sprite.y - bullet.sprite.y;
    const distance = Math.hypot(dx, dy);
    const step = bullet.speed * deltaSec;

    if (distance <= step) {
      target.hp -= bullet.damage;
      removeBulletAt(i);
      continue;
    }

    bullet.sprite.x += (dx / distance) * step;
    bullet.sprite.y += (dy / distance) * step;
  }
}

function findTarget(tower) {
  const rangeSq = tower.range * tower.range;
  let closest = null;
  let closestDist = Infinity;

  for (const enemy of state.enemies) {
    if (enemy.isRemoved) {
      continue;
    }
    const dx = enemy.sprite.x - tower.sprite.x;
    const dy = enemy.sprite.y - tower.sprite.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= rangeSq && distSq < closestDist) {
      closest = enemy;
      closestDist = distSq;
    }
  }

  return closest;
}

function fireBullet(tower, target) {
  const bulletGraphic = new PIXI.Graphics();
  bulletGraphic.beginFill(0xffe29a);
  bulletGraphic.drawCircle(0, 0, 4);
  bulletGraphic.endFill();
  bulletGraphic.position.set(tower.sprite.x, tower.sprite.y);
  bulletsLayer.addChild(bulletGraphic);

  state.bullets.push({
    sprite: bulletGraphic,
    target,
    speed: bulletSpeed,
    damage: tower.damage,
  });
}

function handleEnemyKilled(enemy, index) {
  state.gold += enemy.reward;
  updateUI();
  removeEnemyAt(index);
}

function handleEnemyEscaped(enemy, index) {
  state.lives -= 1;
  updateUI();
  removeEnemyAt(index);
  setStatus("An enemy slipped through.");

  if (state.lives <= 0) {
    triggerGameOver();
  }
}

function triggerGameOver() {
  state.gameOver = true;
  state.waveInProgress = false;
  setBuildMode(false);
  setStatus("Game over. Refresh the page to try again.");
  updateButtons();
}

function removeEnemyAt(index) {
  const enemy = state.enemies[index];
  enemy.isRemoved = true;
  enemiesLayer.removeChild(enemy.sprite);
  enemy.sprite.destroy({ children: true });
  state.enemies.splice(index, 1);
}

function removeBulletAt(index) {
  const bullet = state.bullets[index];
  bulletsLayer.removeChild(bullet.sprite);
  bullet.sprite.destroy();
  state.bullets.splice(index, 1);
}

function createTower(cell) {
  const towerContainer = new PIXI.Container();
  towerContainer.position.set(
    cell.x * config.tileSize + config.tileSize / 2,
    cell.y * config.tileSize + config.tileSize / 2
  );

  const rangeRing = new PIXI.Graphics();
  rangeRing.lineStyle(2, 0x6fe3ff, 0.18);
  rangeRing.drawCircle(0, 0, towerRange);
  towerContainer.addChild(rangeRing);

  const towerSprite = new PIXI.Sprite(textures.tower);
  towerSprite.anchor.set(0.5);
  towerSprite.width = 52;
  towerSprite.height = 52;
  towerContainer.addChild(towerSprite);

  towersLayer.addChild(towerContainer);

  return {
    sprite: towerContainer,
    range: towerRange,
    fireRate: towerFireRate,
    damage: towerDamage,
    cooldown: 0,
    cellKey: `${cell.x},${cell.y}`,
  };
}

function handleBoardPointerDown(event) {
  if (!state.isPlacing || state.gameOver) {
    return;
  }

  const cell = getCellFromEvent(event);
  if (!cell) {
    return;
  }

  const cellKey = `${cell.x},${cell.y}`;
  if (pathKeySet.has(cellKey)) {
    setStatus("Cannot build on the path.");
    return;
  }
  if (state.towers.some((tower) => tower.cellKey === cellKey)) {
    setStatus("That tile already has a tower.");
    return;
  }
  if (state.gold < towerCost) {
    setStatus("Not enough gold.");
    return;
  }

  const tower = createTower(cell);
  state.towers.push(tower);
  state.gold -= towerCost;
  updateUI();
  setStatus("Tower deployed.");
}

function handleBoardPointerMove(event) {
  if (!state.isPlacing || state.gameOver) {
    placementHighlight.visible = false;
    return;
  }

  const cell = getCellFromEvent(event);
  if (!cell) {
    placementHighlight.visible = false;
    return;
  }

  const valid = canPlaceTower(cell);
  placementHighlight.clear();
  placementHighlight.beginFill(valid ? 0x45f57a : 0xf56262);
  placementHighlight.drawRect(
    cell.x * config.tileSize,
    cell.y * config.tileSize,
    config.tileSize,
    config.tileSize
  );
  placementHighlight.endFill();
  placementHighlight.visible = true;
}

function canPlaceTower(cell) {
  const cellKey = `${cell.x},${cell.y}`;
  if (pathKeySet.has(cellKey)) {
    return false;
  }
  if (state.towers.some((tower) => tower.cellKey === cellKey)) {
    return false;
  }
  if (state.gold < towerCost) {
    return false;
  }
  return true;
}

function getCellFromEvent(event) {
  const local = event.data
    ? event.data.getLocalPosition(boardContainer)
    : event.getLocalPosition(boardContainer);

  const cellX = Math.floor(local.x / config.tileSize);
  const cellY = Math.floor(local.y / config.tileSize);

  if (
    cellX < 0 ||
    cellX >= config.gridWidth ||
    cellY < 0 ||
    cellY >= config.gridHeight
  ) {
    return null;
  }

  return { x: cellX, y: cellY };
}

function setBuildMode(active) {
  state.isPlacing = Boolean(active);
  placementHighlight.visible = false;
  updateButtons();

  if (state.isPlacing) {
    setStatus("Build mode active. Choose a tile.");
  } else {
    setStatus("Build mode canceled.");
  }
}

function updateEnemyHpBar(enemy) {
  const width = 28;
  const ratio = Math.max(0, enemy.hp) / enemy.maxHp;
  enemy.hpBar.clear();
  enemy.hpBar.beginFill(0x1a1a1a);
  enemy.hpBar.drawRect(-width / 2, 0, width, 4);
  enemy.hpBar.endFill();
  enemy.hpBar.beginFill(0x6fe36f);
  enemy.hpBar.drawRect(-width / 2, 0, width * ratio, 4);
  enemy.hpBar.endFill();
}

function updateUI() {
  goldEl.textContent = state.gold;
  livesEl.textContent = state.lives;
  waveEl.textContent = state.wave;
}

function updateButtons() {
  buildButton.textContent = state.isPlacing
    ? "Cancel Build"
    : `Build Tower (${towerCost})`;
  buildButton.disabled = state.gameOver;
  startWaveButton.disabled = state.gameOver || state.waveInProgress;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function buildPathCells(nodes) {
  const cells = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const start = nodes[i];
    const end = nodes[i + 1];
    const stepX = Math.sign(end.x - start.x);
    const stepY = Math.sign(end.y - start.y);
    let x = start.x;
    let y = start.y;

    if (i === 0) {
      cells.push({ x, y });
    }

    while (x !== end.x || y !== end.y) {
      x += stepX;
      y += stepY;
      cells.push({ x, y });
    }
  }
  return cells;
}

function cellCenter(cell) {
  return {
    x: cell.x * config.tileSize + config.tileSize / 2,
    y: cell.y * config.tileSize + config.tileSize / 2,
  };
}
