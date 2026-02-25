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
 * 更新按钮状态和文字
 * @param {Object} state - 游戏状态
 * @param {Object} elements - DOM 元素引用
 */
export function updateButtons(state, elements) {
  const { buildButton, startWaveButton } = elements;
  const cost = towerTypes.basic.cost;
  buildButton.textContent = state.isPlacing
    ? "取消筑塔"
    : `筑塔（${cost} 灵石）`;
  buildButton.disabled = state.gameOver;
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
