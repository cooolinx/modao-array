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
    selectedTowerType: null, // null 表示未选择，否则为塔类型字符串（"basic"|"cannon"|"slow"）
    waveInProgress: false,
    gameOver: false,
    uiCollapsed: false,
    spawnQueue: [],           // 待生成的敌人类型列表（string[]）
    spawnInterval: 0.8,
    spawnTimer: 0,
    towers: [],
    enemies: [],
    bullets: [],
    ghosts: [],
    wanguiCooldownRemaining: 0,
    victory: false,
  };
}
