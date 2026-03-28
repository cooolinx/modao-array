import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";
import { enemyTypes } from "../config.js";

export class Enemy {
  /**
   * @param {Object} options
   * @param {string} [options.enemyType] - 敌人类型（"soldier" | "fast" | "tank"）
   * @param {number} options.wave - 当前波次（影响属性强度）
   * @param {Object} options.textures - { enemy: PIXI.Texture, enemySoldier: PIXI.Texture, enemyFast: PIXI.Texture, enemyTank: PIXI.Texture }
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

    // 血条平滑过渡相关
    this._currentHpRatio = 1; // 当前显示的血量比例（用于 lerp）
    this._lastDamageTime = 0; // 上次受伤时间（用于闪烁计时）

    // 构建 sprite 容器
    const container = new PIXI.Container();

    // 根据敌人类型加载对应贴图（优先使用 AnimatedSprite walk frames）
    const cap = enemyType.charAt(0).toUpperCase() + enemyType.slice(1);
    const framesKey = `enemy${cap}Frames`;
    const textureKey = `enemy${cap}`;

    let body;
    if (textures[framesKey] && textures[framesKey].length > 0) {
      // 有 walk frames → AnimatedSprite
      body = new PIXI.AnimatedSprite(textures[framesKey]);
      body.animationSpeed = typeCfg.animationSpeed || 0.12;
      body.play();
    } else {
      // fallback → 静态 Sprite
      body = new PIXI.Sprite(textures[textureKey] || textures.enemy);
    }
    body.anchor.set(0.5);
    body.width = typeCfg.size;
    body.height = typeCfg.size;
    container.addChild(body);

    // 减速冰晶圆圈（蓝色半透明，默认隐藏）
    const slowCircle = new PIXI.Graphics();
    slowCircle.beginFill(0x88ccff, 0.4);
    slowCircle.drawCircle(0, 0, typeCfg.size / 2 + 4);
    slowCircle.endFill();
    slowCircle.visible = false;
    container.addChild(slowCircle);
    this._slowCircle = slowCircle;

    // 血条容器
    this.hpBarContainer = new PIXI.Container();
    this.hpBarContainer.y = -26;
    container.addChild(this.hpBarContainer);

    // 血条背景（半透明黑色）
    this.hpBarBg = new PIXI.Graphics();
    this.hpBarContainer.addChild(this.hpBarBg);

    // 血条前景（动态颜色）
    this.hpBarFg = new PIXI.Graphics();
    this.hpBarContainer.addChild(this.hpBarFg);

    // 敌人类型图标
    this.typeIcon = new PIXI.Graphics();
    this.typeIcon.y = -42; // 在血条上方
    container.addChild(this.typeIcon);

    this.sprite = container;

    // 设置初始位置
    const start = pathWaypoints[0];
    this.sprite.position.set(start.x, start.y);

    // 绘制类型图标
    this._drawTypeIcon(typeCfg);

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
   * 根据血量比例获取颜色（绿→黄→红渐变）
   * @param {number} ratio - 血量比例 0-1
   * @returns {number} PIXI 颜色值
   */
  _getHpBarColor(ratio) {
    if (ratio > 0.6) {
      // 绿色 (0x6fe36f)
      return 0x6fe36f;
    } else if (ratio > 0.3) {
      // 黄色 (0xffdd44)
      return 0xffdd44;
    } else {
      // 红色 (0xff4444)
      return 0xff4444;
    }
  }

  /**
   * 绘制敌人类型图标
   * @param {Object} typeCfg - 敌人类型配置
   */
  _drawTypeIcon(typeCfg) {
    this.typeIcon.clear();
    const iconSize = 14;
    const half = iconSize / 2;

    if (typeCfg.type === "soldier") {
      // 剑形图标（普通剑修弟子）
      this.typeIcon.beginFill(0xcccccc);
      // 剑身
      this.typeIcon.drawRect(-2, -half + 2, 4, half - 2);
      // 剑格
      this.typeIcon.drawRect(-6, 0, 12, 3);
      // 剑柄
      this.typeIcon.drawRect(-1.5, 3, 3, 4);
      this.typeIcon.endFill();
    } else if (typeCfg.type === "fast") {
      // 风形图标（御风剑修，青色）
      this.typeIcon.beginFill(0x44ffaa);
      // 绘制风的曲线形状
      this.typeIcon.moveTo(-half, -2);
      this.typeIcon.quadraticCurveTo(-2, -6, half, -2);
      this.typeIcon.quadraticCurveTo(2, 2, -half, 2);
      this.typeIcon.quadraticCurveTo(-2, 6, half, 2);
      this.typeIcon.endFill();
    } else if (typeCfg.type === "tank") {
      // 盾形图标（龙气禁卫，金色）
      this.typeIcon.beginFill(0xffdd44);
      // 盾牌形状
      this.typeIcon.moveTo(-half, -half + 2);
      this.typeIcon.lineTo(half, -half + 2);
      this.typeIcon.lineTo(half - 2, 0);
      this.typeIcon.lineTo(half, half - 2);
      this.typeIcon.lineTo(-half, half - 2);
      this.typeIcon.lineTo(-half + 2, 0);
      this.typeIcon.closePath();
      this.typeIcon.endFill();
      // 盾牌边框
      this.typeIcon.lineStyle(1, 0xffaa00, 0.8);
      this.typeIcon.moveTo(-half, -half + 2);
      this.typeIcon.lineTo(half, -half + 2);
      this.typeIcon.lineTo(half - 2, 0);
      this.typeIcon.lineTo(half, half - 2);
      this.typeIcon.lineTo(-half, half - 2);
      this.typeIcon.lineTo(-half + 2, 0);
      this.typeIcon.closePath();
    }
  }

  /**
   * 更新血条显示（支持平滑过渡和闪烁）
   * @param {number} deltaTime - 距离上次更新的时间（秒）
   */
  updateHpBar(deltaTime = 0.016) {
    const width = 28;
    const targetRatio = Math.max(0, this.hp / this.maxHp);
    
    // 平滑过渡（lerp）
    const lerpSpeed = 3.0; // 过渡速度
    this._currentHpRatio += (targetRatio - this._currentHpRatio) * lerpSpeed * deltaTime;
    // 限制在目标值附近，避免无限接近
    if (Math.abs(this._currentHpRatio - targetRatio) < 0.01) {
      this._currentHpRatio = targetRatio;
    }

    // 记录受伤时间（用于闪烁）
    const now = Date.now() / 1000;
    if (targetRatio < this._lastRatio) {
      this._lastDamageTime = now;
    }
    this._lastRatio = targetRatio;

    // 绘制血条背景（半透明黑色）
    this.hpBarBg.clear();
    this.hpBarBg.beginFill(0x000000, 0.6);
    this.hpBarBg.drawRect(-width / 2, 0, width, 4);
    this.hpBarBg.endFill();

    // 确定血条颜色
    let barColor = this._getHpBarColor(this._currentHpRatio);
    
    // 低血量闪烁效果（<30% 时红色闪烁）
    let isVisible = true;
    if (targetRatio < 0.3) {
      const timeSinceDamage = now - this._lastDamageTime;
      // 受伤后 3 秒内闪烁，频率 5Hz
      if (timeSinceDamage < 3.0) {
        const flashPeriod = 0.2; // 200ms 周期
        isVisible = Math.floor(timeSinceDamage / flashPeriod) % 2 === 0;
      }
    }

    // 绘制血条前景
    this.hpBarFg.clear();
    if (isVisible && this._currentHpRatio > 0) {
      this.hpBarFg.beginFill(barColor);
      this.hpBarFg.drawRect(-width / 2, 0, width * this._currentHpRatio, 4);
      this.hpBarFg.endFill();
    }

    // 更新减速冰晶可见性
    if (this._slowCircle) {
      const nowTime = Date.now() / 1000;
      this._slowCircle.visible = nowTime < this.slowedUntil;
    }
  }
}
