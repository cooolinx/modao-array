import { Enemy } from "../entities/Enemy.js";

/**
 * 根据关卡波次配置（waveOverrides）生成敌人队列
 * @param {number} wave - 当前波次（1-indexed）
 * @param {Array} waveOverrides - 关卡波次配置数组
 * @returns {string[]} 敌人类型字符串数组（已 shuffle）
 */
export function buildSpawnQueueFromOverrides(wave, waveOverrides) {
  const waveIndex = wave - 1;
  let config;

  if (waveIndex < waveOverrides.length) {
    config = waveOverrides[waveIndex];
  } else {
    // 超出配置：使用最后一波，数量递增
    const last = waveOverrides[waveOverrides.length - 1];
    const extra = waveIndex - (waveOverrides.length - 1);
    config = {
      enemies: last.enemies.map(e => ({ type: e.type, count: e.count + extra * 3 })),
    };
  }

  // 展开为数组
  const queue = [];
  for (const entry of config.enemies) {
    for (let i = 0; i < entry.count; i++) queue.push(entry.type);
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
 */
export function updateSpawning(state, deltaSec, deps) {
  if (!state.waveInProgress || !state.spawnQueue || state.spawnQueue.length === 0) return;

  state.spawnTimer -= deltaSec;
  while (state.spawnTimer <= 0 && state.spawnQueue.length > 0) {
    const enemyType = state.spawnQueue.shift();
    spawnEnemy(state, deps, enemyType);
    state.spawnTimer += state.spawnInterval;
  }
}

function spawnEnemy(state, deps, enemyType = "soldier") {
  const { textures, pathWaypoints, enemiesLayer } = deps;
  const enemy = new Enemy({ enemyType, wave: state.wave, textures, pathWaypoints });
  enemiesLayer.addChild(enemy.sprite);
  state.enemies.push(enemy);
}
