import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";
import { tileSize, towerTypes } from "../config.js";

export class Tower {
  /**
   * @param {Object} options
   * @param {Object} options.cell - 格子坐标 {x, y}
   * @param {PIXI.Texture} options.texture - 塔贴图
   * @param {Object} [options.config] - 塔配置，默认 basic
   */
  constructor({ cell, texture, config = towerTypes.basic }) {
    this.type = config.type || "basic";
    this.range = config.range;
    this.fireRate = config.fireRate;
    this.damage = config.damage;
    this.cooldown = 0;
    this.cellKey = `${cell.x},${cell.y}`;

    // 构建 sprite 容器
    const container = new PIXI.Container();
    container.position.set(
      cell.x * tileSize + tileSize / 2,
      cell.y * tileSize + tileSize / 2
    );

    const rangeRing = new PIXI.Graphics();
    rangeRing.lineStyle(2, 0x6fe3ff, 0.18);
    rangeRing.drawCircle(0, 0, this.range);
    container.addChild(rangeRing);

    const towerSprite = new PIXI.Sprite(texture);
    towerSprite.anchor.set(0.5);
    towerSprite.width = config.spriteWidth || 52;
    towerSprite.height = config.spriteHeight || 52;
    container.addChild(towerSprite);

    this.sprite = container;
  }
}
