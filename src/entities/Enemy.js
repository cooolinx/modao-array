import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";

export class Enemy {
  /**
   * @param {Object} options
   * @param {number} options.wave - 当前波次（影响属性强度）
   * @param {Object} options.textures - { enemy: PIXI.Texture }
   * @param {Array} options.pathWaypoints - 路径点数组
   */
  constructor({ wave, textures, pathWaypoints }) {
    this.type = "basic";
    const maxHp = 40 + wave * 14;
    this.hp = maxHp;
    this.maxHp = maxHp;
    this.speed = 45 + wave * 4;
    this.reward = 12 + wave * 2;
    this.waypointIndex = 0;
    this.isRemoved = false;

    // 构建 sprite 容器
    const container = new PIXI.Container();

    const body = new PIXI.Sprite(textures.enemy);
    body.anchor.set(0.5);
    body.width = 36;
    body.height = 36;
    container.addChild(body);

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
   * 更新血条显示
   */
  updateHpBar() {
    const width = 28;
    const ratio = Math.max(0, this.hp) / this.maxHp;
    this.hpBar.clear();
    this.hpBar.beginFill(0x1a1a1a);
    this.hpBar.drawRect(-width / 2, 0, width, 4);
    this.hpBar.endFill();
    this.hpBar.beginFill(0x6fe36f);
    this.hpBar.drawRect(-width / 2, 0, width * ratio, 4);
    this.hpBar.endFill();
  }
}
