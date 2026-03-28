/**
 * 游戏时间控制系统
 * 
 * 管理游戏速度（暂停、1x/2x/3x 加速）
 */

export class TimeSystem {
  constructor() {
    this.timeScale = 1.0;       // 时间缩放比例（1=正常，2=双倍，3=三倍）
    this.isPaused = false;      // 是否暂停
    this.isGameOver = false;    // 游戏是否结束
    this.speeds = [1, 2, 3];    // 支持的速度档位
    this.currentSpeedIndex = 0; // 当前速度索引
  }

  /**
   * 设置游戏速度
   * @param {number} speed - 速度档位（1/2/3）
   */
  setSpeed(speed) {
    const index = this.speeds.indexOf(speed);
    if (index !== -1) {
      this.currentSpeedIndex = index;
      this.timeScale = speed;
    } else {
      console.warn(`Invalid speed: ${speed}, must be one of ${this.speeds}`);
    }
  }

  /**
   * 循环切换速度（1x → 2x → 3x → 1x）
   * @returns {number} 新的速度值
   */
  cycleSpeed() {
    this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speeds.length;
    this.timeScale = this.speeds[this.currentSpeedIndex];
    return this.timeScale;
  }

  /**
   * 切换暂停状态
   * @returns {boolean} 新的暂停状态
   */
  togglePause() {
    if (!this.isGameOver) {
      this.isPaused = !this.isPaused;
    }
    return this.isPaused;
  }

  /**
   * 设置暂停状态
   * @param {boolean} paused - 是否暂停
   */
  setPaused(paused) {
    if (!this.isGameOver) {
      this.isPaused = paused;
    }
  }

  /**
   * 获取有效的帧时间（考虑暂停和速度）
   * @param {number} deltaSec - 原始帧时间（秒）
   * @returns {number} 有效帧时间
   */
  getEffectiveDelta(deltaSec) {
    if (this.isPaused || this.isGameOver) {
      return 0;
    }
    return deltaSec * this.timeScale;
  }

  /**
   * 设置游戏结束状态
   * @param {boolean} gameOver - 是否游戏结束
   */
  setGameOver(gameOver) {
    this.isGameOver = gameOver;
    if (gameOver) {
      this.isPaused = true;
    }
  }

  /**
   * 获取当前速度显示文本
   * @returns {string} 速度文本（如 "1x", "2x", "3x"）
   */
  getSpeedText() {
    return `${this.timeScale}x`;
  }

  /**
   * 获取当前状态描述
   * @returns {string} 状态描述
   */
  getStatusText() {
    if (this.isGameOver) {
      return '游戏结束';
    }
    if (this.isPaused) {
      return '已暂停';
    }
    return `${this.timeScale}x`;
  }

  /**
   * 重置时间系统
   */
  reset() {
    this.timeScale = 1.0;
    this.isPaused = false;
    this.isGameOver = false;
    this.currentSpeedIndex = 0;
  }
}
