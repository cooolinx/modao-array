import { Enemy } from "../entities/Enemy.js";

/**
 * 更新敌人生成逻辑
 * @param {Object} state - 游戏状态
 * @param {number} deltaSec - 帧时间（秒）
 * @param {Object} deps - 依赖 { textures, pathWaypoints, enemiesLayer }
 */
export function updateSpawning(state, deltaSec, deps) {
  if (!state.waveInProgress || state.enemiesToSpawn <= 0) {
    return;
  }

  state.spawnTimer -= deltaSec;
  while (state.spawnTimer <= 0 && state.enemiesToSpawn > 0) {
    spawnEnemy(state, deps);
    state.enemiesToSpawn -= 1;
    state.spawnTimer += state.spawnInterval;
  }
}

/**
 * 生成一个新敌人
 * @param {Object} state - 游戏状态
 * @param {Object} deps - 依赖 { textures, pathWaypoints, enemiesLayer }
 */
export function spawnEnemy(state, deps) {
  const { textures, pathWaypoints, enemiesLayer } = deps;
  const enemy = new Enemy({ wave: state.wave, textures, pathWaypoints });
  enemiesLayer.addChild(enemy.sprite);
  state.enemies.push(enemy);
}
