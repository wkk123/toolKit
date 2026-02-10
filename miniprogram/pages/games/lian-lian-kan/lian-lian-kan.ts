// 简易连连看游戏：点击两张相同图案的牌即可消除

type TileStatus = 'normal' | 'removed' | 'selected'

interface Tile {
  id: number
  icon: string
  status: TileStatus
}

Page({
  data: {
    // 棋盘行列数，会根据关卡动态调整
    rows: 4,
    cols: 6,
    tiles: [] as Tile[],
    firstSelectedIndex: -1,
    moves: 0,
    removedCount: 0,
    gameStatus: 'playing' as 'playing' | 'completed' | 'failed',
    // 关卡与难度
    level: 1,
    difficulty: '简单' as '简单' | '中等' | '困难',
    // 时间限制（秒）
    totalTime: 0,
    timeLeft: 0,
    // 当前连线路径涉及的格子索引（用于高亮路径）
    pathIndices: [] as number[]
  },

  // 计时器句柄（不放在 data 里）
  timer: null as any,

  onLoad() {
    // 从本地读取已解锁的最高关卡，默认第 1 关
    const savedLevel = wx.getStorageSync('llkLevel')
    const level = typeof savedLevel === 'number' && savedLevel > 0 ? savedLevel : 1
    this.setData({ level })
    this.initGame()
  },

  onShow() {
    // 页面重新可见时，如果处于进行中但没有计时器，则从剩余时间重新启动倒计时
    const timer = (this as any).timer
    if (!timer && this.data.gameStatus === 'playing' && this.data.timeLeft > 0) {
      this.startTimer(this.data.timeLeft)
    }
  },

  onHide() {
    // 离开页面时停止计时器
    this.clearTimer()
  },

  // 初始化游戏
  initGame() {
    const { rows, cols, difficulty, timeLimit, iconPoolSize } = this.getConfigForLevel(this.data.level)
    const total = rows * cols

    // 需要偶数个格子
    if (total % 2 !== 0) {
      wx.showToast({
        title: '行列数需为偶数',
        icon: 'none'
      })
      return
    }

    const allIcons = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍊', '🍍', '🥝', '🥕', '🍒', '🌽', '🥦', '🍄', '🥨', '🍪', '🍰', '🍩', '🍹', '🍧']
    const effectivePoolSize = Math.min(iconPoolSize, allIcons.length)
    const iconPool = allIcons.slice(0, effectivePoolSize)
    const pairCount = total / 2
    const tiles: Tile[] = []

    for (let i = 0; i < pairCount; i++) {
      const icon = iconPool[i % iconPool.length]
      tiles.push({
        id: i,
        icon,
        status: 'normal'
      })
      tiles.push({
        id: i,
        icon,
        status: 'normal'
      })
    }

    const shuffled = this.shuffleArray(tiles)
    
    // 重置计时器并启动
    this.clearTimer()
    this.startTimer(timeLimit)

    this.setData({
      rows,
      cols,
      tiles: shuffled,
      firstSelectedIndex: -1,
      moves: 0,
      removedCount: 0,
      gameStatus: 'playing',
      difficulty
    })

    // 持久化当前关卡
    wx.setStorageSync('llkLevel', this.data.level)
  },

  // 洗牌
  shuffleArray<T>(array: T[]): T[] {
    const res = [...array]
    for (let i = res.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[res[i], res[j]] = [res[j], res[i]]
    }
    return res
  },

  // 点击方块
  onTileTap(e: WechatMiniprogram.TouchEvent) {
    if (this.data.gameStatus !== 'playing') return

    const index = Number(e.currentTarget.dataset.index)
    if (isNaN(index)) return

    const tiles = [...this.data.tiles]
    const tile = tiles[index]
    if (!tile || tile.status === 'removed') return

    // 再次点击同一个已选中方块，取消选择
    if (tile.status === 'selected') {
      tile.status = 'normal'
      this.setData({
        tiles,
        firstSelectedIndex: -1
      })
      return
    }

    // 如果当前没有选中的方块
    if (this.data.firstSelectedIndex === -1) {
      tile.status = 'selected'
      this.setData({
        tiles,
        firstSelectedIndex: index
      })
      return
    }

    // 已有一个选中方块
    const firstIndex = this.data.firstSelectedIndex
    if (firstIndex === index) return

    const firstTile = tiles[firstIndex]
    tile.status = 'selected'

    this.setData({
      tiles,
      moves: this.data.moves + 1
    })

    const sameIcon = firstTile && firstTile.id === tile.id

    if (sameIcon) {
      // 根据连连看规则（0/1/2 折线）判断是否可连通
      const rows = this.data.rows
      const cols = this.data.cols
      const pos1 = this.indexToCoord(firstIndex, cols)
      const pos2 = this.indexToCoord(index, cols)
      const grid = this.buildGrid(rows, cols)

      const canLink = this.canConnect(grid, pos1.row + 1, pos1.col + 1, pos2.row + 1, pos2.col + 1)

      if (canLink) {
        // 将最近一次找到的路径转换成需要高亮的格子索引
        const rawPath = (this as any).lastPath as Array<{ r: number; c: number }> | undefined
        const pathIndices = this.buildPathIndices(rawPath || [], rows, cols)

        // 先高亮路径，再给一个漂亮的成功提示
        this.setData({
          pathIndices
        })

        // 可以消除：先给一个漂亮的成功提示
        wx.showToast({
          title: '✨ 配对成功！',
          icon: 'success',
          duration: 600
        })

        // 再稍微延迟一点做消除动画
        setTimeout(() => {
          const updatedTiles = [...this.data.tiles]
          updatedTiles[firstIndex].status = 'removed'
          updatedTiles[index].status = 'removed'

          const newRemovedCount = this.data.removedCount + 2

          this.setData({
            tiles: updatedTiles,
            firstSelectedIndex: -1,
            removedCount: newRemovedCount,
            pathIndices: []
          })

          // 检查是否全部消除
          if (newRemovedCount >= this.data.rows * this.data.cols) {
            this.onGameCompleted()
          }
        }, 200)
        return
      } else {
        // 图案相同但路径不通
        wx.showToast({
          title: '⚠️ 路径不通，换个搭档试试',
          icon: 'none',
          duration: 1000
        })
      }
    }

    // 未匹配或路径不通，短暂展示后恢复
    setTimeout(() => {
      const updatedTiles = [...this.data.tiles]
      if (updatedTiles[firstIndex]) {
        updatedTiles[firstIndex].status = 'normal'
      }
      if (updatedTiles[index]) {
        updatedTiles[index].status = 'normal'
      }
      this.setData({
        tiles: updatedTiles,
        firstSelectedIndex: -1,
        pathIndices: []
      })
    }, 400)
  },

  // 将路径点（扩展网格坐标）转换为需要高亮的棋盘格索引
  buildPathIndices(rawPath: Array<{ r: number; c: number }>, rows: number, cols: number): number[] {
    const indices: number[] = []
    if (!rawPath || rawPath.length === 0) return indices

    const pushIndex = (er: number, ec: number) => {
      // 只高亮实际棋盘内部的格子（扩展网格 1..rows / 1..cols）
      if (er >= 1 && er <= rows && ec >= 1 && ec <= cols) {
        const r0 = er - 1
        const c0 = ec - 1
        const idx = r0 * cols + c0
        if (!indices.includes(idx)) {
          indices.push(idx)
        }
      }
    }

    for (let i = 0; i < rawPath.length - 1; i++) {
      const a = rawPath[i]
      const b = rawPath[i + 1]
      if (a.r === b.r) {
        // 同一行，遍历列
        const start = Math.min(a.c, b.c)
        const end = Math.max(a.c, b.c)
        for (let c = start; c <= end; c++) {
          pushIndex(a.r, c)
        }
      } else if (a.c === b.c) {
        // 同一列，遍历行
        const start = Math.min(a.r, b.r)
        const end = Math.max(a.r, b.r)
        for (let r = start; r <= end; r++) {
          pushIndex(r, a.c)
        }
      }
    }

    return indices
  },

  // 将一维索引转换为二维坐标（0-based）
  indexToCoord(index: number, cols: number): { row: number; col: number } {
    const row = Math.floor(index / cols)
    const col = index % cols
    return { row, col }
  },

  // 构建带边框的棋盘网格：0 表示空，>0 表示有牌
  buildGrid(rows: number, cols: number): number[][] {
    const grid: number[][] = []
    const totalRows = rows + 2
    const totalCols = cols + 2

    for (let r = 0; r < totalRows; r++) {
      const row: number[] = []
      for (let c = 0; c < totalCols; c++) {
        row.push(0)
      }
      grid.push(row)
    }

    // 把当前 tiles 映射到内部区域 [1..rows][1..cols]
    this.data.tiles.forEach((tile, index) => {
      const { row, col } = this.indexToCoord(index, cols)
      const gr = row + 1
      const gc = col + 1
      if (tile.status !== 'removed') {
        grid[gr][gc] = tile.id + 1 // 只要非 0 即表示有牌
      }
    })

    return grid
  },

  // 判断某个位置是否为空（没有牌）
  isEmpty(grid: number[][], r: number, c: number): boolean {
    return grid[r] && grid[r][c] === 0
  },

  // 检查同一行上两点之间是否畅通（不含端点）
  clearRow(grid: number[][], r: number, c1: number, c2: number): boolean {
    const start = Math.min(c1, c2) + 1
    const end = Math.max(c1, c2) - 1
    for (let c = start; c <= end; c++) {
      if (grid[r][c] !== 0) return false
    }
    return true
  },

  // 检查同一列上两点之间是否畅通（不含端点）
  clearCol(grid: number[][], c: number, r1: number, r2: number): boolean {
    const start = Math.min(r1, r2) + 1
    const end = Math.max(r1, r2) - 1
    for (let r = start; r <= end; r++) {
      if (grid[r][c] !== 0) return false
    }
    return true
  },

  // 判断两点是否在 0/1/2 折线规则内连通
  canConnect(grid: number[][], r1: number, c1: number, r2: number, c2: number): boolean {
    // 默认清空上一次路径
    ;(this as any).lastPath = []

    // 0 折：直连
    if (r1 === r2 && this.clearRow(grid, r1, c1, c2)) {
      ;(this as any).lastPath = [{ r: r1, c: c1 }, { r: r2, c: c2 }]
      return true
    }
    if (c1 === c2 && this.clearCol(grid, c1, r1, r2)) {
      ;(this as any).lastPath = [{ r: r1, c: c1 }, { r: r2, c: c2 }]
      return true
    }

    // 1 折：L 形连接，拐点为 (r1, c2) 或 (r2, c1)
    if (this.isEmpty(grid, r1, c2) &&
        this.clearRow(grid, r1, c1, c2) &&
        this.clearCol(grid, c2, r1, r2)) {
      ;(this as any).lastPath = [
        { r: r1, c: c1 },
        { r: r1, c: c2 },
        { r: r2, c: c2 }
      ]
      return true
    }

    if (this.isEmpty(grid, r2, c1) &&
        this.clearCol(grid, c1, r1, r2) &&
        this.clearRow(grid, r2, c1, c2)) {
      ;(this as any).lastPath = [
        { r: r1, c: c1 },
        { r: r2, c: c1 },
        { r: r2, c: c2 }
      ]
      return true
    }

    const totalRows = grid.length
    const totalCols = grid[0]?.length || 0

    // 2 折：通过一个中转行
    for (let r = 0; r < totalRows; r++) {
      if (this.isEmpty(grid, r, c1) &&
          this.isEmpty(grid, r, c2) &&
          this.clearCol(grid, c1, r1, r) &&
          this.clearRow(grid, r, c1, c2) &&
          this.clearCol(grid, c2, r2, r)) {
        ;(this as any).lastPath = [
          { r: r1, c: c1 },
          { r, c: c1 },
          { r, c: c2 },
          { r: r2, c: c2 }
        ]
        return true
      }
    }

    // 2 折：通过一个中转列
    for (let c = 0; c < totalCols; c++) {
      if (this.isEmpty(grid, r1, c) &&
          this.isEmpty(grid, r2, c) &&
          this.clearRow(grid, r1, c1, c) &&
          this.clearCol(grid, c, r1, r2) &&
          this.clearRow(grid, r2, c2, c)) {
        ;(this as any).lastPath = [
          { r: r1, c: c1 },
          { r: r1, c },
          { r: r2, c },
          { r: r2, c: c2 }
        ]
        return true
      }
    }

    return false
  },

  // 重新开始
  restart() {
    this.initGame()
  },

  // 根据关卡返回棋盘配置与难度（从易到难，关卡无限）
  getConfigForLevel(level: number): {
    rows: number;
    cols: number;
    difficulty: '简单' | '中等' | '困难';
    timeLimit: number;
    iconPoolSize: number;
  } {
    // 关卡 1-5：4x4 简单，图案种类少、时间宽松
    if (level <= 5) {
      return { rows: 4, cols: 4, difficulty: '简单', timeLimit: 120, iconPoolSize: 8 }
    }
    // 关卡 6-10：4x6 中等，图案增多、时间适中
    if (level <= 10) {
      return { rows: 4, cols: 6, difficulty: '中等', timeLimit: 90, iconPoolSize: 12 }
    }
    // 关卡 11 及以上：6x8 困难，图案更多、时间逐渐变紧
    const extra = level - 10
    const timeLimit = Math.max(40, 80 - extra * 4) // 随等级减少，下限 40 秒
    const iconPoolSize = Math.min(20, 12 + extra)  // 随等级增加，最多约 20 种图案
    return { rows: 6, cols: 8, difficulty: '困难', timeLimit, iconPoolSize }
  },

  // 启动倒计时
  startTimer(timeLimit: number) {
    this.clearTimer()
    this.setData({
      totalTime: timeLimit,
      timeLeft: timeLimit
    })

    const timer = setInterval(() => {
      if (this.data.gameStatus !== 'playing') {
        this.clearTimer()
        return
      }

      const next = this.data.timeLeft - 1
      if (next <= 0) {
        this.clearTimer()
        this.setData({ timeLeft: 0 })
        this.onTimeUp()
      } else {
        this.setData({ timeLeft: next })
      }
    }, 1000)

    ;(this as any).timer = timer
  },

  // 清除计时器
  clearTimer() {
    const timer = (this as any).timer
    if (timer) {
      clearInterval(timer)
      ;(this as any).timer = null
    }
  },

  // 通关后处理：提示是否进入下一关或返回首页
  onGameCompleted() {
    if (this.data.gameStatus === 'completed') return

    this.clearTimer()
    this.setData({
      gameStatus: 'completed'
    })

    const { level, moves, rows, cols, difficulty } = this.data

    wx.showModal({
      title: '🎉 通关成功！',
      content: `当前关卡：第 ${level} 关\n棋盘大小：${rows}×${cols}\n难度：${difficulty}\n步数：${moves}\n\n是否继续挑战下一关？`,
      confirmText: '下一关',
      cancelText: '返回首页',
      success: (res) => {
        if (res.confirm) {
          this.nextLevel()
        } else if (res.cancel) {
          wx.reLaunch({
            url: '/pages/index/index'
          })
        }
      }
    })
  },

  // 进入下一关：关卡无限累加
  nextLevel() {
    const nextLevel = this.data.level + 1
    this.setData({
      level: nextLevel
    })
    this.initGame()
  },

  // 时间耗尽处理
  onTimeUp() {
    if (this.data.gameStatus !== 'playing') return

    this.setData({
      gameStatus: 'failed'
    })

    const { level } = this.data

    wx.showModal({
      title: '时间到啦',
      content: `第 ${level} 关未在限定时间内完成。\n要再试一次吗？`,
      confirmText: '再试一次',
      cancelText: '返回首页',
      success: (res) => {
        if (res.confirm) {
          // 同一关卡重新开始
          this.setData({
            gameStatus: 'playing'
          })
          this.initGame()
        } else if (res.cancel) {
          wx.reLaunch({
            url: '/pages/index/index'
          })
        }
      }
    })
  },

  onUnload() {
    this.clearTimer()
  }
})

