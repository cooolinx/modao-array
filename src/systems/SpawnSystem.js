import { Enemy } from "../entities/Enemy.js";
import { waveConfigs, enemyTypes } from "../config.js";

/**
 * 根据波次生成敌人队列（shuffle 混合）
 * @param {number} wave - 当前波次（1-indexed）
 * @returns {string[]} 敌人类型字符串数组
 */
export function buildSpawnQueue(wave) {
  const waveIndex = wave - 1;
  let config;

  if (waveIndex < waveConfigs.length) {
    config = waveConfigs[waveIndex];
  } else {
    // 超出配置：使用最后一波配置，数量随波次递增
    const lastConfig = waveConfigs[waveConfigs.length - 1];
    const extraWaves = waveIndex - (waveConfigs.length - 1);
    config = {
      enemies: lastConfig.enemies.map((entry) => ({
        type: entry.type,
        count: entry.count + extraWaves * 2,
      })),
    };
  }

  // 展开为数组并 shuffle
  const queue = [];
  for (const entry of config.enemies) {
    for (let i = 0; i < entry.count; i++) {
      queue.push(entry.type);
    }
  }

  // Fisher-Yates shuffle
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  return queue;
}

/**
 * 更新敌人生成逻辑
 * @param {Object} state - 游戏状态
 * @param {number} deltaSec - 帧时间（秒）
 * @param {Object} deps - 依赖 { textures, pathWaypoints, enemiesLayer }
 */
export function updateSpawning(state, deltaSec, deps) {
  if (!state.waveInProgress || !state.spawnQueue || state.spawnQueue.length === 0) {
    return;
  }

  state.spawnTimer -= deltaSec;
  while (state.spawnTimer <= 0 && state.spawnQueue.length > 0) {
    const enemyType = state.spawnQueue.shift();
    spawnEnemy(state, deps, enemyType);
    state.spawnTimer += state.spawnInterval;
  }
}

/**
 * 生成一个新敌人
 * @param {Object} state - 游戏状态
 * @param {Object} deps - 依赖 { textures, pathWaypoints, enemiesLayer }
 * @param {string} [enemyType] - 敌人类型，默认 "soldier"
 */
export function spawnEnemy(state, deps, enemyType = "soldier") {
  const { textures, pathWaypoints, enemiesLayer } = deps;
  const enemy = new Enemy({ enemyType, wave: state.wave, textures, pathWaypoints });
  enemiesLayer.addChild(enemy.sprite);
  state.enemies.push(enemy);
}
