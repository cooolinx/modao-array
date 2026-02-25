import { towerTypes } from "../config.js";

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

  startWaveButton.disabled = state.gameOver || state.waveInProgress;
}

/**
 * 设置状态栏文字
 * @param {string} text - 显示文字
 * @param {Object} elements - DOM 元素引用
 */
export function setStatus(text, elements) {
  elements.statusEl.textContent = text;
}
