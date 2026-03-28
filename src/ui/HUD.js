import { towerTypes, towerUpgradeConfig, towerSellConfig } from "../config.js";

/**
 * 更新 HUD 数值显示（灵石、气运、波次）
 * @param {Object} state - 游戏状态
 * @param {Object} elements - DOM 元素引用
 */
export function updateUI(state, elements) {
  const { goldEl, livesEl, waveEl } = elements;
  goldEl.textContent = state.gold;
  livesEl.textContent = state.lives;
  waveEl.textContent = state.wave;

  // 波次进度条
  const waveBarFill = document.getElementById("wave-bar-fill");
  const waveProgressText = document.getElementById("wave-progress-text");
  if (waveBarFill && waveProgressText) {
    const total = state.totalWaves || 8;
    const pct = total > 0 ? Math.min(100, (state.wave / total) * 100) : 0;
    waveBarFill.style.width = pct + "%";
    waveProgressText.textContent = `${state.wave} / ${total}`;
  }
}

/**
 * 更新按钮状态（塔选择高亮 + 灵石不足 disable）
 * @param {Object} state - 游戏状态
 * @param {Object} elements - DOM 元素引用
 */
export function updateButtons(state, elements) {
  const { startWaveButton } = elements;

  // 更新塔选择按钮
  const towerBtns = document.querySelectorAll(".tower-btn");
  for (const btn of towerBtns) {
    const type = btn.dataset.type;
    const cfg = towerTypes[type];
    if (!cfg) continue;

    const isSelected = state.selectedTowerType === type;
    const canAfford = state.gold >= cfg.cost;

    btn.classList.toggle("active", isSelected);
    btn.disabled = state.gameOver || (!isSelected && !canAfford);
  }

  startWaveButton.disabled = state.gameOver || state.waveInProgress || state.victory;

  // 更新万鬼大阵按钮
  updateWanguiBtn(state, elements);
}

/**
 * 更新万鬼大阵按钮状态
 * @param {Object} state - 游戏状态
 * @param {Object} elements - DOM 元素引用
 */
export function updateWanguiBtn(state, elements) {
  const wanguiBtn = document.getElementById("wangui-btn");
  const wanguiCd = document.getElementById("wangui-cd");
  if (!wanguiBtn || !wanguiCd) return;

  const cd = state.wanguiCooldownRemaining;
  if (cd > 0) {
    wanguiCd.textContent = `${Math.ceil(cd)}s`;
    wanguiBtn.disabled = true;
  } else {
    wanguiCd.textContent = "就绪";
    wanguiBtn.disabled = state.gameOver || state.victory || state.gold < 80;
  }
}

/**
 * 设置状态栏文字
 * @param {string} text - 显示文字
 * @param {Object} elements - DOM 元素引用
 */
export function setStatus(text, elements) {
  elements.statusEl.textContent = text;
}

/**
 * 更新游戏状态显示（速度/暂停）
 * @param {TimeSystem} timeSystem - 时间系统实例
 * @param {Object} elements - DOM 元素引用
 */
export function updateGameStatus(timeSystem, elements) {
  const speedBtn = document.getElementById("speed-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const statusDisplay = document.getElementById("game-status-display");
  
  if (speedBtn) {
    speedBtn.textContent = `⏩ ${timeSystem.getSpeedText()}`;
  }
  
  if (pauseBtn) {
    pauseBtn.textContent = timeSystem.isPaused ? "▶️ 继续" : "⏸️ 暂停";
  }
  
  if (statusDisplay) {
    statusDisplay.textContent = timeSystem.getStatusText();
  }
}

/**
 * 更新塔选择面板显示
 * @param {Object} state - 游戏状态
 * @param {Object} elements - DOM 元素引用
 */
export function updateTowerSelectionPanel(state, elements) {
  const panel = document.getElementById("tower-selection-panel");
  if (!panel) return;

  const selectedTower = state.selectedTower;
  
  if (!selectedTower) {
    panel.classList.add("hidden");
    return;
  }

  panel.classList.remove("hidden");
  
  const info = selectedTower.getInfo();
  
  // 更新塔信息
  const towerNameEl = document.getElementById("tower-panel-name");
  const towerLevelEl = document.getElementById("tower-panel-level");
  const towerDamageEl = document.getElementById("tower-panel-damage");
  const towerRangeEl = document.getElementById("tower-panel-range");
  const towerFireRateEl = document.getElementById("tower-panel-firerate");
  const towerDpsEl = document.getElementById("tower-panel-dps");
  
  if (towerNameEl) {
    const typeNames = { basic: "骷髅弓手", cannon: "魔炮台", slow: "寒冰阵" };
    towerNameEl.textContent = typeNames[info.type] || info.type;
  }
  
  if (towerLevelEl) {
    towerLevelEl.textContent = `Lv.${info.level} / ${info.maxLevel}`;
  }
  
  if (towerDamageEl) towerDamageEl.textContent = info.damage;
  if (towerRangeEl) towerRangeEl.textContent = info.range;
  if (towerFireRateEl) towerFireRateEl.textContent = info.fireRate;
  if (towerDpsEl) towerDpsEl.textContent = info.dps;
  
  // 更新升级按钮
  const upgradeBtn = document.getElementById("tower-upgrade-btn");
  const upgradeCostEl = document.getElementById("tower-upgrade-cost");
  
  if (upgradeBtn && upgradeCostEl) {
    if (info.level >= info.maxLevel) {
      upgradeBtn.disabled = true;
      upgradeBtn.textContent = "已达满级";
      upgradeCostEl.textContent = "-";
    } else {
      upgradeBtn.disabled = state.gold < info.upgradeCost || state.gameOver;
      upgradeBtn.textContent = "升级";
      upgradeCostEl.textContent = `${info.upgradeCost} 灵石`;
    }
  }
  
  // 更新出售按钮
  const sellBtn = document.getElementById("tower-sell-btn");
  const sellRefundEl = document.getElementById("tower-sell-refund");
  
  if (sellBtn && sellRefundEl) {
    sellBtn.disabled = state.gameOver;
    sellRefundEl.textContent = `${info.sellRefund} 灵石`;
  }
}
