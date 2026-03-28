import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";
import { towerTypes, towerUpgradeConfig, towerSellConfig } from "../config.js";

export class Tower {
  /**
   * @param {Object} options
   * @param {Object} options.cell - 格子坐标 {x, y}
   * @param {PIXI.Texture} options.texture - 塔贴图（basic 类型使用）
   * @param {Object} [options.config] - 塔配置，默认 basic
   * @param {number} [options.tileSize] - 格子尺寸（像素），默认 64
   */
  constructor({ cell, texture, config = towerTypes.basic, tileSize = 64 }) {
    this.type = config.type || "basic";
    this.baseRange = config.range;
    this.baseFireRate = config.fireRate;
    this.baseDamage = config.damage;
    this.baseCost = config.cost || 50;
    this.range = config.range;
    this.fireRate = config.fireRate;
    this.damage = config.damage;
    this.cooldown = 0;
    this.cellKey = `${cell.x},${cell.y}`;
    
    // 等级系统
    this.level = 1;
    this.maxLevel = towerUpgradeConfig.maxLevel;

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
    if (config.type === "cannon") {
      const body = new PIXI.Graphics();
      body.beginFill(0xff6b35);
      body.drawCircle(0, 0, 22);
      body.endFill();
      body.beginFill(0x1a1a1a);
      body.drawRect(-5, -30, 10, 22);
      body.endFill();
      container.addChild(body);
    } else if (config.type === "slow") {
      const body = new PIXI.Graphics();
      body.beginFill(0x5599ff);
      const r = 22;
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        pts.push(r * Math.cos(angle), r * Math.sin(angle));
      }
      body.drawPolygon(pts);
      body.endFill();
      body.lineStyle(2, 0xaaddff, 0.8);
      const r2 = 10;
      const pts2 = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        pts2.push(r2 * Math.cos(angle), r2 * Math.sin(angle));
      }
      body.drawPolygon(pts2);
      container.addChild(body);
    } else {
      const towerSprite = new PIXI.Sprite(texture);
      towerSprite.anchor.set(0.5);
      towerSprite.width = config.spriteWidth || 52;
      towerSprite.height = config.spriteHeight || 52;
      container.addChild(towerSprite);
    }

    this.sprite = container;
  }

  /**
   * 计算升级成本
   * @returns {number} 升级所需灵石
   */
  getUpgradeCost() {
    if (this.level >= this.maxLevel) return 0;
    return Math.floor(this.baseCost * this.level * towerUpgradeConfig.costMultiplier);
  }

  /**
   * 计算出售退款
   * @returns {number} 出售可获得的灵石
   */
  getSellRefund() {
    const totalSpent = this.baseCost + this.getTotalUpgradeCost();
    return Math.floor(totalSpent * towerSellConfig.refundRate);
  }

  /**
   * 计算已花费的升级总成本
   * @returns {number}
   */
  getTotalUpgradeCost() {
    let total = 0;
    for (let i = 1; i < this.level; i++) {
      total += Math.floor(this.baseCost * i * towerUpgradeConfig.costMultiplier);
    }
    return total;
  }

  /**
   * 升级塔
   * @returns {boolean} 是否升级成功
   */
  upgrade() {
    if (this.level >= this.maxLevel) return false;
    
    this.level++;
    
    // 应用属性提升
    this.damage = this.baseDamage * (1 + towerUpgradeConfig.damageBonusPerLevel * (this.level - 1));
    this.range = this.baseRange * (1 + towerUpgradeConfig.rangeBonusPerLevel * (this.level - 1));
    this.fireRate = this.baseFireRate * (1 + towerUpgradeConfig.fireRateBonusPerLevel * (this.level - 1));
    
    // 更新射程圈显示
    this.updateRangeRing();
    
    return true;
  }

  /**
   * 更新射程圈显示
   */
  updateRangeRing() {
    const rangeRing = this.sprite.children.find(c => c instanceof PIXI.Graphics && c === this.sprite.children[0]);
    if (rangeRing) {
      rangeRing.clear();
      const rangeColor = this.getRangeColor();
      rangeRing.lineStyle(2, rangeColor, 0.22);
      rangeRing.drawCircle(0, 0, this.range);
    }
  }

  /**
   * 获取射程圈颜色（根据等级变化）
   * @returns {number}
   */
  getRangeColor() {
    const colors = [0x6fe3ff, 0x88ff88, 0xffff88, 0xffaa88, 0xff66ff];
    return colors[Math.min(this.level - 1, colors.length - 1)] || 0x6fe3ff;
  }

  /**
   * 获取塔的详细信息
   * @returns {Object}
   */
  getInfo() {
    return {
      type: this.type,
      level: this.level,
      maxLevel: this.maxLevel,
      damage: Math.round(this.damage),
      range: Math.round(this.range),
      fireRate: this.fireRate.toFixed(2),
      dps: Math.round(this.damage * this.fireRate),
      upgradeCost: this.getUpgradeCost(),
      sellRefund: this.getSellRefund(),
    };
  }
}
