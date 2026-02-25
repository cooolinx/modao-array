import { updateUI } from "../ui/HUD.js";
import { setStatus } from "../ui/HUD.js";
import { playEnemyDie, playLifeLost } from "../audio/SoundSystem.js";

/**
 * 更新所有敌人的移动逻辑
 * @param {Object} state - 游戏状态
 * @param {number} deltaSec - 帧时间（秒）
 * @param {Object} deps - 依赖 { pathWaypoints, enemiesLayer, elements, onGameOver }
 */
export function updateEnemies(state, deltaSec, deps) {
  const { pathWaypoints, enemiesLayer, elements, onGameOver } = deps;

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];

    if (enemy.hp <= 0) {
      handleEnemyKilled(state, enemy, i, { enemiesLayer, elements });
      continue;
    }

    if (enemy.waypointIndex >= pathWaypoints.length - 1) {
      handleEnemyEscaped(state, enemy, i, { enemiesLayer, elements, onGameOver });
      continue;
    }

    const nextPoint = pathWaypoints[enemy.waypointIndex + 1];
    if (!nextPoint) {
      handleEnemyEscaped(state, enemy, i, { enemiesLayer, elements, onGameOver });
      continue;
    }

    const dx = nextPoint.x - enemy.sprite.x;
    const dy = nextPoint.y - enemy.sprite.y;
    const distance = Math.hypot(dx, dy);
    // 使用 effectiveSpeed 替代 speed（支持减速效果）
    const step = enemy.effectiveSpeed * deltaSec;

    if (distance <= step) {
      enemy.sprite.position.set(nextPoint.x, nextPoint.y);
      enemy.waypointIndex += 1;
    } else {
      enemy.sprite.x += (dx / distance) * step;
      enemy.sprite.y += (dy / distance) * step;
    }

    enemy.updateHpBar();
  }
}

/**
 * 处理敌人被击杀
 * @param {Object} state - 游戏状态
 * @param {Object} enemy - 被击杀的敌人
 * @param {number} index - 在数组中的索引
 * @param {Object} deps - 依赖 { enemiesLayer, elements }
 */
export function handleEnemyKilled(state, enemy, index, deps) {
  const { enemiesLayer, elements } = deps;
  state.gold += enemy.reward;
  updateUI(state, elements);
  playEnemyDie();
  removeEnemyAt(state, index, enemiesLayer);
}

/**
 * 处理敌人逃脱
 * @param {Object} state - 游戏状态
 * @param {Object} enemy - 逃脱的敌人
 * @param {number} index - 在数组中的索引
 * @param {Object} deps - 依赖 { enemiesLayer, elements, onGameOver }
 */
export function handleEnemyEscaped(state, enemy, index, deps) {
  const { enemiesLayer, elements, onGameOver } = deps;
  state.lives -= 1;
  updateUI(state, elements);
  playLifeLost();
  removeEnemyAt(state, index, enemiesLayer);
  setStatus("有敌突破防线，气运受损！", elements);

  if (state.lives <= 0) {
    onGameOver();
  }
}

function removeEnemyAt(state, index, enemiesLayer) {
  const enemy = state.enemies[index];
  enemy.isRemoved = true;
  enemiesLayer.removeChild(enemy.sprite);
  enemy.sprite.destroy({ children: true });
  state.enemies.splice(index, 1);
}
