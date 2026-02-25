// 游戏状态管理

/**
 * 创建游戏初始状态
 * @returns {Object} 初始游戏状态
 */
export function createInitialState() {
  return {
    gold: 120,
    lives: 12,
    wave: 0,
    isPlacing: false,
    waveInProgress: false,
    gameOver: false,
    uiCollapsed: false,
    enemiesToSpawn: 0,
    spawnInterval: 0.8,
    spawnTimer: 0,
    towers: [],
    enemies: [],
    bullets: [],
  };
}
