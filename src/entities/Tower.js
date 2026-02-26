import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";
import { tileSize, towerTypes } from "../config.js";

const TOWER_RADIUS = tileSize * 1.5; // 塔可视半径（像素）

export class Tower {
  /**
   * @param {Object} options
   * @param {Object} options.cell - 格子坐标 {x, y}
   * @param {PIXI.Texture} options.texture - 塔贴图（basic 类型使用）
   * @param {Object} [options.config] - 塔配置，默认 basic
   */
  constructor({ cell, texture, config = towerTypes.basic }) {
    this.type = config.type || "basic";
    this.range = config.range;
    this.fireRate = config.fireRate;
    this.damage = config.damage;
    this.cooldown = 0;
    this.cellKey = `${cell.x},${cell.y}`;

    // cannon 特有属性
    this.splashRadius = config.splashRadius || 0;
    // slow 特有属性
    this.slowFactor = config.slowFactor || 0.5;
    this.slowDuration = config.slowDuration || 0;

    // 构建 sprite 容器
    const container = new PIXI.Container();
    container.position.set(
      cell.x * tileSize + tileSize / 2,
      cell.y * tileSize + tileSize / 2
    );

    // 射程圈
    const rangeColor = config.color || 0x6fe3ff;
    const rangeRing = new PIXI.Graphics();
    rangeRing.lineStyle(2, rangeColor, 0.22);
    rangeRing.drawCircle(0, 0, this.range);
    container.addChild(rangeRing);

    // 塔外观：不同类型用不同图形
    const R = TOWER_RADIUS;

    if (config.type === "cannon") {
      const body = new PIXI.Graphics();
      body.beginFill(0xff6b35);
      body.drawCircle(0, 0, R);
      body.endFill();
      body.beginFill(0x1a1a1a);
      body.drawRect(-R * 0.22, -R * 1.35, R * 0.44, R);
      body.endFill();
      container.addChild(body);
    } else if (config.type === "slow") {
      const body = new PIXI.Graphics();
      body.beginFill(0x5599ff);
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        pts.push(R * Math.cos(angle), R * Math.sin(angle));
      }
      body.drawPolygon(pts);
      body.endFill();
      body.lineStyle(2, 0xaaddff, 0.8);
      const pts2 = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        pts2.push(R * 0.45 * Math.cos(angle), R * 0.45 * Math.sin(angle));
      }
      body.drawPolygon(pts2);
      container.addChild(body);
    } else {
      const towerSprite = new PIXI.Sprite(texture);
      towerSprite.anchor.set(0.5);
      towerSprite.width = R * 2;
      towerSprite.height = R * 2;
      container.addChild(towerSprite);
    }

    this.sprite = container;
  }
}
