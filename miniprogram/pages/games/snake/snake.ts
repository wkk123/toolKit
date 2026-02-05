// snake.ts
Page({
  data: {
    score: 0,
    highScore: 0,
    gameStatus: 'ready', // ready, playing, paused, gameover
    gridSize: 20, // 网格大小（格子数）
    cellSize: 0, // 每个格子的大小（像素）
    snake: [] as Array<{x: number, y: number}>,
    food: { x: 0, y: 0 },
    direction: 'right', // up, down, left, right
    nextDirection: 'right',
    gameLoop: null as any
  },

  canvas: null as any,
  ctx: null as any,

  onLoad() {
    // 获取系统信息，计算画布大小
    const systemInfo = wx.getSystemInfoSync()
    const windowWidth = systemInfo.windowWidth
    const cellSize = Math.floor((windowWidth - 80) / this.data.gridSize)
    
    this.setData({
      cellSize: cellSize
    })

    // 加载最高分
    const highScore = wx.getStorageSync('snakeHighScore') || 0
    this.setData({
      highScore: highScore
    })
  },

  onReady() {
    // 获取 canvas 上下文
    const query = wx.createSelectorQuery()
    query.select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res: any) => {
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        
        this.canvas = canvas
        this.ctx = ctx

        // 设置画布尺寸
        const dpr = wx.getSystemInfoSync().pixelRatio
        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        ctx.scale(dpr, dpr)

        this.initGame()
      })
  },

  onUnload() {
    this.stopGame()
  },

  // 初始化游戏
  initGame() {
    // 初始化蛇的位置（中间位置）
    const centerX = Math.floor(this.data.gridSize / 2)
    const centerY = Math.floor(this.data.gridSize / 2)
    const snake = [
      { x: centerX, y: centerY },
      { x: centerX - 1, y: centerY },
      { x: centerX - 2, y: centerY }
    ]

    this.setData({
      snake: snake,
      direction: 'right',
      nextDirection: 'right',
      score: 0,
      gameStatus: 'ready'
    })

    this.generateFood()
    this.draw()
  },

  // 生成食物
  generateFood() {
    let foodX: number, foodY: number
    let valid = false

    while (!valid) {
      foodX = Math.floor(Math.random() * this.data.gridSize)
      foodY = Math.floor(Math.random() * this.data.gridSize)
      
      // 确保食物不在蛇身上
      valid = !this.data.snake.some(segment => 
        segment.x === foodX && segment.y === foodY
      )
    }

    this.setData({
      food: { x: foodX!, y: foodY! }
    })
  },

  // 获取游戏速度（随分数增加而加快）
  getGameSpeed(): number {
    // 基础速度200ms，每10分减少10ms，最低100ms
    const baseSpeed = 200
    const speedReduction = Math.floor(this.data.score / 10) * 10
    return Math.max(100, baseSpeed - speedReduction)
  },

  // 开始游戏
  startGame() {
    if (this.data.gameStatus === 'playing') return

    this.setData({
      gameStatus: 'playing'
    })

    this.updateGameLoop()
  },

  // 更新游戏循环（根据分数调整速度）
  updateGameLoop() {
    this.stopGame()
    const speed = this.getGameSpeed()
    this.gameLoop = setInterval(() => {
      this.moveSnake()
    }, speed)
  },

  // 暂停游戏
  pauseGame() {
    if (this.data.gameStatus !== 'playing') return
    
    this.setData({
      gameStatus: 'paused'
    })
    this.stopGame()
  },

  // 继续游戏
  resumeGame() {
    if (this.data.gameStatus !== 'paused') return

    this.setData({
      gameStatus: 'playing'
    })

    this.updateGameLoop()
  },

  // 停止游戏循环
  stopGame() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop)
      this.gameLoop = null
    }
  },

  // 移动蛇
  moveSnake() {
    if (this.data.gameStatus !== 'playing') return

    const snake = [...this.data.snake]
    const head = { ...snake[0] }
    const direction = this.data.nextDirection

    // 根据方向移动头部
    switch (direction) {
      case 'up':
        head.y -= 1
        break
      case 'down':
        head.y += 1
        break
      case 'left':
        head.x -= 1
        break
      case 'right':
        head.x += 1
        break
    }

    // 检查碰撞
    if (this.checkCollision(head)) {
      this.gameOver()
      return
    }

    // 检查是否吃到食物
    if (head.x === this.data.food.x && head.y === this.data.food.y) {
      // 吃到食物，不删除尾部，生成新食物
      snake.unshift(head)
      const newScore = this.data.score + 10
      this.setData({
        snake: snake,
        score: newScore,
        direction: direction
      })
      this.generateFood()
      // 更新游戏速度
      this.updateGameLoop()
    } else {
      // 没吃到食物，移动蛇
      snake.unshift(head)
      snake.pop()
      this.setData({
        snake: snake,
        direction: direction
      })
    }

    this.draw()
  },

  // 检查碰撞
  checkCollision(head: {x: number, y: number}): boolean {
    // 检查撞墙
    if (head.x < 0 || head.x >= this.data.gridSize ||
        head.y < 0 || head.y >= this.data.gridSize) {
      return true
    }

    // 检查撞到自己
    return this.data.snake.some(segment => 
      segment.x === head.x && segment.y === head.y
    )
  },

  // 游戏结束
  gameOver() {
    this.stopGame()
    this.setData({
      gameStatus: 'gameover'
    })

    // 更新最高分
    if (this.data.score > this.data.highScore) {
      const newHighScore = this.data.score
      this.setData({
        highScore: newHighScore
      })
      wx.setStorageSync('snakeHighScore', newHighScore)
    }

    wx.showModal({
      title: '游戏结束',
      content: `得分: ${this.data.score}\n最高分: ${this.data.highScore}`,
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

  // 改变方向
  changeDirection(e: any) {
    const direction = e.currentTarget.dataset.direction
    const currentDirection = this.data.direction

    // 防止反向移动
    if (
      (direction === 'up' && currentDirection === 'down') ||
      (direction === 'down' && currentDirection === 'up') ||
      (direction === 'left' && currentDirection === 'right') ||
      (direction === 'right' && currentDirection === 'left')
    ) {
      return
    }

    this.setData({
      nextDirection: direction
    })
  },

  // 绘制游戏
  draw() {
    if (!this.ctx) return

    const ctx = this.ctx
    const cellSize = this.data.cellSize
    const canvasWidth = this.data.gridSize * cellSize
    const canvasHeight = this.data.gridSize * cellSize

    // 清空画布
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // 绘制网格线
    ctx.strokeStyle = '#16213e'
    ctx.lineWidth = 1
    for (let i = 0; i <= this.data.gridSize; i++) {
      // 垂直线
      ctx.beginPath()
      ctx.moveTo(i * cellSize, 0)
      ctx.lineTo(i * cellSize, canvasHeight)
      ctx.stroke()

      // 水平线
      ctx.beginPath()
      ctx.moveTo(0, i * cellSize)
      ctx.lineTo(canvasWidth, i * cellSize)
      ctx.stroke()
    }

    // 绘制食物（带闪烁效果）
    const time = Date.now()
    const pulse = Math.sin(time / 200) * 0.3 + 0.7
    ctx.fillStyle = `rgba(255, 107, 107, ${pulse})`
    ctx.fillRect(
      this.data.food.x * cellSize + 2,
      this.data.food.y * cellSize + 2,
      cellSize - 4,
      cellSize - 4
    )
    // 食物高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.fillRect(
      this.data.food.x * cellSize + 4,
      this.data.food.y * cellSize + 4,
      cellSize / 3,
      cellSize / 3
    )

    // 绘制蛇
    this.data.snake.forEach((segment, index) => {
      const x = segment.x * cellSize + 2
      const y = segment.y * cellSize + 2
      const size = cellSize - 4
      
      if (index === 0) {
        // 蛇头（渐变效果）
        const gradient = ctx.createRadialGradient(
          x + size / 2, y + size / 2, 0,
          x + size / 2, y + size / 2, size / 2
        )
        gradient.addColorStop(0, '#6bb6ff')
        gradient.addColorStop(1, '#4facfe')
        ctx.fillStyle = gradient
        ctx.fillRect(x, y, size, size)
        // 蛇头眼睛
        ctx.fillStyle = '#fff'
        ctx.fillRect(x + size / 3, y + size / 3, size / 6, size / 6)
        ctx.fillRect(x + size * 2 / 3, y + size / 3, size / 6, size / 6)
      } else {
        // 蛇身（渐变效果，越靠近尾部越暗）
        const alpha = 1 - (index / this.data.snake.length) * 0.3
        const gradient = ctx.createRadialGradient(
          x + size / 2, y + size / 2, 0,
          x + size / 2, y + size / 2, size / 2
        )
        gradient.addColorStop(0, `rgba(67, 233, 123, ${alpha})`)
        gradient.addColorStop(1, `rgba(67, 233, 123, ${alpha * 0.8})`)
        ctx.fillStyle = gradient
        ctx.fillRect(x, y, size, size)
      }
    })
  },

  // 重新开始
  restart() {
    this.initGame()
  }
})
