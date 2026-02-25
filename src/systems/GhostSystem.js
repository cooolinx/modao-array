/**
 * 鬼兵系统：移动鬼兵、碰撞检测、消除
 */
export function updateGhosts(state, deltaSec, deps) {
  const { ghostsLayer, enemiesLayer } = deps;

  for (let i = state.ghosts.length - 1; i >= 0; i--) {
    const ghost = state.ghosts[i];
    if (ghost.isRemoved) {
      removeGhostAt(state, i, ghostsLayer);
      continue;
    }

    // 已到达起点 → 消失
    if (ghost.isAtEnd) {
      removeGhostAt(state, i, ghostsLayer);
      continue;
    }

    // 移动：反向沿路径（waypointIndex 从末尾递减到0）
    const targetWP = ghost.pathWaypoints[ghost.waypointIndex - 1];
    if (!targetWP) {
      removeGhostAt(state, i, ghostsLayer);
      continue;
    }

    const dx = targetWP.x - ghost.sprite.x;
    const dy = targetWP.y - ghost.sprite.y;
    const distance = Math.hypot(dx, dy);
    const step = ghost.speed * deltaSec;

    if (distance <= step) {
      ghost.sprite.position.set(targetWP.x, targetWP.y);
      ghost.waypointIndex -= 1;
    } else {
      ghost.sprite.x += (dx / distance) * step;
      ghost.sprite.y += (dy / distance) * step;
    }

    // 碰撞检测：与所有存活的敌人
    const collisionDist = ghost.radius + 18;
    const collisionDistSq = collisionDist * collisionDist;
    let hit = false;

    for (const enemy of state.enemies) {
      if (enemy.isRemoved) continue;
      const ex = enemy.sprite.x - ghost.sprite.x;
      const ey = enemy.sprite.y - ghost.sprite.y;
      const distSq = ex * ex + ey * ey;
      if (distSq <= collisionDistSq) {
        // 命中：敌人扣血，鬼兵消失
        enemy.hp -= ghost.damage;
        enemy.updateHpBar();
        hit = true;
        break; // 每个鬼兵只伤害一个敌人
      }
    }

    if (hit) {
      removeGhostAt(state, i, ghostsLayer);
    }
  }
}

function removeGhostAt(state, index, ghostsLayer) {
  const ghost = state.ghosts[index];
  ghost.isRemoved = true;
  ghostsLayer.removeChild(ghost.sprite);
  ghost.sprite.destroy({ children: true });
  state.ghosts.splice(index, 1);
}
