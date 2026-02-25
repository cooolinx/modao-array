import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";
import { bulletSpeed } from "../config.js";

/**
 * 创建子弹对象
 * @param {Object} tower - 发射塔
 * @param {Object} target - 目标敌人
 * @returns {Object} 子弹对象 { sprite, target, speed, damage }
 */
export function createBullet(tower, target) {
  const bulletGraphic = new PIXI.Graphics();
  bulletGraphic.beginFill(0xffe29a);
  bulletGraphic.drawCircle(0, 0, 4);
  bulletGraphic.endFill();
  bulletGraphic.position.set(tower.sprite.x, tower.sprite.y);

  return {
    sprite: bulletGraphic,
    target,
    speed: bulletSpeed,
    damage: tower.damage,
  };
}
