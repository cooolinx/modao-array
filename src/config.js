// 游戏常量配置（默认值，可被关卡配置覆盖）

export const defaultTileSize = 64;
export const defaultGridWidth = 32;
export const defaultGridHeight = 18;

// 辅助函数：获取关卡的网格配置（支持关卡自定义或回退到默认值）
export function getGridConfig(level) {
  const tileSize = level?.tileSize ?? defaultTileSize;
  const gridWidth = level?.gridWidth ?? defaultGridWidth;
  const gridHeight = level?.gridHeight ?? defaultGridHeight;
  return {
    tileSize,
    gridWidth,
    gridHeight,
    boardWidth: tileSize * gridWidth,
    boardHeight: tileSize * gridHeight,
  };
}

export const assetUrls = {
  tower: "assets/tower.svg",
  enemy: "assets/enemy.svg", // fallback
  // 敌人类型贴图：暂时用同一张 fallback（walk animation 仍用各自的 png）
  enemySoldier: "assets/enemy.svg",
  enemyFast: "assets/enemy.svg",
  enemyTank: "assets/enemy.svg",
  // 行走动画 sprite sheet（4 帧横排）
  enemySoldierWalk: "assets/enemy-soldier-walk.png",
  enemyFastWalk: "assets/enemy-fast-walk.png",
  enemyTankWalk: "assets/enemy-tank-walk.png",
};

// 每章背景图（key 为章节 id，value 为图片路径）
// 未配置的章节会 fallback 到程序生成的深色背景
export const chapterBackgrounds = {
  1: "assets/bg-chapter-1.png",
  // 2: "assets/bg-chapter-2.png",  // 待生成
  // 3: "assets/bg-chapter-3.png",
  // 4: "assets/bg-chapter-4.png",
  // 5: "assets/bg-chapter-5.png",
  // 6: "assets/bg-chapter-6.png",
  // 7: "assets/bg-chapter-7.png",
};

// 塔类型配置
export const towerTypes = {
  basic: {
    type: "basic",
    name: "骷髅弓手",
    description: "普通远程攻击",
    cost: 50,
    range: 150,
    fireRate: 1.0,
    damage: 12,
    spriteWidth: 52,
    spriteHeight: 52,
    color: 0x6fe3ff, // 射程圈颜色
  },
  cannon: {
    type: "cannon",
    name: "魔炮台",
    description: "范围爆炸，伤害高，射速慢",
    cost: 100,
    range: 120,
    fireRate: 0.4,
    damage: 45,
    splashRadius: 60, // 爆炸范围（cannon 独有）
    spriteWidth: 56,
    spriteHeight: 56,
    color: 0xff6b35,
  },
  slow: {
    type: "slow",
    name: "寒冰阵",
    description: "减速敌人，伤害低",
    cost: 75,
    range: 130,
    fireRate: 0.8,
    damage: 6,
    slowFactor: 0.5, // 减速倍率（slow 独有）
    slowDuration: 2.0, // 减速持续秒数（slow 独有）
    spriteWidth: 48,
    spriteHeight: 48,
    color: 0x88ccff,
  },
};

// 敌人类型配置
export const enemyTypes = {
  soldier: {
    type: "soldier",
    name: "剑修弟子",
    hpBase: 40,
    hpPerWave: 14,
    speedBase: 45,
    speedPerWave: 4,
    reward: 12,
    rewardPerWave: 2,
    size: 36,
    assetUrl: assetUrls.enemySoldier,
    animationSpeed: 0.12,
  },
  fast: {
    type: "fast",
    name: "御风剑修",
    hpBase: 20,
    hpPerWave: 6,
    speedBase: 90,
    speedPerWave: 6,
    reward: 8,
    rewardPerWave: 1,
    size: 28,
    assetUrl: assetUrls.enemyFast,
    animationSpeed: 0.22,
  },
  tank: {
    type: "tank",
    name: "龙气禁卫",
    hpBase: 150,
    hpPerWave: 40,
    speedBase: 25,
    speedPerWave: 2,
    reward: 25,
    rewardPerWave: 4,
    size: 48,
    assetUrl: assetUrls.enemyTank,
    animationSpeed: 0.07,
  },
};

// 波次敌人组成配置（超出配置的波次按最后一条规则 + 随机混合处理）
export const waveConfigs = [
  { enemies: [{ type: "soldier", count: 8 }] }, // 波次 1
  { enemies: [{ type: "soldier", count: 8 }, { type: "fast", count: 3 }] }, // 波次 2
  { enemies: [{ type: "soldier", count: 6 }, { type: "tank", count: 1 }] }, // 波次 3
  { enemies: [{ type: "soldier", count: 8 }, { type: "fast", count: 5 }, { type: "tank", count: 1 }] }, // 波次 4
  { enemies: [{ type: "fast", count: 8 }, { type: "tank", count: 2 }] }, // 波次 5
];

export const bulletSpeed = 280;

// 万鬼大阵配置
export const wanguiConfig = {
  cost: 80,           // 灵石消耗
  cooldown: 30,       // 冷却秒数
  ghostCount: 8,      // 召唤鬼兵数量
  ghostDamage: 30,    // 每个鬼兵碰撞伤害
  ghostSpeed: 200,    // 鬼兵速度（反向沿路径跑）
  ghostRadius: 20,    // 碰撞半径
};

// 塔升级配置
export const towerUpgradeConfig = {
  maxLevel: 5,              // 最高等级
  damageBonusPerLevel: 0.20,  // 每级伤害提升 20%
  rangeBonusPerLevel: 0.10,   // 每级射程提升 10%
  fireRateBonusPerLevel: 0.05, // 每级攻速提升 5%
  costMultiplier: 0.8,        // 升级成本系数
};

// 塔出售配置
export const towerSellConfig = {
  refundRate: 0.6,  // 出售退款比例 60%
};
