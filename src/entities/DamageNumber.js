/**
 * 伤害数字飘字实体
 * 
 * 显示敌人受到的伤害，向上飘动并渐隐
 */
import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";

export class DamageNumber {
  constructor({ damage, x, y, color = 0xffffff }) {
    // 创建伤害数字文本
    this.text = new PIXI.Text(`${Math.round(damage)}`, {
      fontFamily: "Arial, sans-serif",
      fontSize: 20,
      fill: color,
      stroke: 0x000000,
      strokeThickness: 4,
      dropShadow: true,
      dropShadowColor: "#000000",
      dropShadowBlur: 4,
      dropShadowAngle: Math.PI / 2,
      dropShadowDistance: 2,
    });
    
    this.text.anchor.set(0.5);
    this.text.position.set(x, y);
    this.text.alpha = 1;
    this.text.y = y;
    
    // 生命周期
    this.lifetime = 2.0; // 秒
    this.isRemoved = false;
    
    // 飘动速度
    this.floatSpeed = 40; // 像素/秒
  }

  /**
   * 更新伤害数字状态
   * @param {number} deltaSec - 距离上一帧的时间（秒）
   */
  update(deltaSec) {
    // 向上飘动
    this.text.y -= this.floatSpeed * deltaSec;
    
    // 减少生命周期
    this.lifetime -= deltaSec;
    
    // 渐隐效果（最后 0.5 秒加速淡出）
    if (this.lifetime <= 0.5) {
      this.text.alpha = this.lifetime / 0.5;
    }
    
    // 标记是否应该移除
    if (this.lifetime <= 0) {
      this.isRemoved = true;
    }
  }

  /**
   * 重置伤害数字（用于对象池复用）
   * @param {number} damage - 伤害值
   * @param {number} x - X 坐标
   * @param {number} y - Y 坐标
   * @param {number} color - 颜色
   */
  reset(damage, x, y, color = 0xffffff) {
    this.text.text = `${Math.round(damage)}`;
    this.text.position.set(x, y);
    this.text.alpha = 1;
    this.text.y = y;
    this.lifetime = 2.0;
    this.isRemoved = false;
  }

  /**
   * 销毁伤害数字
   * @param {PIXI.Container} layer - 特效层
   */
  destroy(layer) {
    if (this.text.parent === layer) {
      layer.removeChild(this.text);
    }
    this.text.destroy({ children: true });
  }

  /**
   * 添加到层
   * @param {PIXI.Container} layer - 特效层
   */
  addToLayer(layer) {
    layer.addChild(this.text);
  }
}
