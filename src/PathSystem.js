import { tileSize } from "./config.js";

// 路径节点（格子坐标）
export const pathNodes = [
  { x: 0, y: 8 },
  { x: 6, y: 8 },
  { x: 6, y: 2 },
  { x: 16, y: 2 },
  { x: 16, y: 12 },
  { x: 22, y: 12 },
];

/**
 * 根据路径节点构建所有路径格子
 * @param {Array} nodes - 路径节点数组
 * @returns {Array} 路径格子数组
 */
export function buildPathCells(nodes) {
  const cells = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const start = nodes[i];
    const end = nodes[i + 1];
    const stepX = Math.sign(end.x - start.x);
    const stepY = Math.sign(end.y - start.y);
    let x = start.x;
    let y = start.y;

    if (i === 0) {
      cells.push({ x, y });
    }

    while (x !== end.x || y !== end.y) {
      x += stepX;
      y += stepY;
      cells.push({ x, y });
    }
  }
  return cells;
}

/**
 * 格子坐标转像素中心坐标
 * @param {Object} cell - 格子 {x, y}
 * @returns {Object} 像素坐标 {x, y}
 */
function cellCenter(cell) {
  return {
    x: cell.x * tileSize + tileSize / 2,
    y: cell.y * tileSize + tileSize / 2,
  };
}

export const pathCells = buildPathCells(pathNodes);
export const pathKeySet = new Set(pathCells.map((cell) => `${cell.x},${cell.y}`));
export const pathWaypoints = pathCells.map((cell) => cellCenter(cell));
