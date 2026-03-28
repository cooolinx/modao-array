// 第一关：万骨山入口（简单）
export const level1 = {
  id: 1,
  name: "万骨山入口",
  difficulty: "初入江湖",
  description: "正道大军兵临城下，守住入口！",
  // 网格配置：24×14 格子，每格 80px（总尺寸 1920×1120px）
  tileSize: 80,
  gridWidth: 24,
  gridHeight: 14,
  initialGold: 120,
  initialLives: 20,
  pathNodes: [
    { x: 0, y: 7 },
    { x: 5, y: 7 },
    { x: 5, y: 3 },
    { x: 12, y: 3 },
    { x: 12, y: 10 },
    { x: 18, y: 10 },
  ],
  waveCount: 8,
};
