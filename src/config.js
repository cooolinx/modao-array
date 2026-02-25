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
    cost: 50,
    range: 150,
    fireRate: 1.0,
    damage: 12,
    spriteWidth: 52,
    spriteHeight: 52,
  },
};

export const bulletSpeed = 280;
