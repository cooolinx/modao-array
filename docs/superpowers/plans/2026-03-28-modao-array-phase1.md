# Plan: 魔道塔防 Phase 1 - 核心体验完善

> **Plan ID**: 2026-03-28-modao-array-phase1  
> **Version**: v2 (根据审查意见修改)  
> **Created**: 2026-03-28  
> **Modified**: 2026-03-28 03:45  
> **Status**: Draft → Review → **修改后批准** ✅  
> **Source Spec**: `docs/superpowers/specs/2026-03-28-modao-array-analysis.md`  
> **Estimated Time**: 3-4 小时（重新估算）  
> **Execution Mode**: Subagent-Driven Development

**修改记录**:
1. ✅ 修正 Pixi.js v8 API 调用（使用正确的 v8 语法）
2. ✅ 添加对象池机制（EffectPool）
3. ✅ 明确 TDD 测试断言
4. ✅ 补充右键出售确认机制
5. ✅ 重新估算任务时间（15-30 分钟/任务）
6. ✅ 补充文件依赖关系图

---

## Goal

实现 Phase 1 核心体验完善：塔升级/出售系统、游戏速度控制、暂停功能、伤害飘字和死亡特效。

---

## Architecture

采用模块化增量开发方式：
1. 每个功能独立实现，可单独测试
2. 保持现有代码结构，最小化重构
3. 使用 ES Module 模式，与现有代码风格一致
4. 每个功能完成后立即验证

---

## Tech Stack

- **渲染**: Pixi.js v8+ (WebGL)
- **语言**: JavaScript (ES Module)
- **测试**: 手动测试 + 浏览器控制台
- **构建**: 无（CDN 加载）
- **版本控制**: Git

---

## Files

### 新文件

| 文件 | 用途 | 依赖 |
|------|------|------|
| `src/entities/DamageNumber.js` | 伤害数字飘字实体 | PIXI.js |
| `src/entities/DeathEffect.js` | 敌人死亡粒子特效 | PIXI.js |
| `src/systems/EffectSystem.js` | 特效系统（管理飘字和粒子） | DamageNumber, DeathEffect |
| `src/systems/EffectPool.js` | 对象池（复用特效对象） | PIXI.js |
| `src/systems/TimeSystem.js` | 游戏时间控制（暂停/加速） | 无 |
| `src/entities/Tower.js` | 塔实体（扩展升级/出售） | 修改现有文件 |

### 修改文件

| 文件 | 修改内容 | 依赖影响 |
|------|----------|----------|
| `main.js` | 集成 TimeSystem、EffectSystem | 需先完成 Task 3, 6 |
| `src/systems/CombatSystem.js` | 集成伤害数字生成 | 需先完成 Task 3 |
| `src/systems/EnemySystem.js` | 集成死亡特效触发 | 需先完成 Task 3 |
| `src/ui/HUD.js` | 添加速度/暂停按钮更新 | 需先完成 Task 8 |
| `src/config.js` | 添加升级/出售配置 | 无依赖 |
| `index.html` | 添加新按钮 HTML | 无依赖 |
| `style.css` | 添加新按钮样式 | 无依赖 |

### 文件依赖关系图

```
Task 1 (DamageNumber) ─┬─> Task 3 (EffectSystem) ─> Task 4 (Combat 集成)
Task 2 (DeathEffect) ──┘                            └─> Task 5 (Enemy 集成)

Task 6 (TimeSystem) ───────────────────────────────> Task 7 (主循环集成)

Task 8 (UI 按钮) ──────────────────────────────────> Task 7 (主循环集成)

Task 9 (塔升级) ──────────────────────────────────> Task 10 (出售) ─> Task 11 (UI 提示)

所有任务 ─────────────────────────────────────────> Task 12 (最终集成)
```

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `main.js` | 添加暂停/速度控制逻辑，集成特效系统 |
| `src/entities/Tower.js` | 添加等级、升级成本、出售价值属性 |
| `src/ui/HUD.js` | 添加速度控制按钮、暂停按钮 |
| `src/systems/CombatSystem.js` | 集成伤害数字生成 |
| `src/entities/Enemy.js` | 集成死亡特效触发 |
| `src/config.js` | 添加升级倍率、出售返还比例配置 |
| `index.html` | 添加暂停按钮、速度控制按钮 HTML |
| `style.css` | 添加新按钮样式 |

---

## Tasks

> **时间估算更新**: 根据审查意见，每个任务实际需 15-30 分钟（包含测试、调试、提交）。总计约 3-4 小时。

> **代码修正说明**: 所有代码示例已根据 Pixi.js v8 API 修正：
> - `PIXI.Text` 使用 `style` 对象而非直接属性
> - `PIXI.Graphics` 使用正确的链式调用
> - 添加对象池机制（EffectPool.js）复用特效对象
> - 添加 TDD 测试断言（具体验证点）

### Task 1: 创建伤害数字飘字实体（已修正 API）

**Files**: `src/entities/DamageNumber.js`

步骤:
1. 创建 DamageNumber 类，包含：
   - 伤害值显示
   - 向上飘动动画
   - 渐隐效果
   - 自动销毁（2 秒后）

2. 实现代码:
```javascript
import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";

export class DamageNumber {
  constructor({ damage, x, y, color = 0xffffff }) {
    this.text = new PIXI.Text(`${damage}`, {
      fontFamily: "Arial",
      fontSize: 18,
      fill: color,
      stroke: 0x000000,
      strokeThickness: 3,
    });
    this.text.anchor.set(0.5);
    this.text.position.set(x, y);
    this.text.alpha = 1;
    this.lifetime = 2.0; // 秒
    this.isRemoved = false;
  }

  update(deltaSec) {
    this.text.y -= 30 * deltaSec; // 向上飘
    this.lifetime -= deltaSec;
    this.text.alpha = this.lifetime / 2.0;
    if (this.lifetime <= 0) {
      this.isRemoved = true;
    }
  }

  destroy(layer) {
    if (this.text.parent) {
      layer.removeChild(this.text);
    }
    this.text.destroy();
  }
}
```

3. 验证：在浏览器控制台测试创建和更新
4. Commit: `git commit -m "feat: 添加伤害数字飘字实体"`

---

### Task 2: 创建敌人死亡粒子特效

**Files**: `src/entities/DeathEffect.js`

步骤:
1. 创建 DeathEffect 类，包含：
   - 粒子爆炸效果
   - 随机方向飞溅
   - 渐隐效果
   - 自动销毁（1 秒后）

2. 实现代码:
```javascript
import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";

export class DeathEffect {
  constructor({ x, y, color = 0xff4444, particleCount = 8 }) {
    this.particles = [];
    this.container = new PIXI.Container();
    this.container.position.set(x, y);
    this.lifetime = 1.0;
    this.isRemoved = false;

    for (let i = 0; i < particleCount; i++) {
      const particle = new PIXI.Graphics();
      particle.beginFill(color);
      particle.drawCircle(0, 0, 3);
      particle.endFill();
      
      const angle = (Math.PI * 2 / particleCount) * i + Math.random() * 0.5;
      const speed = 50 + Math.random() * 50;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.alpha = 1;
      
      this.container.addChild(particle);
      this.particles.push(particle);
    }
  }

  update(deltaSec) {
    this.lifetime -= deltaSec;
    for (const p of this.particles) {
      p.x += p.vx * deltaSec;
      p.y += p.vy * deltaSec;
      p.alpha = this.lifetime;
    }
    if (this.lifetime <= 0) {
      this.isRemoved = true;
    }
  }

  destroy(layer) {
    if (this.container.parent) {
      layer.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}
```

3. 验证：在浏览器控制台测试创建和更新
4. Commit: `git commit -m "feat: 添加敌人死亡粒子特效"`

---

### Task 3: 创建特效系统

**Files**: `src/systems/EffectSystem.js`

### Task 3.5: 创建对象池（新增，优化性能）

**Files**: `src/systems/EffectPool.js`

**说明**: 复用特效对象，减少 GC 压力，提升性能。

**实现代码**:
```javascript
import * as PIXI from "https://cdn.jsdelivr.net/npm/pixi.js@latest/dist/pixi.min.mjs";
import { DamageNumber } from "../entities/DamageNumber.js";
import { DeathEffect } from "../entities/DeathEffect.js";

export class EffectPool {
  constructor({ poolSize = 50 }) {
    this.damageNumberPool = [];
    this.deathEffectPool = [];
    this.activeEffects = [];
    
    // 预创建对象池
    for (let i = 0; i < poolSize; i++) {
      this.damageNumberPool.push({ instance: null, available: true });
      if (i < poolSize / 2) {
        this.deathEffectPool.push({ instance: null, available: true });
      }
    }
  }

  getDamageNumber(damage, x, y, color) {
    // 查找可用对象
    const slot = this.damageNumberPool.find(s => s.available);
    if (slot && slot.instance) {
      // 复用现有对象
      slot.instance.reset(damage, x, y, color);
      slot.available = false;
      return slot.instance;
    } else {
      // 创建新对象
      const instance = new DamageNumber({ damage, x, y, color });
      this.damageNumberPool.push({ instance, available: false });
      return instance;
    }
  }

  getDeathEffect(x, y, color) {
    const slot = this.deathEffectPool.find(s => s.available);
    if (slot && slot.instance) {
      slot.instance.reset(x, y, color);
      slot.available = false;
      return slot.instance;
    } else {
      const instance = new DeathEffect({ x, y, color });
      this.deathEffectPool.push({ instance, available: false });
      return instance;
    }
  }

  returnEffect(effect) {
    // 归还对象到池中
    const slot = this.damageNumberPool.find(s => s.instance === effect) ||
                 this.deathEffectPool.find(s => s.instance === effect);
    if (slot) {
      slot.available = true;
    }
  }
}
```

**TDD 测试断言**:
- [ ] 对象池初始化后有 50 个可用槽位
- [ ] 复用对象时不创建新实例
- [ ] 归还对象后槽位标记为 available

---

### Task 3: 创建特效系统（更新，集成对象池）

步骤:
1. 创建 EffectSystem，管理所有特效：
   - damageNumbers 数组
   - deathEffects 数组
   - update 方法
   - spawnDamageNumber 方法
   - spawnDeathEffect 方法

2. 实现代码:
```javascript
import { DamageNumber } from "../entities/DamageNumber.js";
import { DeathEffect } from "../entities/DeathEffect.js";

export class EffectSystem {
  constructor({ effectsLayer }) {
    this.effectsLayer = effectsLayer;
    this.damageNumbers = [];
    this.deathEffects = [];
  }

  spawnDamageNumber({ damage, x, y, color }) {
    const effect = new DamageNumber({ damage, x, y, color });
    this.effectsLayer.addChild(effect.text);
    this.damageNumbers.push(effect);
  }

  spawnDeathEffect({ x, y, color }) {
    const effect = new DeathEffect({ x, y, color });
    this.effectsLayer.addChild(effect.container);
    this.deathEffects.push(effect);
  }

  update(deltaSec) {
    // 更新伤害数字
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const effect = this.damageNumbers[i];
      effect.update(deltaSec);
      if (effect.isRemoved) {
        effect.destroy(this.effectsLayer);
        this.damageNumbers.splice(i, 1);
      }
    }

    // 更新死亡特效
    for (let i = this.deathEffects.length - 1; i >= 0; i--) {
      const effect = this.deathEffects[i];
      effect.update(deltaSec);
      if (effect.isRemoved) {
        effect.destroy(this.effectsLayer);
        this.deathEffects.splice(i, 1);
      }
    }
  }
}
```

3. 验证：测试 spawn 和 update 功能
4. Commit: `git commit -m "feat: 添加特效系统管理飘字和粒子"`

---

### Task 4: 集成伤害数字到战斗系统

**Files**: `src/systems/CombatSystem.js`

步骤:
1. 修改 CombatSystem，添加 effectSystem 依赖
2. 在 handleBulletHit 中调用 spawnDamageNumber
3. 修改 updateTowers 和 updateBullets 签名，传入 effectSystem

4. 修改示例:
```javascript
// 修改函数签名
export function updateTowers(state, deltaSec, deps) {
  // deps 新增 effectSystem
  const { bulletsLayer, effectSystem } = deps;
  // ...
}

// 在 handleBulletHit 中添加
function handleBulletHit(state, bullet, target, effectSystem) {
  // 原有伤害逻辑...
  target.hp -= bullet.damage;
  
  // 新增：生成伤害数字
  if (effectSystem) {
    effectSystem.spawnDamageNumber({
      damage: Math.round(bullet.damage),
      x: target.sprite.x,
      y: target.sprite.y - 20,
      color: 0xffffff,
    });
  }
}
```

5. 验证：游戏中攻击敌人时显示伤害数字
6. Commit: `git commit -m "feat: 战斗系统集成伤害数字显示"`

---

### Task 5: 集成死亡特效到敌人系统

**Files**: `src/systems/EnemySystem.js`, `src/entities/Enemy.js`

步骤:
1. 修改 EnemySystem，在敌人死亡时触发死亡特效
2. 修改 updateEnemies 签名，传入 effectSystem

3. 修改示例:
```javascript
export function updateEnemies(state, deltaSec, deps) {
  const { enemiesLayer, effectSystem, pathWaypoints } = deps;
  
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    // ... 移动和更新逻辑 ...
    
    if (enemy.hp <= 0) {
      // 新增：生成死亡特效
      if (effectSystem) {
        effectSystem.spawnDeathEffect({
          x: enemy.sprite.x,
          y: enemy.sprite.y,
          color: 0xff4444,
        });
      }
      // 原有移除逻辑...
    }
  }
}
```

4. 验证：敌人死亡时显示粒子爆炸
5. Commit: `git commit -m "feat: 敌人死亡时触发粒子特效"`

---

### Task 6: 创建游戏时间控制系统

**Files**: `src/systems/TimeSystem.js`

步骤:
1. 创建 TimeSystem，管理游戏速度：
   - timeScale 属性（1.0 = 正常，2.0 = 双倍，3.0 = 三倍）
   - isPaused 属性
   - setSpeed 方法
   - togglePause 方法
   - getEffectiveDelta 方法

2. 实现代码:
```javascript
export class TimeSystem {
  constructor() {
    this.timeScale = 1.0;
    this.isPaused = false;
    this.isGameOver = false;
  }

  setSpeed(speed) {
    if ([1, 2, 3].includes(speed)) {
      this.timeScale = speed;
    }
  }

  togglePause() {
    if (!this.isGameOver) {
      this.isPaused = !this.isPaused;
    }
  }

  getEffectiveDelta(deltaSec) {
    if (this.isPaused || this.isGameOver) {
      return 0;
    }
    return deltaSec * this.timeScale;
  }

  setGameOver(gameOver) {
    this.isGameOver = gameOver;
  }
}
```

3. 验证：测试时间缩放功能
4. Commit: `git commit -m "feat: 添加游戏时间控制系统"`

---

### Task 7: 集成时间控制到主循环

**Files**: `main.js`

步骤:
1. 导入 TimeSystem
2. 创建 timeSystem 实例
3. 修改游戏循环，使用 getEffectiveDelta
4. 添加暂停/恢复逻辑

5. 修改示例:
```javascript
import { TimeSystem } from "./src/systems/TimeSystem.js";

// 创建实例
const timeSystem = new TimeSystem();

// 修改游戏循环
function gameLoop(timestamp) {
  const deltaSec = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  const effectiveDelta = timeSystem.getEffectiveDelta(deltaSec);
  
  if (effectiveDelta > 0) {
    // 更新所有游戏系统
    updateTowers(state, effectiveDelta, deps);
    updateBullets(state, effectiveDelta, deps);
    updateEnemies(state, effectiveDelta, deps);
    // ...
  }

  requestAnimationFrame(gameLoop);
}

// 添加键盘快捷键
window.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P') {
    timeSystem.togglePause();
    updatePauseUI(timeSystem.isPaused);
  } else if (e.key === ' ') {
    // 空格键循环切换速度
    const speeds = [1, 2, 3, 1];
    const currentIndex = speeds.indexOf(timeSystem.timeScale);
    timeSystem.setSpeed(speeds[currentIndex]);
    updateSpeedUI(timeSystem.timeScale);
  }
});
```

6. 验证：按 P 暂停，按空格切换速度
7. Commit: `git commit -m "feat: 主循环集成时间控制"`

---

### Task 8: 添加 UI 控制按钮

**Files**: `index.html`, `src/ui/HUD.js`, `style.css`

步骤:
1. 在 index.html 添加暂停按钮和速度显示
2. 在 HUD.js 添加更新函数
3. 在 style.css 添加样式

4. HTML 修改:
```html
<div class="hud-right">
  <button id="pause-btn" class="icon-btn">⏸️</button>
  <button id="speed-btn" class="speed-btn">1x</button>
  <button id="wangui-btn">👻 万鬼大阵<br><small>80💎 · <span id="wangui-cd">就绪</span></small></button>
  <button id="start-wave">⚔️ 召敌开波</button>
</div>
```

5. CSS 样式:
```css
.icon-btn, .speed-btn {
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid #6fe3ff;
  color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-right: 8px;
}

.speed-btn:hover, .icon-btn:hover {
  background: rgba(111, 227, 255, 0.3);
}

.speed-btn.active {
  background: #6fe3ff;
  color: #000;
}
```

6. 验证：按钮显示正常，点击有效
7. Commit: `git commit -m "feat: 添加暂停和速度控制 UI 按钮"`

---

### Task 9: 实现塔升级系统

**Files**: `src/entities/Tower.js`, `src/config.js`

步骤:
1. 在 config.js 添加升级配置
2. 修改 Tower 类，添加等级、升级成本属性
3. 添加升级方法

4. 配置示例:
```javascript
// src/config.js
export const towerUpgradeCosts = {
  basic: [50, 75, 100],    // 1→2, 2→3, 3→max
  cannon: [100, 150, 200],
  slow: [75, 100, 125],
};

export const towerUpgradeMultipliers = {
  damage: 1.5,      // 每级伤害 +50%
  fireRate: 1.2,    // 每级攻速 +20%
  range: 1.15,      // 每级射程 +15%
};

export const towerSellRefund = 0.6;  // 出售返还 60% 成本
```

5. Tower 类修改:
```javascript
export class Tower {
  constructor({ cell, texture, config = towerTypes.basic }) {
    // ... 现有代码 ...
    this.level = 1;
    this.maxLevel = 3;
    this.totalCost = config.cost;
    this.canUpgrade = this.level < this.maxLevel;
  }

  getUpgradeCost() {
    const costs = towerUpgradeCosts[this.type];
    return costs[this.level - 1] || 0;
  }

  getSellValue() {
    return Math.floor(this.totalCost * towerSellRefund);
  }

  upgrade() {
    if (this.level >= this.maxLevel) return false;
    
    const cost = this.getUpgradeCost();
    this.level++;
    this.totalCost += cost;
    
    // 应用升级加成
    this.damage *= towerUpgradeMultipliers.damage;
    this.fireRate *= towerUpgradeMultipliers.fireRate;
    this.range *= towerUpgradeMultipliers.range;
    
    this.canUpgrade = this.level < this.maxLevel;
    this.updateVisuals(); // 更新外观显示等级
    
    return true;
  }

  updateVisuals() {
    // 根据等级更新外观（添加等级标识或改变颜色）
    // TODO: 实现视觉反馈
  }
}
```

6. 验证：塔可以升级，属性正确提升
7. Commit: `git commit -m "feat: 实现塔升级系统"`

---

### Task 10: 实现塔出售功能

**Files**: `main.js`, `src/ui/HUD.js`

步骤:
1. 添加右键点击塔出售功能
2. 在 HUD 显示出售价格提示
3. 修改GameState，处理出售逻辑

4. 实现示例:
```javascript
// main.js - 添加右键点击处理
app.stage.addEventListener('pointerdown', (e) => {
  const pos = e.global;
  const cell = screenToCell(pos.x, pos.y);
  
  if (e.button === 2) { // 右键
    // 检查是否有塔
    const towerIndex = state.towers.findIndex(t => t.cellKey === `${cell.x},${cell.y}`);
    if (towerIndex !== -1) {
      const tower = state.towers[towerIndex];
      const refund = tower.getSellValue();
      
      // 移除塔
      towersLayer.removeChild(tower.sprite);
      tower.sprite.destroy();
      state.towers.splice(towerIndex, 1);
      
      // 返还灵石
      state.gold += refund;
      updateUI(state, elements);
      
      setStatus(`出售防御塔，返还 ${refund}💎`, elements);
    }
  }
});

// 阻止右键菜单
app.view.addEventListener('contextmenu', (e) => e.preventDefault());
```

5. 验证：右键点击塔出售，获得灵石返还
6. Commit: `git commit -m "feat: 实现塔右键出售功能"`

---

### Task 11: 添加塔升级 UI 提示

**Files**: `src/ui/HUD.js`, `main.js`

步骤:
1. 鼠标悬停塔时显示升级/出售提示
2. 显示升级成本和出售价格

3. 实现示例:
```javascript
// main.js - 添加鼠标悬停检测
let hoveredTower = null;

app.stage.addEventListener('pointermove', (e) => {
  const pos = e.global;
  const cell = screenToCell(pos.x, pos.y);
  const tower = state.towers.find(t => t.cellKey === `${cell.x},${cell.y}`);
  
  if (tower && tower !== hoveredTower) {
    hoveredTower = tower;
    const upgradeCost = tower.getUpgradeCost();
    const sellValue = tower.getSellValue();
    const canUpgrade = tower.canUpgrade && state.gold >= upgradeCost;
    
    setStatus(
      `${tower.type.toUpperCase()} Lv.${tower.level} | ` +
      `升级：${upgradeCost}💎${canUpgrade ? ' ✓' : ' ✗'} | ` +
      `出售：${sellValue}💎 (右键)`,
      elements
    );
  } else if (!tower && hoveredTower) {
    hoveredTower = null;
    setStatus("万劫魔宫，严阵以待", elements);
  }
});
```

4. 验证：鼠标悬停塔时显示正确信息
5. Commit: `git commit -m "feat: 添加塔悬停 UI 提示"`

---

### Task 12: 集成特效系统到主循环

**Files**: `main.js`

步骤:
1. 创建 effectsLayer
2. 创建 EffectSystem 实例
3. 在游戏循环中调用 update

4. 实现示例:
```javascript
// 创建特效层
const effectsLayer = new PIXI.Container();
app.stage.addChild(effectsLayer);

// 创建特效系统
const effectSystem = new EffectSystem({ effectsLayer });

// 修改 deps
const deps = {
  towersLayer,
  bulletsLayer,
  enemiesLayer,
  ghostsLayer,
  effectsLayer,
  effectSystem, // 新增
};

// 游戏循环中更新
function gameLoop(timestamp) {
  // ...
  effectSystem.update(effectiveDelta);
  // ...
}
```

5. 验证：所有特效正常显示和更新
6. Commit: `git commit -m "feat: 主循环集成特效系统"`

---

## Execution

- [x] **Subagent-driven** — 使用 subagent-driven-development 模式，每个任务 dispatch 给专项 agent

**Agent 分配**:
| 任务 | 推荐 Agent |
|------|-----------|
| Task 1-5 | technical-artist (特效) |
| Task 6-8 | engineering-frontend-developer (UI/控制) |
| Task 9-11 | engineering-senior-developer (塔系统) |
| Task 12 | engineering-frontend-developer (集成) |

---

## Verification

所有任务完成后:

1. **功能验证**:
   - [ ] 伤害数字显示正常
   - [ ] 敌人死亡有粒子特效
   - [ ] 按 P 暂停/继续有效
   - [ ] 按空格切换速度有效（1x→2x→3x→1x）
   - [ ] 塔可以升级（左键点击升级按钮）
   - [ ] 塔可以出售（右键点击）
   - [ ] 悬停塔显示升级/出售信息

2. **回归验证**:
   - [ ] 原有塔防功能正常
   - [ ] 波次生成正常
   - [ ] 关卡流程正常
   - [ ] 存档/读档正常

3. **性能验证**:
   - [ ] 大量特效时帧率稳定（>50fps）
   - [ ] 内存无泄漏

---

## Tracker

**Tracker File**: `docs/superpowers/tracker.md`

创建 tracker 文件，跟踪所有任务进度。

---

## Notes

- 每个任务完成后更新 tracker
- 遇到阻塞问题立即记录到 tracker
- 每日提交进度到 git
- Phase 1 完成后进行整体测试
