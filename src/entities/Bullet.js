import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";
import { bulletSpeed } from "../config.js";

/**
 * 创建子弹对象
 * @param {Object} tower - 发射塔
 * @param {Object} target - 目标敌人
 * @returns {Object} 子弹对象 { sprite, target, speed, damage, towerType, splashRadius, slowFactor, slowDuration }
 */
export function createBullet(tower, target) {
  const bulletGraphic = new PIXI.Graphics();

  // 根据塔类型设置子弹视觉
  if (tower.type === "cannon") {
    bulletGraphic.beginFill(0xff6b35);
    bulletGraphic.drawCircle(0, 0, 7);
    bulletGraphic.endFill();
  } else if (tower.type === "slow") {
    bulletGraphic.beginFill(0x88ccff);
    bulletGraphic.drawCircle(0, 0, 5);
    bulletGraphic.endFill();
  } else {
    // basic
    bulletGraphic.beginFill(0xffe29a);
    bulletGraphic.drawCircle(0, 0, 4);
    bulletGraphic.endFill();
  }

  bulletGraphic.position.set(tower.sprite.x, tower.sprite.y);

  return {
    sprite: bulletGraphic,
    target,
    speed: bulletSpeed,
    damage: tower.damage,
    towerType: tower.type,
    splashRadius: tower.splashRadius || 0,
    slowFactor: tower.slowFactor || 0.5,
    slowDuration: tower.slowDuration || 0,
  };
}
