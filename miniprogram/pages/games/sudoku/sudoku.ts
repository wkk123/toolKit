// sudoku.ts

// 类型定义
type Difficulty = 'easy' | 'medium' | 'hard'
type GameStatus = 'ready' | 'playing' | 'paused' | 'completed'

interface Cell {
  value: number
  isFixed: boolean
  isError: boolean
  notes: number[]
}

// 常量配置
const CONFIG = {
  GRID_SIZE: 9,
  BOX_SIZE: 3,
  DIFFICULTY: {
    easy: 35,    // 简单：35个已知数字
    medium: 28,  // 中等：28个已知数字
    hard: 22     // 困难：22个已知数字
  }
}

Page({
  data: {
    grid: [] as Cell[][],
    selectedCell: null as {row: number, col: number} | null,
    difficulty: 'medium' as Difficulty,
    gameStatus: 'ready' as GameStatus,
    time: 0,
    timeDisplay: '00:00',
    errors: 0,
    timer: null as ReturnType<typeof setInterval> | null,
    showNotes: false,
    numberInput: 0
  },

  // 初始化游戏
  initGame() {
    this.stopTimer()
    const puzzle = this.generateSudoku(this.data.difficulty)
    const grid: Cell[][] = puzzle.map(row => 
      row.map(value => ({
        value: value,
        isFixed: value !== 0,
        isError: false,
        notes: []
      }))
    )

    this.setData({
      grid: grid,
      selectedCell: null,
      gameStatus: 'ready',
      time: 0,
      timeDisplay: '00:00',
      errors: 0,
      numberInput: 0
    })
  },

  // 生成数独谜题
  generateSudoku(difficulty: Difficulty): number[][] {
    // 先生成一个完整的数独解
    const solution = this.generateCompleteSudoku()
    
    // 根据难度移除数字
    const puzzle = solution.map(row => [...row])
    const cellsToRemove = CONFIG.GRID_SIZE * CONFIG.GRID_SIZE - CONFIG.DIFFICULTY[difficulty]
    
    const cells: Array<{row: number, col: number}> = []
    for (let i = 0; i < CONFIG.GRID_SIZE; i++) {
      for (let j = 0; j < CONFIG.GRID_SIZE; j++) {
        cells.push({ row: i, col: j })
      }
    }
    
    // 随机打乱
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]]
    }
    
    // 移除数字
    for (let i = 0; i < cellsToRemove; i++) {
      puzzle[cells[i].row][cells[i].col] = 0
    }
    
    return puzzle
  },

  // 生成完整的数独解
  generateCompleteSudoku(): number[][] {
    const grid: number[][] = Array(CONFIG.GRID_SIZE)
      .fill(0)
      .map(() => Array(CONFIG.GRID_SIZE).fill(0))
    
    // 填充对角线上的3x3盒子（它们互不干扰）
    for (let box = 0; box < CONFIG.GRID_SIZE; box += CONFIG.BOX_SIZE) {
      this.fillBox(grid, box, box)
    }
    
    // 使用回溯算法填充剩余部分
    this.solveSudoku(grid)
    
    return grid
  },

  // 填充3x3盒子
  fillBox(grid: number[][], row: number, col: number) {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    // 打乱数组
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]]
    }
    
    let index = 0
    for (let i = 0; i < CONFIG.BOX_SIZE; i++) {
      for (let j = 0; j < CONFIG.BOX_SIZE; j++) {
        grid[row + i][col + j] = numbers[index++]
      }
    }
  },

  // 解决数独（回溯算法）
  solveSudoku(grid: number[][]): boolean {
    for (let row = 0; row < CONFIG.GRID_SIZE; row++) {
      for (let col = 0; col < CONFIG.GRID_SIZE; col++) {
        if (grid[row][col] === 0) {
          const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]
          // 打乱数组以获得随机解
          for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]]
          }
          
          for (const num of numbers) {
            if (this.isValidMove(grid, row, col, num)) {
              grid[row][col] = num
              if (this.solveSudoku(grid)) {
                return true
              }
              grid[row][col] = 0
            }
          }
          return false
        }
      }
    }
    return true
  },

  // 检查移动是否有效
  isValidMove(grid: number[][], row: number, col: number, num: number): boolean {
    // 检查行
    for (let j = 0; j < CONFIG.GRID_SIZE; j++) {
      if (grid[row][j] === num) return false
    }
    
    // 检查列
    for (let i = 0; i < CONFIG.GRID_SIZE; i++) {
      if (grid[i][col] === num) return false
    }
    
    // 检查3x3盒子
    const boxRow = Math.floor(row / CONFIG.BOX_SIZE) * CONFIG.BOX_SIZE
    const boxCol = Math.floor(col / CONFIG.BOX_SIZE) * CONFIG.BOX_SIZE
    for (let i = 0; i < CONFIG.BOX_SIZE; i++) {
      for (let j = 0; j < CONFIG.BOX_SIZE; j++) {
        if (grid[boxRow + i][boxCol + j] === num) return false
      }
    }
    
    return true
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

  // 选择单元格
  onCellTap(e: WechatMiniprogram.TouchEvent) {
    if (this.data.gameStatus !== 'playing' && this.data.gameStatus !== 'ready') return
    
    if (this.data.gameStatus === 'ready') {
      this.startGame()
    }
    
    const row = parseInt(e.currentTarget.dataset.row as string)
    const col = parseInt(e.currentTarget.dataset.col as string)
    
    if (isNaN(row) || isNaN(col)) return
    
    const cell = this.data.grid[row][col]
    if (cell.isFixed) return // 不能选择固定单元格
    
    this.setData({
      selectedCell: { row, col }
    })
  },

  // 输入数字
  onNumberTap(e: WechatMiniprogram.TouchEvent) {
    if (!this.data.selectedCell) {
      wx.showToast({
        title: '请先选择单元格',
        icon: 'none'
      })
      return
    }
    
    if (this.data.gameStatus !== 'playing') {
      this.startGame()
    }
    
    const number = parseInt(e.currentTarget.dataset.number as string)
    if (isNaN(number) || number < 1 || number > 9) return
    
    const { row, col } = this.data.selectedCell
    const cell = this.data.grid[row][col]
    
    if (cell.isFixed) return
    
    const grid = this.data.grid.map(r => r.map(c => ({ ...c })))
    
    // 如果点击相同数字，则清除
    if (grid[row][col].value === number) {
      grid[row][col].value = 0
      grid[row][col].isError = false
    } else {
      grid[row][col].value = number
      grid[row][col].notes = []
      
      // 检查是否有错误
      if (!this.isValidMove(this.getGridValues(), row, col, number)) {
        grid[row][col].isError = true
        this.setData({
          errors: this.data.errors + 1
        })
      } else {
        grid[row][col].isError = false
      }
    }
    
    this.setData({
      grid: grid,
      numberInput: number
    })
    
    // 检查是否完成
    if (this.checkCompletion()) {
      this.completeGame()
    }
  },

  // 获取网格值（用于验证）
  getGridValues(): number[][] {
    return this.data.grid.map(row => row.map(cell => cell.value))
  },

  // 检查是否完成
  checkCompletion(): boolean {
    const grid = this.getGridValues()
    
    // 检查是否所有单元格都已填充
    for (let i = 0; i < CONFIG.GRID_SIZE; i++) {
      for (let j = 0; j < CONFIG.GRID_SIZE; j++) {
        if (grid[i][j] === 0) return false
      }
    }
    
    // 检查是否有错误
    for (let i = 0; i < CONFIG.GRID_SIZE; i++) {
      for (let j = 0; j < CONFIG.GRID_SIZE; j++) {
        if (this.data.grid[i][j].isError) return false
      }
    }
    
    // 验证整个数独是否有效
    for (let i = 0; i < CONFIG.GRID_SIZE; i++) {
      for (let j = 0; j < CONFIG.GRID_SIZE; j++) {
        const num = grid[i][j]
        grid[i][j] = 0 // 临时移除
        if (!this.isValidMove(grid, i, j, num)) {
          grid[i][j] = num // 恢复
          return false
        }
        grid[i][j] = num // 恢复
      }
    }
    
    return true
  },

  // 完成游戏
  completeGame() {
    this.stopTimer()
    this.setData({
      gameStatus: 'completed'
    })
    
    const minutes = Math.floor(this.data.time / 60)
    const seconds = this.data.time % 60
    const timeStr = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`
    
    wx.showModal({
      title: '恭喜完成！',
      content: `用时: ${timeStr}\n错误次数: ${this.data.errors}`,
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

  // 切换笔记模式
  toggleNotes() {
    this.setData({
      showNotes: !this.data.showNotes
    })
  },

  // 清除当前单元格
  clearCell() {
    if (!this.data.selectedCell) return
    
    const { row, col } = this.data.selectedCell
    const cell = this.data.grid[row][col]
    
    if (cell.isFixed) return
    
    const grid = this.data.grid.map(r => r.map(c => ({ ...c })))
    grid[row][col].value = 0
    grid[row][col].isError = false
    grid[row][col].notes = []
    
    this.setData({
      grid: grid
    })
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

  // 格式化时间
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  },

  onUnload() {
    this.stopTimer()
  }
})
