import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";
import {
  tileSize,
  gridWidth,
  gridHeight,
  boardWidth,
  boardHeight,
  assetUrls,
  chapterBackgrounds,
  towerTypes,
  wanguiConfig,
} from "./src/config.js";
import { createInitialState } from "./src/GameState.js";
import { buildPathCells } from "./src/PathSystem.js";
import { Tower } from "./src/entities/Tower.js";
import { Ghost } from "./src/entities/Ghost.js";
import { updateSpawning, buildSpawnQueueFromOverrides } from "./src/systems/SpawnSystem.js";
import { updateTowers, updateBullets } from "./src/systems/CombatSystem.js";
import { updateEnemies } from "./src/systems/EnemySystem.js";
import { updateGhosts } from "./src/systems/GhostSystem.js";
import { updateUI, updateButtons, setStatus, updateWanguiBtn } from "./src/ui/HUD.js";
import { campaigns } from "./src/levels/campaigns.js";
import { playWanguiActivate } from "./src/audio/SoundSystem.js";

// ─── DOM 元素 ────────────────────────────────────────────────────────────────
const startScreen = document.getElementById("start-screen");
const root = document.getElementById("game-root");
const goldEl = document.getElementById("gold");
const livesEl = document.getElementById("lives");
const waveEl = document.getElementById("wave");
const statusEl = document.getElementById("status");
const startWaveButton = document.getElementById("start-wave");
const toggleUiButton = document.getElementById("toggle-ui");
const gameUi = document.getElementById("game-ui");
const wanguiBtn = document.getElementById("wangui-btn");
const gameOverScreen = document.getElementById("game-over-screen");
const victoryScreen = document.getElementById("victory-screen");
const campaignScreen = document.getElementById("campaign-screen");
const levelScreen = document.getElementById("level-screen");

const elements = { goldEl, livesEl, waveEl, statusEl, startWaveButton };

// ─── 游戏状态 ────────────────────────────────────────────────────────────────
let state = createInitialState();
let currentLevel = null;   // 当前小关卡数据
let pathCells = [];
let pathKeySet = new Set();
let pathWaypoints = [];

// PIXI 层引用
let app;
let boardContainer;
let towersLayer;
let enemiesLayer;
let bulletsLayer;
let ghostsLayer;
let placementHighlight;
let textures;

// ─── 进度存储 ────────────────────────────────────────────────────────────────
function getCompleted() {
  try {
    return JSON.parse(localStorage.getItem("modao_completed") || "[]");
  } catch { return []; }
}
function markCompleted(levelId) {
  const list = getCompleted();
  if (!list.includes(levelId)) { list.push(levelId); }
  localStorage.setItem("modao_completed", JSON.stringify(list));
}
function isUnlocked(levelId) {
  // 格式 "X-Y"：第一小关免费，其余需上一关通关
  const [ci, li] = levelId.split("-").map(Number);
  if (li === 1) {
    // 每章第一关：第1章免费，其余需通关上一章最后一关
    if (ci === 1) return true;
    const prevCampaign = campaigns[ci - 2];
    if (!prevCampaign) return false;
    const prevLastLevel = prevCampaign.levels[prevCampaign.levels.length - 1];
    return getCompleted().includes(prevLastLevel.id);
  }
  const prevLevelId = `${ci}-${li - 1}`;
  return getCompleted().includes(prevLevelId);
}

// ─── 关卡选择界面 ─────────────────────────────────────────────────────────────
function renderCampaignScreen() {
  const completed = getCompleted();
  const container = document.getElementById("campaign-cards");
  if (!container) return;
  container.innerHTML = "";
  campaigns.forEach((campaign) => {
    const totalLevels = campaign.levels.length;
    const doneCount = campaign.levels.filter(l => completed.includes(l.id)).length;
    const unlocked = isUnlocked(campaign.levels[0].id);
    const card = document.createElement("div");
    card.className = "campaign-card" + (unlocked ? "" : " locked");
    card.dataset.campaignId = campaign.id;
    card.innerHTML = `
      <div class="campaign-location">${campaign.location}</div>
      <div class="campaign-name">${campaign.name}</div>
      <div class="level-diff ${campaign.difficultyClass}">${campaign.difficultyLabel}</div>
      <div class="campaign-desc">${campaign.description}</div>
      <div class="campaign-progress">${unlocked ? `${doneCount}/${totalLevels} 已通关` : "🔒 未解锁"}</div>
    `;
    if (unlocked) {
      card.addEventListener("click", () => showLevelScreen(campaign));
    }
    container.appendChild(card);
  });
}

function showLevelScreen(campaign) {
  const completed = getCompleted();
  campaignScreen.classList.add("hidden");
  levelScreen.classList.remove("hidden");

  document.getElementById("level-screen-title").textContent = campaign.name;
  const container = document.getElementById("level-cards");
  container.innerHTML = "";

  campaign.levels.forEach((level) => {
    const done = completed.includes(level.id);
    const unlocked = isUnlocked(level.id);
    const card = document.createElement("div");
    card.className = "level-item" + (done ? " done" : "") + (unlocked ? "" : " locked");
    card.innerHTML = `
      <span class="level-item-id">${level.id}</span>
      <span class="level-item-name">${level.name}</span>
      <span class="level-item-diff">${level.difficulty}</span>
      <span class="level-item-status">${done ? "✅" : unlocked ? "▶" : "🔒"}</span>
    `;
    if (unlocked) {
      card.addEventListener("click", () => startLevel(level));
    }
    container.appendChild(card);
  });

  document.getElementById("level-back-btn").onclick = () => {
    levelScreen.classList.add("hidden");
    campaignScreen.classList.remove("hidden");
    renderCampaignScreen();
  };
}

function startLevel(level) {
  currentLevel = level;
  levelScreen.classList.add("hidden");
  startScreen.classList.add("hidden");
  root.classList.remove("hidden");
  initGame(level);
}

// ─── 开始页面事件 ─────────────────────────────────────────────────────────────
document.getElementById("open-campaign-btn").addEventListener("click", () => {
  startScreen.classList.add("hidden");
  campaignScreen.classList.remove("hidden");
  renderCampaignScreen();
});

document.getElementById("campaign-back-btn").addEventListener("click", () => {
  campaignScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
});

// ─── 初始化游戏 ───────────────────────────────────────────────────────────────
async function initGame(level) {
  // 清理旧实例
  if (app) {
    app.destroy(true, { children: true, texture: false });
    app = null;
  }

  // 重置状态
  state = createInitialState();
  state.gold = level.initialGold;
  state.lives = level.initialLives;
  state.totalWaves = level.waveCount;

  // 构建路径
  const built = buildPathCells(level.pathNodes);
  pathCells = built.cells;
  pathKeySet = built.pathKeySet;
  pathWaypoints = built.pathWaypoints;

  // 隐藏遮罩
  gameOverScreen.classList.add("hidden");
  victoryScreen.classList.add("hidden");

  // PIXI 初始化
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

  // 背景：优先使用章节背景图，fallback 到程序生成
  const chapterId = currentLevel ? parseInt(currentLevel.id.split("-")[0]) : 0;
  const bgUrl = chapterBackgrounds[chapterId];
  if (bgUrl) {
    const bgTexture = await PIXI.Assets.load(bgUrl);
    const bgSprite = new PIXI.Sprite(bgTexture);
    // 背景图填满游戏网格区域（boardWidth × boardHeight）
    bgSprite.width = boardWidth;
    bgSprite.height = boardHeight;
    boardContainer.addChild(bgSprite);
  } else {
    // fallback：程序生成深色背景
    const background = new PIXI.Graphics();
    background.beginFill(0x1b1f26);
    background.drawRect(0, 0, boardWidth, boardHeight);
    background.endFill();
    for (let i = 0; i < 60; i++) {
      const r = 1 + Math.random() * 2;
      const x = Math.random() * boardWidth;
      const y = Math.random() * boardHeight;
      background.beginFill(0x2a2f3b);
      background.drawCircle(x, y, r);
      background.endFill();
    }
    boardContainer.addChild(background);
  }

  // 路径渲染（渐变色：起点绿，中间灰，终点红）
  // 路径渲染：有背景图时用半透明叠层，无背景图时用实色
  const pathGraphics = new PIXI.Graphics();
  const totalCells = pathCells.length;
  pathCells.forEach((cell, idx) => {
    const ratio = idx / Math.max(totalCells - 1, 1);
    if (bgUrl) {
      // 有背景图：只画半透明暗色叠层，让背景图的路面透出来
      pathGraphics.beginFill(0x000000, 0.15);
    } else {
      // 无背景图：实色路径
      let color;
      if (ratio < 0.3) color = 0x2d4a3e;
      else if (ratio < 0.7) color = 0x2a303b;
      else color = 0x4a2d2d;
      pathGraphics.beginFill(color);
    }
    pathGraphics.drawRect(cell.x * tileSize, cell.y * tileSize, tileSize, tileSize);
    pathGraphics.endFill();
  });
  boardContainer.addChild(pathGraphics);

  // 网格线
  const gridGraphics = new PIXI.Graphics();
  gridGraphics.lineStyle(1, 0xffffff, 0.06);
  for (let x = 0; x <= gridWidth; x++) {
    gridGraphics.moveTo(x * tileSize, 0);
    gridGraphics.lineTo(x * tileSize, boardHeight);
  }
  for (let y = 0; y <= gridHeight; y++) {
    gridGraphics.moveTo(0, y * tileSize);
    gridGraphics.lineTo(boardWidth, y * tileSize);
  }
  boardContainer.addChild(gridGraphics);

  // 路径入/出标记
  const startPos = pathWaypoints[0];
  const startLabel = new PIXI.Text("入", { fontSize: 18, fill: 0x3ecf8e, fontWeight: "bold" });
  startLabel.anchor.set(0.5);
  startLabel.position.set(startPos.x, startPos.y);
  boardContainer.addChild(startLabel);

  const endPos = pathWaypoints[pathWaypoints.length - 1];
  const endLabel = new PIXI.Text("出", { fontSize: 18, fill: 0xff6b6b, fontWeight: "bold" });
  endLabel.anchor.set(0.5);
  endLabel.position.set(endPos.x, endPos.y);
  boardContainer.addChild(endLabel);

  // 图层
  towersLayer = new PIXI.Container();
  enemiesLayer = new PIXI.Container();
  bulletsLayer = new PIXI.Container();
  ghostsLayer = new PIXI.Container();
  boardContainer.addChild(towersLayer, enemiesLayer, bulletsLayer, ghostsLayer);

  placementHighlight = new PIXI.Graphics();
  placementHighlight.visible = false;
  boardContainer.addChild(placementHighlight);

  layoutBoard();
  window.addEventListener("resize", layoutBoard);

  boardContainer.on("pointerdown", handleBoardPointerDown);
  boardContainer.on("pointermove", handleBoardPointerMove);
  boardContainer.on("pointerout", () => { placementHighlight.visible = false; });

  // 塔选择按钮
  document.querySelectorAll(".tower-btn").forEach((btn) => {
    btn.onclick = () => {
      const type = btn.dataset.type;
      if (!type || !towerTypes[type] || state.gameOver) return;
      setTowerType(state.selectedTowerType === type ? null : type);
    };
  });

  // 收起面板
  toggleUiButton.onclick = () => {
    state.uiCollapsed = !state.uiCollapsed;
    root.classList.toggle("ui-collapsed", state.uiCollapsed);
    toggleUiButton.textContent = state.uiCollapsed ? "展开面板" : "收起面板";
    toggleUiButton.setAttribute("aria-expanded", String(!state.uiCollapsed));
    layoutBoard();
  };

  // 召敌开波
  startWaveButton.onclick = () => {
    if (state.gameOver || state.victory) return;
    if (state.waveInProgress) { setStatus("此波尚未结束", elements); return; }
    if (state.wave >= currentLevel.waveCount) { setStatus("所有波次已完成！", elements); return; }
    startWave();
  };

  // 万鬼大阵
  wanguiBtn.onclick = () => {
    if (state.wanguiCooldownRemaining > 0) return;
    if (state.gold < wanguiConfig.cost) { setStatus("灵石不足，无法激活万鬼大阵", elements); return; }
    state.gold -= wanguiConfig.cost;
    state.wanguiCooldownRemaining = wanguiConfig.cooldown;
    playWanguiActivate();
    setStatus("万鬼大阵启动！鬼兵冲锋！", elements);
    updateUI(state, elements);
    for (let i = 0; i < wanguiConfig.ghostCount; i++) {
      setTimeout(() => { if (!state.gameOver) spawnGhost(); }, i * 300);
    }
  };

  // 重试按钮
  document.getElementById("retry-btn").onclick = () => {
    gameOverScreen.classList.add("hidden");
    // 清理画布
    if (app) { app.destroy(true, { children: true, texture: false }); app = null; }
    root.querySelectorAll("canvas").forEach(c => c.remove());
    initGame(currentLevel);
  };

  document.getElementById("game-over-menu-btn").onclick = returnToMenu;

  document.getElementById("next-level-btn").onclick = () => {
    victoryScreen.classList.add("hidden");
    if (app) { app.destroy(true, { children: true, texture: false }); app = null; }
    root.querySelectorAll("canvas").forEach(c => c.remove());
    const nextLevel = findNextLevel(currentLevel.id);
    if (nextLevel) {
      currentLevel = nextLevel;
      initGame(nextLevel);
    } else {
      returnToMenu();
    }
  };

  document.getElementById("back-menu-btn").onclick = returnToMenu;

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setTowerType(null);
  });

  updateUI(state, elements);
  updateButtons(state, elements);
  setStatus("万劫魔宫，严阵以待", elements);

  app.ticker.add(() => updateGame(app.ticker.deltaMS / 1000));
}

// ─── 布局 ─────────────────────────────────────────────────────────────────────
function layoutBoard() {
  if (!app) return;
  app.renderer.resize(window.innerWidth, window.innerHeight);

  const HUD_H = 80;
  const hudHeight = state.uiCollapsed ? 0 : HUD_H;
  const avW = app.screen.width;
  const avH = app.screen.height - hudHeight;

  const scale = Math.min(avW / boardWidth, avH / boardHeight);
  boardContainer.scale.set(scale);

  const sw = boardWidth * scale;
  const sh = boardHeight * scale;
  boardContainer.x = Math.round((avW - sw) / 2);
  boardContainer.y = Math.round((avH - sh) / 2);

  boardContainer.hitArea = new PIXI.Rectangle(0, 0, boardWidth, boardHeight);
}

// ─── 游戏主循环 ───────────────────────────────────────────────────────────────
function updateGame(deltaSec) {
  if (state.gameOver || state.victory) return;

  // 万鬼冷却
  if (state.wanguiCooldownRemaining > 0) {
    state.wanguiCooldownRemaining = Math.max(0, state.wanguiCooldownRemaining - deltaSec);
    updateWanguiBtn(state, elements);
  }

  const deps = makeDeps();
  updateSpawning(state, deltaSec, deps);
  updateTowers(state, deltaSec, deps);
  updateBullets(state, deltaSec, deps);
  updateEnemies(state, deltaSec, deps);
  updateGhosts(state, deltaSec, deps);

  // 波次结束检测
  if (state.waveInProgress && state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveInProgress = false;
    setStatus(`第 ${state.wave} 波已退，养精蓄锐`, elements);
    updateButtons(state, elements);
    // 最后一波结束 → 胜利
    if (state.wave >= currentLevel.waveCount) {
      triggerVictory();
    }
  }
}

function makeDeps() {
  return { textures, pathWaypoints, enemiesLayer, bulletsLayer, ghostsLayer, elements, onGameOver: triggerGameOver };
}

// ─── 波次管理 ─────────────────────────────────────────────────────────────────
function startWave() {
  state.wave += 1;
  state.waveInProgress = true;
  state.spawnQueue = buildSpawnQueueFromOverrides(state.wave, currentLevel.waveOverrides);
  state.spawnInterval = Math.max(0.3, 0.85 - state.wave * 0.04);
  state.spawnTimer = 0;
  setStatus(`第 ${state.wave} 波正道来袭！`, elements);
  updateUI(state, elements);
  updateButtons(state, elements);
}

// ─── 鬼兵 ─────────────────────────────────────────────────────────────────────
function spawnGhost() {
  const ghost = new Ghost({
    pathWaypoints,
    damage: wanguiConfig.ghostDamage,
    speed: wanguiConfig.ghostSpeed,
    radius: wanguiConfig.ghostRadius,
  });
  ghostsLayer.addChild(ghost.sprite);
  state.ghosts.push(ghost);
}

// ─── 结算 ─────────────────────────────────────────────────────────────────────
function triggerGameOver() {
  state.gameOver = true;
  state.waveInProgress = false;
  setTowerType(null);
  document.getElementById("final-wave").textContent = state.wave;
  gameOverScreen.classList.remove("hidden");
}

function triggerVictory() {
  state.victory = true;
  state.waveInProgress = false;
  markCompleted(currentLevel.id);
  document.getElementById("victory-wave").textContent = state.wave;

  // 最终关特殊文案
  if (currentLevel.isFinalLevel) {
    victoryScreen.querySelector(".overlay-title").textContent = "万道归魔";
    victoryScreen.querySelector(".overlay-subtitle").textContent = "六宗皆退，万劫老祖威震玄黄大陆！";
    victoryScreen.querySelector(".overlay-icon").textContent = "👑";
  } else {
    victoryScreen.querySelector(".overlay-title").textContent = "魔道长存";
    victoryScreen.querySelector(".overlay-subtitle").textContent = "正道退兵，万骨山守住了！";
    victoryScreen.querySelector(".overlay-icon").textContent = "🔥";
  }

  // 下一关是否存在
  const next = findNextLevel(currentLevel.id);
  document.getElementById("next-level-btn").style.display = next ? "" : "none";

  victoryScreen.classList.remove("hidden");
  updateButtons(state, elements);
}

function returnToMenu() {
  if (app) { app.destroy(true, { children: true, texture: false }); app = null; }
  root.querySelectorAll("canvas").forEach(c => c.remove());
  gameOverScreen.classList.add("hidden");
  victoryScreen.classList.add("hidden");
  root.classList.add("hidden");
  startScreen.classList.remove("hidden");
}

function findNextLevel(currentId) {
  const [ci, li] = currentId.split("-").map(Number);
  const campaign = campaigns[ci - 1];
  if (!campaign) return null;
  if (li < campaign.levels.length) return campaign.levels[li]; // li 是1-indexed，array是0-indexed，所以 li 正好是下一个
  // 下一章第一关
  const nextCampaign = campaigns[ci];
  return nextCampaign ? nextCampaign.levels[0] : null;
}

// ─── 筑塔 ─────────────────────────────────────────────────────────────────────
function handleBoardPointerDown(event) {
  if (!state.selectedTowerType || state.gameOver || state.victory) return;
  const cell = getCellFromEvent(event);
  if (!cell) return;
  const cellKey = `${cell.x},${cell.y}`;
  if (pathKeySet.has(cellKey)) { setStatus("此处乃通路，不可筑塔", elements); return; }
  if (state.towers.some(t => t.cellKey === cellKey)) { setStatus("此格已有防御，无需再筑", elements); return; }
  const config = towerTypes[state.selectedTowerType];
  if (!config) return;
  if (state.gold < config.cost) { setStatus("灵石不足", elements); return; }
  const tower = new Tower({ cell, texture: textures.tower, config });
  towersLayer.addChild(tower.sprite);
  state.towers.push(tower);
  state.gold -= config.cost;
  updateUI(state, elements);
  updateButtons(state, elements);
  setStatus(`${config.name} 已落成`, elements);
}

function handleBoardPointerMove(event) {
  if (!state.selectedTowerType || state.gameOver || state.victory) {
    placementHighlight.visible = false;
    return;
  }
  const cell = getCellFromEvent(event);
  if (!cell) { placementHighlight.visible = false; return; }
  const config = towerTypes[state.selectedTowerType];
  const valid = config ? canPlaceTower(cell, config) : false;
  placementHighlight.clear();
  placementHighlight.beginFill(valid ? 0x45f57a : 0xf56262, 0.4);
  placementHighlight.drawRect(cell.x * tileSize, cell.y * tileSize, tileSize, tileSize);
  placementHighlight.endFill();
  placementHighlight.visible = true;
}

function canPlaceTower(cell, config) {
  const cellKey = `${cell.x},${cell.y}`;
  if (pathKeySet.has(cellKey)) return false;
  if (state.towers.some(t => t.cellKey === cellKey)) return false;
  if (state.gold < config.cost) return false;
  return true;
}

function getCellFromEvent(event) {
  const local = event.data ? event.data.getLocalPosition(boardContainer) : event.getLocalPosition(boardContainer);
  const cellX = Math.floor(local.x / tileSize);
  const cellY = Math.floor(local.y / tileSize);
  if (cellX < 0 || cellX >= gridWidth || cellY < 0 || cellY >= gridHeight) return null;
  return { x: cellX, y: cellY };
}

function setTowerType(type) {
  state.selectedTowerType = type || null;
  if (placementHighlight) placementHighlight.visible = false;
  updateButtons(state, elements);
  if (type) {
    const cfg = towerTypes[type];
    setStatus(`选择 ${cfg ? cfg.name : type}，点击空格落塔`, elements);
  } else {
    setStatus("取消筑塔", elements);
  }
}
