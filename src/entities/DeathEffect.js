/**
 * 敌人死亡粒子特效
 * 
 * 敌人死亡时触发粒子爆炸效果
 */
import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";

export class DeathEffect {
  constructor({ x, y, color = 0xff4444, particleCount = 12 }) {
    this.container = new PIXI.Container();
    this.container.position.set(x, y);
    
    this.particles = [];
    this.lifetime = 1.0; // 秒
    this.isRemoved = false;
    
    // 创建粒子
    for (let i = 0; i < particleCount; i++) {
      const particle = new PIXI.Graphics();
      
      // 随机大小（3-6 像素）
      const size = 3 + Math.random() * 3;
      particle.beginFill(color);
      particle.drawCircle(0, 0, size);
      particle.endFill();
      
      // 随机方向（0-360 度）
      const angle = Math.random() * Math.PI * 2;
      // 随机速度（80-150 像素/秒）
      const speed = 80 + Math.random() * 70;
      
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      
      // 重力效果（可选）
      particle.gravity = 20; // 像素/秒²
      
      particle.alpha = 1;
      
      this.container.addChild(particle);
      this.particles.push(particle);
    }
  }

  /**
   * 更新粒子状态
   * @param {number} deltaSec - 距离上一帧的时间（秒）
   */
  update(deltaSec) {
    this.lifetime -= deltaSec;
    
    for (const particle of this.particles) {
      // 应用速度
      particle.x += particle.vx * deltaSec;
      particle.y += particle.vy * deltaSec;
      
      // 应用重力
      particle.vy += particle.gravity * deltaSec;
      
      // 渐隐效果（最后 0.3 秒加速淡出）
      if (this.lifetime <= 0.3) {
        particle.alpha = this.lifetime / 0.3;
      }
    }
    
    // 标记是否应该移除
    if (this.lifetime <= 0) {
      this.isRemoved = true;
    }
  }

  /**
   * 重置死亡特效（用于对象池复用）
   * @param {number} x - X 坐标
   * @param {number} y - Y 坐标
   * @param {number} color - 颜色
   * @param {number} particleCount - 粒子数量
   */
  reset(x, y, color = 0xff4444, particleCount = 12) {
    this.container.position.set(x, y);
    this.lifetime = 1.0;
    this.isRemoved = false;
    
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      if (i < particleCount) {
        particle.visible = true;
        particle.alpha = 1;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 70;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
      } else {
        particle.visible = false;
      }
    }
  }

  /**
   * 销毁死亡特效
   * @param {PIXI.Container} layer - 特效层
   */
  destroy(layer) {
    if (this.container.parent === layer) {
      layer.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }

  /**
   * 添加到层
   * @param {PIXI.Container} layer - 特效层
   */
  addToLayer(layer) {
    layer.addChild(this.container);
  }
}
