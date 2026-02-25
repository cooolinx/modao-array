import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";
import {
  tileSize,
  gridWidth,
  gridHeight,
  boardWidth,
  boardHeight,
  assetUrls,
  towerTypes,
} from "./src/config.js";
import { createInitialState } from "./src/GameState.js";
import {
  pathCells,
  pathKeySet,
  pathWaypoints,
} from "./src/PathSystem.js";
import { Tower } from "./src/entities/Tower.js";
import { updateSpawning } from "./src/systems/SpawnSystem.js";
import { updateTowers, updateBullets } from "./src/systems/CombatSystem.js";
import { updateEnemies } from "./src/systems/EnemySystem.js";
import { updateUI, updateButtons, setStatus } from "./src/ui/HUD.js";

// DOM 元素
const startScreen = document.getElementById("start-screen");
const startGameBtn = document.getElementById("start-game-btn");
const root = document.getElementById("game-root");
const goldEl = document.getElementById("gold");
const livesEl = document.getElementById("lives");
const waveEl = document.getElementById("wave");
const statusEl = document.getElementById("status");
const buildButton = document.getElementById("build-tower");
const startWaveButton = document.getElementById("start-wave");
const toggleUiButton = document.getElementById("toggle-ui");
const gameUi = document.getElementById("game-ui");

// DOM 元素引用对象（传给 HUD 等模块）
const elements = { goldEl, livesEl, waveEl, statusEl, buildButton, startWaveButton };

// 游戏状态
let state = createInitialState();

// PIXI 层引用
let app;
let boardContainer;
let towersLayer;
let enemiesLayer;
let bulletsLayer;
let placementHighlight;
let textures;

// 依赖包（传给各系统）
function makeDeps() {
  return {
    textures,
    pathWaypoints,
    enemiesLayer,
    bulletsLayer,
    elements,
    onGameOver: triggerGameOver,
  };
}

// ─── 开始按钮 ────────────────────────────────────────────────────────────────
startGameBtn.addEventListener("click", async () => {
  startScreen.classList.add("hidden");
  root.classList.remove("hidden");
  await initGame();
});

// ─── 初始化 ──────────────────────────────────────────────────────────────────
async function initGame() {
  app = new PIXI.Application();
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
  textures = {
    tower: PIXI.Texture.from(assetUrls.tower),
    enemy: PIXI.Texture.from(assetUrls.enemy),
  };

  boardContainer = new PIXI.Container();
  boardContainer.eventMode = "static";
  boardContainer.interactive = true;
  boardContainer.hitArea = new PIXI.Rectangle(0, 0, boardWidth, boardHeight);
  app.stage.addChild(boardContainer);

  // 背景
  const background = new PIXI.Graphics();
  background.beginFill(0x1b1f26);
  background.drawRect(0, 0, boardWidth, boardHeight);
  background.endFill();
  boardContainer.addChild(background);

  // 路径渲染
  const pathGraphics = new PIXI.Graphics();
  pathGraphics.beginFill(0x2a303b);
  for (const cell of pathCells) {
    pathGraphics.drawRect(
      cell.x * tileSize,
      cell.y * tileSize,
      tileSize,
      tileSize
    );
  }
  pathGraphics.endFill();
  boardContainer.addChild(pathGraphics);

  // 网格线
  const gridGraphics = new PIXI.Graphics();
  gridGraphics.lineStyle(1, 0xffffff, 0.08);
  for (let x = 0; x <= gridWidth; x += 1) {
    gridGraphics.moveTo(x * tileSize, 0);
    gridGraphics.lineTo(x * tileSize, boardHeight);
  }
  for (let y = 0; y <= gridHeight; y += 1) {
    gridGraphics.moveTo(0, y * tileSize);
    gridGraphics.lineTo(boardWidth, y * tileSize);
  }
  boardContainer.addChild(gridGraphics);

  // 路径起点/终点标记
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

  towersLayer = new PIXI.Container();
  enemiesLayer = new PIXI.Container();
  bulletsLayer = new PIXI.Container();
  boardContainer.addChild(towersLayer, enemiesLayer, bulletsLayer);

  placementHighlight = new PIXI.Graphics();
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

  toggleUiButton.addEventListener("click", () => {
    state.uiCollapsed = !state.uiCollapsed;
    root.classList.toggle("ui-collapsed", state.uiCollapsed);
    toggleUiButton.textContent = state.uiCollapsed ? "展开面板" : "收起面板";
    toggleUiButton.setAttribute("aria-expanded", String(!state.uiCollapsed));
    layoutBoard();
  });

  startWaveButton.addEventListener("click", () => {
    if (state.gameOver) return;
    if (state.waveInProgress) {
      setStatus("此波尚未结束", elements);
      return;
    }
    startWave();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setBuildMode(false);
    }
  });

  updateUI(state, elements);
  updateButtons(state, elements);
  setStatus("万劫魔宫，严阵以待", elements);

  app.ticker.add(() => {
    updateGame(app.ticker.deltaMS / 1000);
  });
}

// ─── 布局 ────────────────────────────────────────────────────────────────────
function layoutBoard() {
  app.renderer.resize(window.innerWidth, window.innerHeight);
  const horizontalPadding = 16;
  const verticalPadding = 16;
  const uiGap = 12;
  const uiHeight = state.uiCollapsed
    ? 0
    : gameUi.getBoundingClientRect().height;
  const topInset = (uiHeight ? uiHeight + uiGap : 0) + verticalPadding;
  const availableWidth = Math.max(0, app.screen.width - horizontalPadding * 2);
  const availableHeight = Math.max(
    0,
    app.screen.height - topInset - verticalPadding
  );
  const scale = Math.min(
    availableWidth / boardWidth,
    availableHeight / boardHeight,
    1
  );

  boardContainer.scale.set(scale);
  const scaledWidth = boardWidth * scale;
  const scaledHeight = boardHeight * scale;
  boardContainer.x = Math.round((app.screen.width - scaledWidth) / 2);
  boardContainer.y = Math.round(
    topInset + (availableHeight - scaledHeight) / 2
  );
}

// ─── 游戏主循环 ──────────────────────────────────────────────────────────────
function updateGame(deltaSec) {
  if (state.gameOver) return;

  const deps = makeDeps();
  updateSpawning(state, deltaSec, deps);
  updateTowers(state, deltaSec, deps);
  updateBullets(state, deltaSec, deps);
  updateEnemies(state, deltaSec, deps);

  // 波次结束检测
  if (
    state.waveInProgress &&
    state.enemiesToSpawn <= 0 &&
    state.enemies.length === 0
  ) {
    state.waveInProgress = false;
    setStatus(`第 ${state.wave} 波已退，养精蓄锐`, elements);
    updateButtons(state, elements);
  }
}

// ─── 波次管理 ────────────────────────────────────────────────────────────────
function startWave() {
  state.wave += 1;
  state.waveInProgress = true;
  state.enemiesToSpawn = 6 + state.wave * 2;
  state.spawnInterval = Math.max(0.35, 0.9 - state.wave * 0.05);
  state.spawnTimer = 0;
  setStatus(`第 ${state.wave} 波正道来袭！`, elements);
  updateUI(state, elements);
  updateButtons(state, elements);
}

// ─── 游戏结束 ────────────────────────────────────────────────────────────────
function triggerGameOver() {
  state.gameOver = true;
  state.waveInProgress = false;
  setBuildMode(false);
  setStatus("魔宫陷落！刷新页面重来", elements);
  updateButtons(state, elements);
}

// ─── 筑塔逻辑 ────────────────────────────────────────────────────────────────
function handleBoardPointerDown(event) {
  if (!state.isPlacing || state.gameOver) return;

  const cell = getCellFromEvent(event);
  if (!cell) return;

  const cellKey = `${cell.x},${cell.y}`;
  if (pathKeySet.has(cellKey)) {
    setStatus("此处乃通路，不可筑塔", elements);
    return;
  }
  if (state.towers.some((t) => t.cellKey === cellKey)) {
    setStatus("此格已有防御，无需再筑", elements);
    return;
  }
  const cost = towerTypes.basic.cost;
  if (state.gold < cost) {
    setStatus("灵石不足", elements);
    return;
  }

  const tower = new Tower({ cell, texture: textures.tower, config: towerTypes.basic });
  towersLayer.addChild(tower.sprite);
  state.towers.push(tower);
  state.gold -= cost;
  updateUI(state, elements);
  setStatus("防御塔已落成", elements);
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
    cell.x * tileSize,
    cell.y * tileSize,
    tileSize,
    tileSize
  );
  placementHighlight.endFill();
  placementHighlight.visible = true;
}

function canPlaceTower(cell) {
  const cellKey = `${cell.x},${cell.y}`;
  if (pathKeySet.has(cellKey)) return false;
  if (state.towers.some((t) => t.cellKey === cellKey)) return false;
  if (state.gold < towerTypes.basic.cost) return false;
  return true;
}

function getCellFromEvent(event) {
  const local = event.data
    ? event.data.getLocalPosition(boardContainer)
    : event.getLocalPosition(boardContainer);

  const cellX = Math.floor(local.x / tileSize);
  const cellY = Math.floor(local.y / tileSize);

  if (
    cellX < 0 ||
    cellX >= gridWidth ||
    cellY < 0 ||
    cellY >= gridHeight
  ) {
    return null;
  }

  return { x: cellX, y: cellY };
}

function setBuildMode(active) {
  state.isPlacing = Boolean(active);
  if (placementHighlight) placementHighlight.visible = false;
  updateButtons(state, elements);

  if (state.isPlacing) {
    setStatus("筑塔模式，点击空格落塔", elements);
  } else {
    setStatus("取消筑塔", elements);
  }
}
