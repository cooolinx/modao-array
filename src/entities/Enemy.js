import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";
import { enemyTypes } from "../config.js";

export class Enemy {
  /**
   * @param {Object} options
   * @param {string} [options.enemyType] - 敌人类型（"soldier" | "fast" | "tank"）
   * @param {number} options.wave - 当前波次（影响属性强度）
   * @param {Object} options.textures - { enemy: PIXI.Texture }
   * @param {Array} options.pathWaypoints - 路径点数组
   */
  constructor({ enemyType = "soldier", wave, textures, pathWaypoints }) {
    const typeCfg = enemyTypes[enemyType] || enemyTypes.soldier;
    this.type = typeCfg.type;
    this.slowFactor = typeCfg.slowFactor || 0.5;

    const maxHp = typeCfg.hpBase + wave * typeCfg.hpPerWave;
    this.hp = maxHp;
    this.maxHp = maxHp;
    this.speed = typeCfg.speedBase + wave * typeCfg.speedPerWave;
    this.reward = typeCfg.reward + wave * typeCfg.rewardPerWave;
    this.waypointIndex = 0;
    this.isRemoved = false;

    // 减速相关
    this.slowedUntil = 0; // 时间戳（秒），被减速状态持续到该时刻

    // 血条颜色
    let hpBarColor = 0x6fe36f; // 默认绿色（soldier）
    if (typeCfg.type === "tank") {
      hpBarColor = 0xffdd44;
    } else if (typeCfg.type === "fast") {
      hpBarColor = 0x44ffaa;
    }
    this._hpBarColor = hpBarColor;

    // 构建 sprite 容器
    const container = new PIXI.Container();

    const body = new PIXI.Sprite(textures.enemy);
    body.anchor.set(0.5);
    body.width = typeCfg.size;
    body.height = typeCfg.size;
    body.tint = typeCfg.tint;
    container.addChild(body);

    // 减速冰晶圆圈（蓝色半透明，默认隐藏）
    const slowCircle = new PIXI.Graphics();
    slowCircle.beginFill(0x88ccff, 0.4);
    slowCircle.drawCircle(0, 0, typeCfg.size / 2 + 4);
    slowCircle.endFill();
    slowCircle.visible = false;
    container.addChild(slowCircle);
    this._slowCircle = slowCircle;

    this.hpBar = new PIXI.Graphics();
    this.hpBar.y = -26;
    container.addChild(this.hpBar);

    this.sprite = container;

    // 设置初始位置
    const start = pathWaypoints[0];
    this.sprite.position.set(start.x, start.y);

    this.updateHpBar();
  }

  /**
   * 有效速度（考虑减速效果）
   */
  get effectiveSpeed() {
    const now = Date.now() / 1000;
    if (now < this.slowedUntil) {
      return this.speed * this.slowFactor;
    }
    return this.speed;
  }

  /**
   * 更新血条显示
   */
  updateHpBar() {
    const width = 28;
    const ratio = Math.max(0, this.hp) / this.maxHp;
    this.hpBar.clear();
    this.hpBar.beginFill(0x1a1a1a);
    this.hpBar.drawRect(-width / 2, 0, width, 4);
    this.hpBar.endFill();
    this.hpBar.beginFill(this._hpBarColor);
    this.hpBar.drawRect(-width / 2, 0, width * ratio, 4);
    this.hpBar.endFill();

    // 更新减速冰晶可见性
    if (this._slowCircle) {
      const now = Date.now() / 1000;
      this._slowCircle.visible = now < this.slowedUntil;
    }
  }
}
