// minesweeper.ts

// 类型定义
type Difficulty = 'easy' | 'medium' | 'hard'
type GameStatus = 'ready' | 'playing' | 'gameover' | 'win'
type CellState = 'hidden' | 'revealed' | 'flagged' | 'question'

interface Cell {
  isMine: boolean
  adjacentMines: number
  state: CellState
  row: number
  col: number
}

// 难度配置
const DIFFICULTY_CONFIG = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 }
}

Page({
  data: {
    grid: [] as Cell[][],
    difficulty: 'medium' as Difficulty,
    gameStatus: 'ready' as GameStatus,
    time: 0,
    timeDisplay: '00:00',
    minesRemaining: 0,
    timer: null as ReturnType<typeof setInterval> | null,
    firstClick: true
  },

  // 初始化游戏
  initGame() {
    this.stopTimer()
    const config = DIFFICULTY_CONFIG[this.data.difficulty]
    
    // 创建空网格
    const grid: Cell[][] = []
    for (let i = 0; i < config.rows; i++) {
      grid[i] = []
      for (let j = 0; j < config.cols; j++) {
        grid[i][j] = {
          isMine: false,
          adjacentMines: 0,
          state: 'hidden',
          row: i,
          col: j
        }
      }
    }

    // 扁平化网格用于渲染
    const flatGrid: Cell[] = []
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        flatGrid.push(grid[i][j])
      }
    }

    this.setData({
      grid: grid,
      flatGrid: flatGrid,
      gridCols: config.cols,
      gameStatus: 'ready',
      time: 0,
      timeDisplay: '00:00',
      minesRemaining: config.mines,
      firstClick: true
    })
  },

  // 生成地雷（在第一次点击后）
  generateMines(firstClickRow: number, firstClickCol: number) {
    const config = DIFFICULTY_CONFIG[this.data.difficulty]
    const grid = this.data.grid.map(row => row.map(cell => ({ ...cell })))
    
    // 生成所有可能的位置
    const positions: Array<{row: number, col: number}> = []
    for (let i = 0; i < config.rows; i++) {
      for (let j = 0; j < config.cols; j++) {
        // 排除第一次点击的位置及其周围8个格子
        if (Math.abs(i - firstClickRow) > 1 || Math.abs(j - firstClickCol) > 1) {
          positions.push({ row: i, col: j })
        }
      }
    }
    
    // 随机打乱
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]]
    }
    
    // 放置地雷
    for (let i = 0; i < config.mines; i++) {
      const pos = positions[i]
      grid[pos.row][pos.col].isMine = true
    }
    
    // 计算每个格子周围的地雷数量
    for (let i = 0; i < config.rows; i++) {
      for (let j = 0; j < config.cols; j++) {
        if (!grid[i][j].isMine) {
          grid[i][j].adjacentMines = this.countAdjacentMines(grid, i, j)
        }
      }
    }
    
    // 更新扁平化数组
    const flatGrid: Cell[] = []
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        flatGrid.push(grid[i][j])
      }
    }

    this.setData({
      grid: grid,
      flatGrid: flatGrid
    })
  },

  // 计算周围地雷数量
  countAdjacentMines(grid: Cell[][], row: number, col: number): number {
    let count = 0
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ]
    
    for (const [dx, dy] of directions) {
      const newRow = row + dx
      const newCol = col + dy
      if (this.isValidPosition(grid, newRow, newCol) && grid[newRow][newCol].isMine) {
        count++
      }
    }
    
    return count
  },

  // 检查位置是否有效
  isValidPosition(grid: Cell[][], row: number, col: number): boolean {
    return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length
  },

  // 开始游戏
  startGame() {
    if (this.data.gameStatus === 'playing') return
    
    this.setData({
      gameStatus: 'playing'
    })
    
    this.data.timer = setInterval(() => {
      if (this.data.gameStatus === 'playing') {
        const newTime = this.data.time + 1
        this.setData({
          time: newTime,
          timeDisplay: this.formatTime(newTime)
        })
      }
    }, 1000)
  },

  // 停止计时器
  stopTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
      this.data.timer = null
    }
  },

  // 格式化时间
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  },

  // 点击单元格
  onCellTap(e: WechatMiniprogram.TouchEvent) {
    if (this.data.gameStatus === 'gameover' || this.data.gameStatus === 'win') return
    
    const row = parseInt(e.currentTarget.dataset.row as string)
    const col = parseInt(e.currentTarget.dataset.col as string)
    
    if (isNaN(row) || isNaN(col)) return
    
    const cell = this.data.grid[row][col]
    
    // 如果已标记或已展开，不处理
    if (cell.state === 'flagged' || cell.state === 'question' || cell.state === 'revealed') {
      return
    }
    
    // 第一次点击时生成地雷
    if (this.data.firstClick) {
      this.generateMines(row, col)
      this.setData({
        firstClick: false
      })
      this.startGame()
    } else if (this.data.gameStatus === 'ready') {
      this.startGame()
    }
    
    // 展开单元格
    this.revealCell(row, col)
  },

  // 展开单元格
  revealCell(row: number, col: number) {
    const grid = this.data.grid.map(r => r.map(c => ({ ...c })))
    const cell = grid[row][col]
    
    // 如果是地雷，游戏结束
    if (cell.isMine) {
      this.gameOver(grid)
      return
    }
    
    // 展开当前单元格
    cell.state = 'revealed'
    
    // 如果周围没有地雷，自动展开周围单元格
    if (cell.adjacentMines === 0) {
      this.revealAdjacentCells(grid, row, col)
    }
    
    // 更新扁平化数组
    const flatGrid: Cell[] = []
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        flatGrid.push(grid[i][j])
      }
    }

    this.setData({
      grid: grid,
      flatGrid: flatGrid
    })
    
    // 检查是否胜利
    if (this.checkWin()) {
      this.win()
    }
  },

  // 展开周围单元格（递归）
  revealAdjacentCells(grid: Cell[][], row: number, col: number) {
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ]
    
    for (const [dx, dy] of directions) {
      const newRow = row + dx
      const newCol = col + dy
      
      if (this.isValidPosition(grid, newRow, newCol)) {
        const cell = grid[newRow][newCol]
        
        // 只展开隐藏的、非地雷的单元格
        if (cell.state === 'hidden' && !cell.isMine) {
          cell.state = 'revealed'
          
          // 如果周围没有地雷，继续递归展开
          if (cell.adjacentMines === 0) {
            this.revealAdjacentCells(grid, newRow, newCol)
          }
        }
      }
    }
  },

  // 长按标记/取消标记
  onCellLongPress(e: WechatMiniprogram.TouchEvent) {
    if (this.data.gameStatus === 'gameover' || this.data.gameStatus === 'win') return
    
    const row = parseInt(e.currentTarget.dataset.row as string)
    const col = parseInt(e.currentTarget.dataset.col as string)
    
    if (isNaN(row) || isNaN(col)) return
    
    const cell = this.data.grid[row][col]
    
    // 已展开的单元格不能标记
    if (cell.state === 'revealed') return
    
    const grid = this.data.grid.map(r => r.map(c => ({ ...c })))
    let minesRemaining = this.data.minesRemaining
    
    // 切换标记状态：hidden -> flagged -> question -> hidden
    if (cell.state === 'hidden') {
      grid[row][col].state = 'flagged'
      minesRemaining--
    } else if (cell.state === 'flagged') {
      grid[row][col].state = 'question'
      minesRemaining++
    } else if (cell.state === 'question') {
      grid[row][col].state = 'hidden'
    }
    
    // 更新扁平化数组
    const flatGrid: Cell[] = []
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        flatGrid.push(grid[i][j])
      }
    }

    this.setData({
      grid: grid,
      flatGrid: flatGrid,
      minesRemaining: minesRemaining
    })
    
    // 检查是否胜利
    if (this.checkWin()) {
      this.win()
    }
  },

  // 检查是否胜利
  checkWin(): boolean {
    const grid = this.data.grid
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        const cell = grid[i][j]
        // 所有非地雷单元格都已展开
        if (!cell.isMine && cell.state !== 'revealed') {
          return false
        }
      }
    }
    return true
  },

  // 游戏胜利
  win() {
    this.stopTimer()
    this.setData({
      gameStatus: 'win'
    })
    
    // 标记所有地雷
    const grid = this.data.grid.map(r => r.map(c => {
      if (c.isMine && c.state !== 'flagged') {
        return { ...c, state: 'flagged' as CellState }
      }
      return { ...c }
    }))
    
    // 更新扁平化数组
    const flatGrid: Cell[] = []
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        flatGrid.push(grid[i][j])
      }
    }

    this.setData({
      grid: grid,
      flatGrid: flatGrid,
      minesRemaining: 0
    })
    
    wx.showModal({
      title: '恭喜通关！',
      content: `用时: ${this.data.timeDisplay}\n难度: ${this.getDifficultyName()}`,
      showCancel: true,
      cancelText: '返回',
      confirmText: '再来一局',
      success: (res) => {
        if (res.confirm) {
          this.initGame()
        } else {
          wx.navigateBack()
        }
      }
    })
  },

  // 游戏结束
  gameOver(grid?: Cell[][]) {
    this.stopTimer()
    this.setData({
      gameStatus: 'gameover'
    })
    
    // 显示所有地雷
    const finalGrid = (grid || this.data.grid).map(r => r.map(c => {
      if (c.isMine) {
        return { ...c, state: 'revealed' as CellState }
      }
      return { ...c }
    }))
    
    // 更新扁平化数组
    const flatGrid: Cell[] = []
    for (let i = 0; i < finalGrid.length; i++) {
      for (let j = 0; j < finalGrid[i].length; j++) {
        flatGrid.push(finalGrid[i][j])
      }
    }

    this.setData({
      grid: finalGrid,
      flatGrid: flatGrid
    })
    
    wx.showModal({
      title: '游戏结束',
      content: '踩到地雷了！',
      showCancel: true,
      cancelText: '返回',
      confirmText: '重试',
      success: (res) => {
        if (res.confirm) {
          this.initGame()
        } else {
          wx.navigateBack()
        }
      }
    })
  },

  // 获取难度名称
  getDifficultyName(): string {
    const names = {
      easy: '简单',
      medium: '中等',
      hard: '困难'
    }
    return names[this.data.difficulty] || '中等'
  },

  // 选择难度
  onDifficultyChange(e: WechatMiniprogram.TouchEvent) {
    const difficulty = e.currentTarget.dataset.difficulty as Difficulty
    if (!difficulty) return
    
    this.setData({
      difficulty: difficulty
    })
    this.initGame()
  },

  // 重新开始
  restart() {
    this.initGame()
  },

  onLoad() {
    this.initGame()
  },

  onUnload() {
    this.stopTimer()
  }
})
