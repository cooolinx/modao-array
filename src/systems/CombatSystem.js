import { createBullet } from "../entities/Bullet.js";

/**
 * 更新所有塔的攻击逻辑
 * @param {Object} state - 游戏状态
 * @param {number} deltaSec - 帧时间（秒）
 * @param {Object} deps - 依赖 { bulletsLayer }
 */
export function updateTowers(state, deltaSec, deps) {
  for (const tower of state.towers) {
    tower.cooldown -= deltaSec;
    if (tower.cooldown > 0) {
      continue;
    }

    const target = findTarget(tower, state.enemies);
    if (!target) {
      continue;
    }

    fireBullet(state, tower, target, deps);
    tower.cooldown = 1 / tower.fireRate;
  }
}

/**
 * 更新所有子弹的移动和命中逻辑
 * @param {Object} state - 游戏状态
 * @param {number} deltaSec - 帧时间（秒）
 * @param {Object} deps - 依赖 { bulletsLayer }
 */
export function updateBullets(state, deltaSec, deps) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    const target = bullet.target;
    if (!target || target.isRemoved) {
      removeBulletAt(state, i, deps);
      continue;
    }

    const dx = target.sprite.x - bullet.sprite.x;
    const dy = target.sprite.y - bullet.sprite.y;
    const distance = Math.hypot(dx, dy);
    const step = bullet.speed * deltaSec;

    if (distance <= step) {
      // 子弹命中目标
      handleBulletHit(state, bullet, target);
      removeBulletAt(state, i, deps);
      continue;
    }

    bullet.sprite.x += (dx / distance) * step;
    bullet.sprite.y += (dy / distance) * step;
  }
}

/**
 * 处理子弹命中
 * @param {Object} state - 游戏状态
 * @param {Object} bullet - 命中的子弹
 * @param {Object} target - 被命中的目标
 */
function handleBulletHit(state, bullet, target) {
  if (bullet.towerType === "cannon" && bullet.splashRadius > 0) {
    // 群体伤害：在 splashRadius 内对所有敌人造成伤害
    const splashSq = bullet.splashRadius * bullet.splashRadius;
    for (const enemy of state.enemies) {
      if (enemy.isRemoved) continue;
      const dx = enemy.sprite.x - target.sprite.x;
      const dy = enemy.sprite.y - target.sprite.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= splashSq) {
        enemy.hp -= bullet.damage;
      }
    }
  } else if (bullet.towerType === "slow") {
    // 减速命中：单体伤害 + 设置减速状态
    target.hp -= bullet.damage;
    const slowUntil = Date.now() / 1000 + bullet.slowDuration;
    target.slowedUntil = Math.max(target.slowedUntil, slowUntil);
  } else {
    // basic 单体伤害
    target.hp -= bullet.damage;
  }
}

/**
 * 寻找塔射程内最近的敌人
 * @param {Object} tower - 防御塔
 * @param {Array} enemies - 敌人数组
 * @returns {Object|null} 目标敌人
 */
export function findTarget(tower, enemies) {
  const rangeSq = tower.range * tower.range;
  let closest = null;
  let closestDist = Infinity;

  for (const enemy of enemies) {
    if (enemy.isRemoved) {
      continue;
    }
    const dx = enemy.sprite.x - tower.sprite.x;
    const dy = enemy.sprite.y - tower.sprite.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= rangeSq && distSq < closestDist) {
      closest = enemy;
      closestDist = distSq;
    }
  }

  return closest;
}

/**
 * 塔发射子弹
 * @param {Object} state - 游戏状态
 * @param {Object} tower - 发射塔
 * @param {Object} target - 目标敌人
 * @param {Object} deps - 依赖 { bulletsLayer }
 */
export function fireBullet(state, tower, target, deps) {
  const { bulletsLayer } = deps;
  const bullet = createBullet(tower, target);
  bulletsLayer.addChild(bullet.sprite);
  state.bullets.push(bullet);
}

function removeBulletAt(state, index, deps) {
  const { bulletsLayer } = deps;
  const bullet = state.bullets[index];
  bulletsLayer.removeChild(bullet.sprite);
  bullet.sprite.destroy();
  state.bullets.splice(index, 1);
}
