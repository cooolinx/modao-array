import { tileSize } from "./config.js";

/**
 * 根据路径节点构建所有路径格子、pathKeySet、pathWaypoints
 * @param {Array} nodes - 路径节点数组 [{x, y}, ...]（格子坐标）
 * @returns {{ cells, pathKeySet, pathWaypoints }}
 */
export function buildPathCells(nodes) {
  const cells = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const start = nodes[i];
    const end = nodes[i + 1];
    const stepX = Math.sign(end.x - start.x);
    const stepY = Math.sign(end.y - start.y);
    let x = start.x, y = start.y;
    if (i === 0) cells.push({ x, y });
    while (x !== end.x || y !== end.y) {
      x += stepX;
      y += stepY;
      cells.push({ x, y });
    }
  }
  const pathKeySet = new Set(cells.map(c => `${c.x},${c.y}`));
  const pathWaypoints = cells.map(c => ({
    x: c.x * tileSize + tileSize / 2,
    y: c.y * tileSize + tileSize / 2,
  }));
  return { cells, pathKeySet, pathWaypoints };
}
