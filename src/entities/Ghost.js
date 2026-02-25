import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";

/**
 * 鬼兵实体：从路径终点出发，反向沿路径跑向起点
 * 碰到敌人造成伤害并消失；到达起点后消失
 */
export class Ghost {
  /**
   * @param {Object} options
   * @param {Array} options.pathWaypoints - 路径像素坐标数组
   * @param {number} options.damage - 碰撞伤害
   * @param {number} options.speed - 移动速度（像素/秒）
   * @param {number} options.radius - 碰撞半径
   */
  constructor({ pathWaypoints, damage, speed, radius }) {
    this.pathWaypoints = pathWaypoints;
    this.damage = damage;
    this.speed = speed;
    this.radius = radius;
    this.isRemoved = false;

    // 从路径最后一个点开始，反向走向第一个点
    this.waypointIndex = pathWaypoints.length - 1;

    // 用 Graphics 画绿色半透明圆
    const container = new PIXI.Container();

    const circle = new PIXI.Graphics();
    circle.beginFill(0x00ff88, 0.7);
    circle.drawCircle(0, 0, 16);
    circle.endFill();
    container.addChild(circle);

    // 文字「鬼」
    const label = new PIXI.Text("鬼", {
      fontSize: 14,
      fill: 0xffffff,
      fontWeight: "bold",
    });
    label.anchor.set(0.5);
    container.addChild(label);

    this.sprite = container;

    // 设置初始位置（路径终点）
    const startPos = pathWaypoints[this.waypointIndex];
    this.sprite.position.set(startPos.x, startPos.y);
  }

  /**
   * 是否已到达路径起点（即消失条件）
   */
  get isAtEnd() {
    return this.waypointIndex <= 0;
  }
}
