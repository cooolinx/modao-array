import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";
import {
  getGridConfig,
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
import { updateUI, updateButtons, setStatus, updateWanguiBtn, updateGameStatus, updateTowerSelectionPanel } from "./src/ui/HUD.js";
import { campaigns } from "./src/levels/campaigns.js";
import { playWanguiActivate } from "./src/audio/SoundSystem.js";
import { EffectSystem } from "./src/systems/EffectSystem.js";
import { TimeSystem } from "./src/systems/TimeSystem.js";

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
const countdownOverlay = document.getElementById("countdown-overlay");
const countdownText = document.getElementById("countdown-text");

const elements = { goldEl, livesEl, waveEl, statusEl, startWaveButton, countdownOverlay, countdownText };

// ─── 游戏状态 ────────────────────────────────────────────────────────────────
let state = createInitialState();
let currentLevel = null;   // 当前小关卡数据
let gridConfig = null;     // 当前关卡的网格配置 {tileSize, gridWidth, gridHeight, boardWidth, boardHeight}
let pathCells = [];
let pathKeySet = new Set();
let pathWaypoints = [];
let towerSpotSet = new Set(); // 允许建塔的格子

// 倒计时状态
let countdownActive = false;
let countdownRemaining = 0;

// PIXI 层引用
let app;
let boardContainer;
let towersLayer;
let enemiesLayer;
let bulletsLayer;
let ghostsLayer;
let effectsLayer;
let placementHighlight;
let towerRangeHighlight;
let textures;

// 特效系统
let effectSystem;

// 时间系统
let timeSystem;

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
      <div class="campaign-progress">${unlocked ? `通关进度：${doneCount}/${totalLevels}` : "🔒 未解锁"}</div>
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
  if (effectSystem) {
    effectSystem.clearAll();
    effectSystem = null;
  }
  if (app) {
    app.destroy(true, { children: true, texture: false });
    app = null;
  }

  // 重置状态
  state = createInitialState();
  state.gold = level.initialGold;
  state.lives = level.initialLives;
  state.totalWaves = level.waveCount;

  // 计算网格配置（支持关卡自定义）
  gridConfig = getGridConfig(level);
  const { tileSize, gridWidth, gridHeight, boardWidth, boardHeight } = gridConfig;

  // 构建路径
  const built = buildPathCells(level.pathNodes, tileSize);
  pathCells = built.cells;
  pathKeySet = built.pathKeySet;
  pathWaypoints = built.pathWaypoints;

  // 构建塔位白名单
  towerSpotSet = new Set(
    (level.towerSpots || []).map(s => `${s.x},${s.y}`)
  );

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

  await PIXI.Assets.load([
    assetUrls.tower,
    assetUrls.enemy, // fallback
    assetUrls.enemySoldierWalk,
    assetUrls.enemyFastWalk,
    assetUrls.enemyTankWalk,
  ]);

  // 切割 walk sprite sheet 帧（4帧横排，每帧宽度 = 总宽/4）
  function sliceWalkFrames(url) {
    const baseTexture = PIXI.Texture.from(url);
    const w = baseTexture.width;
    const h = baseTexture.height;
    const frameW = Math.round(w / 4);
    return [0, 1, 2, 3].map(i =>
      new PIXI.Texture({ source: baseTexture.source, frame: new PIXI.Rectangle(i * frameW, 0, frameW, h) })
    );
  }

  textures = {
    tower: PIXI.Texture.from(assetUrls.tower),
    enemy: PIXI.Texture.from(assetUrls.enemy),
    enemySoldier: PIXI.Texture.from(assetUrls.enemySoldier),
    enemyFast: PIXI.Texture.from(assetUrls.enemyFast),
    enemyTank: PIXI.Texture.from(assetUrls.enemyTank),
    // walk animation frames
    enemySoldierFrames: sliceWalkFrames(assetUrls.enemySoldierWalk),
    enemyFastFrames: sliceWalkFrames(assetUrls.enemyFastWalk),
    enemyTankFrames: sliceWalkFrames(assetUrls.enemyTankWalk),
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

  // 路径渲染
  const pathGraphics = new PIXI.Graphics();
  if (!bgUrl) {
    // 无背景图：实色填充路径 tile
    const totalCells = pathCells.length;
    pathCells.forEach((cell, idx) => {
      const ratio = idx / Math.max(totalCells - 1, 1);
      let color;
      if (ratio < 0.3) color = 0x2d4a3e;
      else if (ratio < 0.7) color = 0x2a303b;
      else color = 0x4a2d2d;
      pathGraphics.beginFill(color);
      pathGraphics.drawRect(cell.x * tileSize, cell.y * tileSize, tileSize, tileSize);
      pathGraphics.endFill();
    });
  }
  boardContainer.addChild(pathGraphics);

  // 塔位渲染：有 towerSpots 时显示淡色圆圈标记
  const towerSpotGraphics = new PIXI.Graphics();
  if (towerSpotSet.size > 0) {
    (level.towerSpots || []).forEach(({ x, y }) => {
      const cx = x * tileSize + tileSize / 2;
      const cy = y * tileSize + tileSize / 2;
      towerSpotGraphics.lineStyle(1.5, 0xffd700, 0.35);
      towerSpotGraphics.beginFill(0xffd700, 0.06);
      towerSpotGraphics.drawCircle(cx, cy, tileSize * 0.42);
      towerSpotGraphics.endFill();
    });
  }
  boardContainer.addChild(towerSpotGraphics);

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
  effectsLayer = new PIXI.Container();
  boardContainer.addChild(towersLayer, enemiesLayer, bulletsLayer, ghostsLayer, effectsLayer);
  
  // 初始化特效系统
  effectSystem = new EffectSystem({ effectsLayer });
  
  // 初始化时间系统
  timeSystem = new TimeSystem();

  placementHighlight = new PIXI.Graphics();
  placementHighlight.visible = false;
  boardContainer.addChild(placementHighlight);

  // 塔射程显示（悬停时）
  towerRangeHighlight = new PIXI.Graphics();
  towerRangeHighlight.visible = false;
  boardContainer.addChild(towerRangeHighlight);

  layoutBoard();
  window.addEventListener("resize", layoutBoard);

  boardContainer.on("pointerdown", handleBoardPointerDown);
  boardContainer.on("pointermove", handleBoardPointerMove);
  boardContainer.on("pointerout", () => {
    placementHighlight.visible = false;
    towerRangeHighlight.visible = false;
  });

  // 塔选择按钮
  document.querySelectorAll(".tower-btn").forEach((btn) => {
    btn.onclick = () => {
      const type = btn.dataset.type;
      if (!type || !towerTypes[type] || state.gameOver) return;
      setTowerType(state.selectedTowerType === type ? null : type);
    };
  });

  // 塔升级按钮
  const upgradeBtn = document.getElementById("tower-upgrade-btn");
  if (upgradeBtn) {
    upgradeBtn.onclick = () => {
      upgradeSelectedTower();
    };
  }

  // 塔出售按钮
  const sellBtn = document.getElementById("tower-sell-btn");
  if (sellBtn) {
    sellBtn.onclick = () => {
      sellSelectedTower();
    };
  }

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
    if (countdownActive) return; // 倒计时期间不能再次点击
    startWaveWithCountdown();
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
    // 清理画布和特效系统
    if (effectSystem) {
      effectSystem.clearAll();
      effectSystem = null;
    }
    if (app) { app.destroy(true, { children: true, texture: false }); app = null; }
    root.querySelectorAll("canvas").forEach(c => c.remove());
    // 重置时间系统
    if (timeSystem) {
      timeSystem.reset();
    }
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
    if (e.key === " " || e.code === "Space") {
      e.preventDefault(); // 防止页面滚动
      togglePause();
    }
  });

  updateUI(state, elements);
  updateButtons(state, elements);
  updateGameStatus(timeSystem, elements);
  updateTowerSelectionPanel(state, elements);
  setStatus("万劫魔宫，严阵以待", elements);

  // 速度切换按钮
  document.getElementById("speed-btn").onclick = () => {
    if (state.gameOver || state.victory) return;
    timeSystem.cycleSpeed();
    updateGameStatus(timeSystem, elements);
  };

  // 暂停按钮
  document.getElementById("pause-btn").onclick = () => {
    if (state.gameOver || state.victory) return;
    togglePause();
  };

  app.ticker.add(() => updateGame(app.ticker.deltaMS / 1000));
}

// ─── 布局 ─────────────────────────────────────────────────────────────────────
function layoutBoard() {
  if (!app || !gridConfig) return;
  const { boardWidth, boardHeight } = gridConfig;
  
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
  
  // 更新倒计时（优先处理）
  if (countdownActive) {
    updateCountdown(deltaSec);
    return; // 倒计时期间暂停其他游戏逻辑
  }
  
  // 获取有效的帧时间（考虑暂停和速度）
  const effectiveDelta = timeSystem.getEffectiveDelta(deltaSec);
  
  // 暂停时不更新游戏逻辑
  if (effectiveDelta === 0) {
    return;
  }

  // 万鬼冷却（使用真实时间，不受速度影响）
  if (state.wanguiCooldownRemaining > 0) {
    state.wanguiCooldownRemaining = Math.max(0, state.wanguiCooldownRemaining - deltaSec);
    updateWanguiBtn(state, elements);
  }

  const deps = makeDeps();
  updateSpawning(state, effectiveDelta, deps);
  updateTowers(state, effectiveDelta, deps);
  updateBullets(state, effectiveDelta, deps);
  updateEnemies(state, effectiveDelta, deps);
  updateGhosts(state, effectiveDelta, deps);
  
  // 更新特效系统
  if (effectSystem) {
    effectSystem.update(effectiveDelta);
  }

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
  return { 
    textures, 
    pathWaypoints, 
    enemiesLayer, 
    bulletsLayer, 
    ghostsLayer, 
    elements, 
    onGameOver: triggerGameOver,
    effectSystem,
  };
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

// ─── 波次倒计时 ───────────────────────────────────────────────────────────────
function startWaveWithCountdown() {
  countdownActive = true;
  countdownRemaining = 3; // 3 秒倒计时
  elements.countdownOverlay.classList.remove("hidden");
  elements.countdownText.textContent = countdownRemaining;
  elements.startWaveButton.disabled = true;
  setStatus("波次即将开始，请做好准备！", elements);
}

function updateCountdown(deltaSec) {
  if (!countdownActive) return;
  
  countdownRemaining -= deltaSec;
  if (countdownRemaining <= 0) {
    // 倒计时结束
    countdownActive = false;
    countdownRemaining = 0;
    elements.countdownOverlay.classList.add("hidden");
    elements.startWaveButton.disabled = false;
    startWave(); // 开始生成敌人
  } else {
    // 更新显示数字
    elements.countdownText.textContent = Math.ceil(countdownRemaining);
  }
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
  deselectTower();
  if (timeSystem) {
    timeSystem.setGameOver(true);
    updateGameStatus(timeSystem, elements);
  }
  document.getElementById("final-wave").textContent = state.wave;
  gameOverScreen.classList.remove("hidden");
}

function triggerVictory() {
  state.victory = true;
  state.waveInProgress = false;
  markCompleted(currentLevel.id);
  deselectTower();
  if (timeSystem) {
    timeSystem.setGameOver(true);
    updateGameStatus(timeSystem, elements);
  }
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
  // 清理特效系统
  if (effectSystem) {
    effectSystem.clearAll();
    effectSystem = null;
  }
  if (app) { app.destroy(true, { children: true, texture: false }); app = null; }
  root.querySelectorAll("canvas").forEach(c => c.remove());
  // 重置时间系统
  if (timeSystem) {
    timeSystem.reset();
  }
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
  const cell = getCellFromEvent(event);
  
  // 如果点击空白区域（无 cell），取消选择
  if (!cell) {
    if (state.selectedTower) {
      deselectTower();
    }
    return;
  }
  
  const cellKey = `${cell.x},${cell.y}`;
  
  // 检查是否点击了已建造的塔（用于选择）
  const clickedTower = state.towers.find(t => t.cellKey === cellKey);
  if (clickedTower) {
    selectTower(clickedTower);
    return;
  }
  
  // 如果正在选择塔类型，尝试建造
  if (!state.selectedTowerType || state.gameOver || state.victory) return;
  if (pathKeySet.has(cellKey)) { setStatus("此处乃通路，不可筑塔", elements); return; }
  if (towerSpotSet.size > 0 && !towerSpotSet.has(cellKey)) { setStatus("此处地势不利，无法筑塔", elements); return; }
  const config = towerTypes[state.selectedTowerType];
  if (!config) return;
  if (state.gold < config.cost) { setStatus("灵石不足", elements); return; }
  const ts = gridConfig?.tileSize ?? 64;
  const tower = new Tower({ cell, texture: textures.tower, config, tileSize: ts });
  towersLayer.addChild(tower.sprite);
  state.towers.push(tower);
  state.gold -= config.cost;
  updateUI(state, elements);
  updateButtons(state, elements);
  setStatus(`${config.name} 已落成`, elements);
}

function handleBoardPointerMove(event) {
  const cell = getCellFromEvent(event);
  
  // 塔射程显示：检测是否悬停在已有塔上
  towerRangeHighlight.clear();
  towerRangeHighlight.visible = false;
  
  if (cell && !state.gameOver && !state.victory) {
    const cellKey = `${cell.x},${cell.y}`;
    const hoveredTower = state.towers.find(t => t.cellKey === cellKey);
    if (hoveredTower) {
      // 显示半透明绿色射程圈
      const range = hoveredTower.range;
      const ts = gridConfig?.tileSize ?? 64;
      const cx = cell.x * ts + ts / 2;
      const cy = cell.y * ts + ts / 2;
      towerRangeHighlight.lineStyle(2, 0x45f57a, 0.3);
      towerRangeHighlight.beginFill(0x45f57a, 0.15);
      towerRangeHighlight.drawCircle(cx, cy, range);
      towerRangeHighlight.endFill();
      towerRangeHighlight.visible = true;
    }
  }
  
  // 建塔放置预览
  if (!state.selectedTowerType || state.gameOver || state.victory) {
    placementHighlight.visible = false;
    return;
  }
  if (!cell) { placementHighlight.visible = false; return; }
  const config = towerTypes[state.selectedTowerType];
  const valid = config ? canPlaceTower(cell, config) : false;
  placementHighlight.clear();
  const ts = gridConfig?.tileSize ?? 64;
  placementHighlight.beginFill(valid ? 0x45f57a : 0xf56262, 0.4);
  placementHighlight.drawRect(cell.x * ts, cell.y * ts, ts, ts);
  placementHighlight.endFill();
  placementHighlight.visible = true;
}

function canPlaceTower(cell, config) {
  const cellKey = `${cell.x},${cell.y}`;
  if (pathKeySet.has(cellKey)) return false;
  if (state.towers.some(t => t.cellKey === cellKey)) return false;
  if (state.gold < config.cost) return false;
  // 有塔位白名单时，只允许在白名单格建塔
  if (towerSpotSet.size > 0 && !towerSpotSet.has(cellKey)) return false;
  return true;
}

function getCellFromEvent(event) {
  if (!gridConfig) return null;
  const { tileSize, gridWidth, gridHeight } = gridConfig;
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

/**
 * 选择已建造的塔
 * @param {Tower} tower
 */
function selectTower(tower) {
  state.selectedTower = tower;
  state.selectedTowerType = null; // 取消建造模式
  if (placementHighlight) placementHighlight.visible = false;
  updateButtons(state, elements);
  updateTowerSelectionPanel(state, elements);
  setStatus(`选中 ${tower.type} 塔 (Lv.${tower.level})`, elements);
}

/**
 * 取消选择塔
 */
function deselectTower() {
  state.selectedTower = null;
  updateTowerSelectionPanel(state, elements);
  setStatus("取消选择", elements);
}

/**
 * 升级选中的塔
 */
function upgradeSelectedTower() {
  const tower = state.selectedTower;
  if (!tower) return;
  
  const upgradeCost = tower.getUpgradeCost();
  if (tower.level >= tower.maxLevel) {
    setStatus("已达满级，无法升级", elements);
    return;
  }
  if (state.gold < upgradeCost) {
    setStatus("灵石不足，无法升级", elements);
    return;
  }
  
  state.gold -= upgradeCost;
  tower.upgrade();
  updateUI(state, elements);
  updateButtons(state, elements);
  updateTowerSelectionPanel(state, elements);
  setStatus(`${tower.type} 塔升级至 Lv.${tower.level}！`, elements);
}

/**
 * 出售选中的塔
 */
function sellSelectedTower() {
  const tower = state.selectedTower;
  if (!tower) return;
  
  const refund = tower.getSellRefund();
  state.gold += refund;
  
  // 从图层和数组中移除
  if (tower.sprite && tower.sprite.parent) {
    tower.sprite.parent.removeChild(tower.sprite);
  }
  const idx = state.towers.indexOf(tower);
  if (idx >= 0) state.towers.splice(idx, 1);
  
  updateUI(state, elements);
  updateButtons(state, elements);
  deselectTower();
  setStatus(`塔已出售，返还 ${refund} 灵石`, elements);
}

/**
 * 切换暂停状态
 */
function togglePause() {
  if (state.gameOver || state.victory) return;
  timeSystem.togglePause();
  updateGameStatus(timeSystem, elements);
  
  if (timeSystem.isPaused) {
    setStatus("游戏已暂停 - 按空格键继续", elements);
  } else {
    setStatus("游戏继续", elements);
  }
}

// 暴露给 HTML onclick 使用
window.deselectTower = deselectTower;
