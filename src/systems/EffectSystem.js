/**
 * 特效系统
 * 
 * 管理所有游戏特效（伤害数字、死亡粒子）
 * 使用对象池优化性能
 */
import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";
import { DamageNumber } from "../entities/DamageNumber.js";
import { DeathEffect } from "../entities/DeathEffect.js";

export class EffectSystem {
  constructor({ effectsLayer }) {
    this.effectsLayer = effectsLayer;
    
    // 特效数组
    this.damageNumbers = [];
    this.deathEffects = [];
    
    // 对象池
    this.damageNumberPool = [];
    this.deathEffectPool = [];
    
    // 池大小配置
    this.poolConfig = {
      damageNumber: 50,
      deathEffect: 30,
    };
    
    // 预初始化对象池
    this.initializePool();
  }

  /**
   * 初始化对象池
   */
  initializePool() {
    // 预创建伤害数字池
    for (let i = 0; i < this.poolConfig.damageNumber; i++) {
      const damageNumber = new DamageNumber({ damage: 0, x: 0, y: 0 });
      damageNumber.text.visible = false;
      this.damageNumberPool.push({
        instance: damageNumber,
        available: true,
      });
    }
    
    // 预创建死亡特效池
    for (let i = 0; i < this.poolConfig.deathEffect; i++) {
      const deathEffect = new DeathEffect({ x: 0, y: 0, particleCount: 1 });
      deathEffect.container.visible = false;
      this.deathEffectPool.push({
        instance: deathEffect,
        available: true,
      });
    }
  }

  /**
   * 生成伤害数字
   * @param {Object} options - 选项
   * @param {number} options.damage - 伤害值
   * @param {number} options.x - X 坐标
   * @param {number} options.y - Y 坐标
   * @param {number} options.color - 颜色（默认白色）
   */
  spawnDamageNumber({ damage, x, y, color = 0xffffff }) {
    // 从对象池获取
    const slot = this.damageNumberPool.find(s => s.available);
    
    if (slot && slot.instance) {
      // 复用现有对象
      slot.instance.reset(damage, x, y, color);
      slot.instance.text.visible = true;
      slot.instance.addToLayer(this.effectsLayer);
      slot.available = false;
      this.damageNumbers.push(slot.instance);
    } else {
      // 池耗尽，创建新对象（应该很少发生）
      console.warn('DamageNumber pool exhausted, creating new instance');
      const damageNumber = new DamageNumber({ damage, x, y, color });
      damageNumber.addToLayer(this.effectsLayer);
      this.damageNumbers.push(damageNumber);
    }
  }

  /**
   * 生成死亡特效
   * @param {Object} options - 选项
   * @param {number} options.x - X 坐标
   * @param {number} options.y - Y 坐标
   * @param {number} options.color - 颜色（默认红色）
   * @param {number} options.particleCount - 粒子数量（默认 12）
   */
  spawnDeathEffect({ x, y, color = 0xff4444, particleCount = 12 }) {
    const slot = this.deathEffectPool.find(s => s.available);
    
    if (slot && slot.instance) {
      // 复用现有对象
      slot.instance.reset(x, y, color, particleCount);
      slot.instance.container.visible = true;
      slot.instance.addToLayer(this.effectsLayer);
      slot.available = false;
      this.deathEffects.push(slot.instance);
    } else {
      // 池耗尽，创建新对象
      console.warn('DeathEffect pool exhausted, creating new instance');
      const deathEffect = new DeathEffect({ x, y, color, particleCount });
      deathEffect.addToLayer(this.effectsLayer);
      this.deathEffects.push(deathEffect);
    }
  }

  /**
   * 更新所有特效
   * @param {number} deltaSec - 距离上一帧的时间（秒）
   */
  update(deltaSec) {
    // 更新伤害数字
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const effect = this.damageNumbers[i];
      effect.update(deltaSec);
      
      if (effect.isRemoved) {
        // 回收到对象池
        this.returnToPool(effect, 'damageNumber');
        this.damageNumbers.splice(i, 1);
      }
    }
    
    // 更新死亡特效
    for (let i = this.deathEffects.length - 1; i >= 0; i--) {
      const effect = this.deathEffects[i];
      effect.update(deltaSec);
      
      if (effect.isRemoved) {
        // 回收到对象池
        this.returnToPool(effect, 'deathEffect');
        this.deathEffects.splice(i, 1);
      }
    }
  }

  /**
   * 归还对象到对象池
   * @param {Object} effect - 特效对象
   * @param {string} poolType - 池类型（'damageNumber' 或 'deathEffect'）
   */
  returnToPool(effect, poolType) {
    const pool = poolType === 'damageNumber' ? this.damageNumberPool : this.deathEffectPool;
    const slot = pool.find(s => s.instance === effect);
    
    if (slot) {
      slot.available = true;
      if (poolType === 'damageNumber') {
        effect.text.visible = false;
      } else {
        effect.container.visible = false;
      }
    }
  }

  /**
   * 清除所有特效
   */
  clearAll() {
    for (const effect of this.damageNumbers) {
      effect.destroy(this.effectsLayer);
    }
    for (const effect of this.deathEffects) {
      effect.destroy(this.effectsLayer);
    }
    this.damageNumbers = [];
    this.deathEffects = [];
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      activeDamageNumbers: this.damageNumbers.length,
      activeDeathEffects: this.deathEffects.length,
      poolDamageNumberAvailable: this.damageNumberPool.filter(s => s.available).length,
      poolDeathEffectAvailable: this.deathEffectPool.filter(s => s.available).length,
    };
  }
}
