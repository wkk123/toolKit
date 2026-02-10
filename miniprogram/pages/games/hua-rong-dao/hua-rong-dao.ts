// 数字华容道（滑块拼图）游戏：多关卡 + 难度 + 时间限制

type Tile = number | null

Page({
  data: {
    // 棋盘大小：初始为 3x3，后续关卡逐渐增加
    size: 3,
    tiles: [] as Tile[],
    moves: 0,
    isCompleted: false,
    // 关卡与难度（初级场 / 中级场 / 高级场）
    level: 1,
    difficulty: '初级场' as '初级场' | '中级场' | '高级场',
    // 时间相关
    totalTime: 0,       // 本关总时间（秒）
    timeLeft: 0         // 剩余时间（秒）
  },

  // 计时器句柄（不放在 data 里）
  timer: null as any,

  onLoad() {
    // 从本地读取已解锁的华容道关卡，默认第 1 关
    const savedLevel = wx.getStorageSync('huaRongDaoLevel')
    const level = typeof savedLevel === 'number' && savedLevel > 0 ? savedLevel : 1
    this.setData({ level })
    this.initGame()
  },

  onShow() {
    // 页面重新可见且处于进行中时，如果没有计时器，则从剩余时间恢复倒计时
    if (!this.timer && !this.data.isCompleted && this.data.timeLeft > 0) {
      this.startTimer(this.data.timeLeft)
    }
  },

  onHide() {
    // 离开页面时停止计时器
    this.clearTimer()
  },

  // 初始化棋盘（根据当前关卡设置棋盘与时间）
  initGame() {
    const size = this.getBoardSizeForLevel(this.data.level)
    const total = size * size
    const tiles: Tile[] = []

    // 生成 1 ~ total-1 的顺序数组，最后一格为空（null）
    for (let i = 1; i < total; i++) {
      tiles.push(i)
    }
    tiles.push(null)

    // 打乱到可解状态
    const shuffled = this.shuffleToSolvable(tiles, size)

    // 根据关卡设置难度与时间
    const { difficulty, timeLimit } = this.getConfigForLevel(this.data.level)

    // 重置计时器并启动
    this.clearTimer()
    this.startTimer(timeLimit)

    this.setData({
      size,
      tiles: shuffled,
      moves: 0,
      isCompleted: false,
      difficulty,
      totalTime: timeLimit,
      timeLeft: timeLimit
    })

    // 持久化当前关卡
    wx.setStorageSync('huaRongDaoLevel', this.data.level)
  },

  // 洗牌并保证可解
  shuffleToSolvable(tiles: Tile[], size: number): Tile[] {
    let shuffled = [...tiles]
    do {
      shuffled = this.shuffleArray(shuffled)
    } while (!this.isSolvable(shuffled, size))
    return shuffled
  },

  // 简易洗牌
  shuffleArray<T>(array: T[]): T[] {
    const res = [...array]
    for (let i = res.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[res[i], res[j]] = [res[j], res[i]]
    }
    return res
  },

  // 判断当前排列是否可解（标准 15-puzzle 规则）
  isSolvable(tiles: Tile[], size: number): boolean {
    const nums = tiles.filter(t => t !== null) as number[]
    let inversions = 0
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        if (nums[i] > nums[j]) inversions++
      }
    }

    // 空白格从底部数起的行数
    const blankIndex = tiles.indexOf(null)
    const blankRowFromBottom = size - Math.floor(blankIndex / size)

    if (size % 2 === 1) {
      // 宽度为奇数：逆序数为偶数即可
      return inversions % 2 === 0
    } else {
      // 宽度为偶数：逆序数奇偶性与空白行有关
      if (blankRowFromBottom % 2 === 0) {
        return inversions % 2 === 1
      } else {
        return inversions % 2 === 0
      }
    }
  },

  // 点击某个块
  onTileTap(e: WechatMiniprogram.TouchEvent) {
    // 只在游戏进行中允许操作
    if (this.data.isCompleted) return
    if (this.data.timeLeft <= 0) return

    const index = Number(e.currentTarget.dataset.index)
    if (isNaN(index) || index < 0) return

    const tiles = [...this.data.tiles]
    const size = this.data.size
    const blankIndex = tiles.indexOf(null)

    if (blankIndex < 0) return

    // 判断是否相邻（上下左右）
    if (!this.isAdjacent(index, blankIndex, size)) {
      // 点击的不是空白格相邻的方块，无法移动
      return
    }

    // 交换空白格和当前格
    this.swapTiles(index, blankIndex, tiles)
  },

  // 判断两个位置是否相邻
  isAdjacent(index1: number, index2: number, size: number): boolean {
    const row1 = Math.floor(index1 / size)
    const col1 = index1 % size
    const row2 = Math.floor(index2 / size)
    const col2 = index2 % size

    // 水平相邻：同一行，列差1
    const horizontalAdjacent = row1 === row2 && Math.abs(col1 - col2) === 1
    // 垂直相邻：同一列，行差1
    const verticalAdjacent = col1 === col2 && Math.abs(row1 - row2) === 1

    return horizontalAdjacent || verticalAdjacent
  },

  // 交换两个位置
  swapTiles(index1: number, index2: number, tiles: Tile[]) {
    ;[tiles[index1], tiles[index2]] = [tiles[index2], tiles[index1]]

    const moves = this.data.moves + 1
    const size = this.data.size

    this.setData({
      tiles,
      moves
    })

    // 检查是否完成
    if (this.checkCompleted(tiles, size)) {
      this.onGameCompleted()
    }
  },


  // 判断是否完成：1~15 顺序，最后一格为空
  checkCompleted(tiles: Tile[], size: number): boolean {
    const total = size * size
    for (let i = 0; i < total - 1; i++) {
      if (tiles[i] !== i + 1) return false
    }
    return tiles[total - 1] === null
  },

  // 重新开始
  restart() {
    // 保持当前关卡与棋盘大小，重新生成
    this.initGame()
  },

  // 根据关卡返回难度与时间（初级场 / 中级场 / 高级场）
  getConfigForLevel(level: number): {
    difficulty: '初级场' | '中级场' | '高级场'
    timeLimit: number
  } {
    // 初级场：1-10 级，时间宽松
    if (level <= 10) {
      return {
        difficulty: '初级场',
        timeLimit: 300 // 5 分钟
      }
    }
    // 中级场：11-30 级，时间适中
    if (level <= 30) {
      return {
        difficulty: '中级场',
        timeLimit: 210 // 3.5 分钟
      }
    }
    // 高级场：31 级及以上，时间紧张（随等级略减，但保留下限）
    const extra = level - 30
    const base = 180 // 起始 3 分钟
    const timeLimit = Math.max(90, base - extra * 5) // 每级减少 5 秒，下限 90 秒
    return {
      difficulty: '高级场',
      timeLimit
    }
  },

  // 根据关卡返回棋盘大小（保持原有从易到难的规则）
  getBoardSizeForLevel(level: number): number {
    if (level <= 1) return 3
    if (level === 2) return 4
    if (level === 3) return 5
    return 6 // 4 级及以上固定 6x6
  },

  // 启动倒计时
  startTimer(timeLimit: number) {
    this.clearTimer()
    this.setData({
      totalTime: timeLimit,
      timeLeft: timeLimit
    })

    const timer = setInterval(() => {
      const { isCompleted, timeLeft } = this.data
      if (isCompleted) {
        this.clearTimer()
        return
      }

      const next = timeLeft - 1
      if (next <= 0) {
        this.clearTimer()
        this.setData({ timeLeft: 0 })
        this.onTimeUp()
      } else {
        this.setData({ timeLeft: next })
      }
    }, 1000)

    this.timer = timer
  },

  // 清除计时器
  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  // 通关处理：提示是否进入下一关或返回首页
  onGameCompleted() {
    if (this.data.isCompleted) return

    this.clearTimer()
    this.setData({
      isCompleted: true
    })

    const { level, moves, size, difficulty } = this.data

    wx.showModal({
      title: '🎉 通关成功！',
      content: `当前关卡：第 ${level} 关\n棋盘大小：${size}×${size}\n难度：${difficulty}\n步数：${moves}\n\n是否继续挑战下一关？`,
      confirmText: '下一关',
      cancelText: '返回首页',
      success: (res) => {
        if (res.confirm) {
          this.nextLevel()
        } else {
          // 返回上一页
          wx.navigateBack()
        }
      }
    })
  },

  // 进入下一关：关卡无限累加，棋盘从易到难
  nextLevel() {
    const nextLevel = this.data.level + 1
    this.setData({
      level: nextLevel,
      isCompleted: false
    })

    this.initGame()
  },

  // 时间耗尽处理
  onTimeUp() {
    if (this.data.isCompleted) return

    const { level } = this.data

    wx.showModal({
      title: '时间到啦',
      content: `当前关卡：第 ${level} 关未在限定时间内完成。\n要再试一次吗？`,
      confirmText: '再试一次',
      cancelText: '返回首页',
      success: (res) => {
        if (res.confirm) {
          this.initGame()
        } else {
          // 返回上一页
          wx.navigateBack()
        }
      }
    })
  },

  onUnload() {
    this.clearTimer()
  }
})

