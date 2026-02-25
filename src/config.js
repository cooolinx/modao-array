// 游戏常量配置

export const tileSize = 64;
export const gridWidth = 24;
export const gridHeight = 18;

export const boardWidth = tileSize * gridWidth;
export const boardHeight = tileSize * gridHeight;

export const assetUrls = {
  tower: "assets/tower.svg",
  enemy: "assets/enemy.svg",
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
    splashRadius: 60, // 爆炸范围（cannon独有）
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
    slowFactor: 0.5, // 减速倍率（slow独有）
    slowDuration: 2.0, // 减速持续秒数（slow独有）
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
    tint: 0xffffff, // 贴图着色
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
    tint: 0x88ffcc,
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
    tint: 0xffdd44,
  },
};

// 波次敌人组成配置（超出配置的波次按最后一条规则 + 随机混合处理）
export const waveConfigs = [
  { enemies: [{ type: "soldier", count: 8 }] }, // 波次1
  { enemies: [{ type: "soldier", count: 8 }, { type: "fast", count: 3 }] }, // 波次2
  { enemies: [{ type: "soldier", count: 6 }, { type: "tank", count: 1 }] }, // 波次3
  { enemies: [{ type: "soldier", count: 8 }, { type: "fast", count: 5 }, { type: "tank", count: 1 }] }, // 波次4
  { enemies: [{ type: "fast", count: 8 }, { type: "tank", count: 2 }] }, // 波次5
];

export const bulletSpeed = 280;
