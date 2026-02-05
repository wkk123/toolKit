// flappy.ts

// 类型定义
type GameStatus = 'ready' | 'playing' | 'gameover'

interface Pipe {
  x: number
  topHeight: number
  bottomHeight: number
  gap: number
  passed?: boolean
}

// 常量配置
const CONFIG = {
  GRAVITY: 0.4,
  JUMP_POWER: -7,
  PIPE_SPEED: 2.5,
  PIPE_WIDTH: 60,
  INITIAL_PIPE_GAP: 180,
  MIN_PIPE_GAP: 140,
  GAP_DECREASE: 5,
  BIRD_SIZE: 30,
  BIRD_X: 50,
  GAME_LOOP_INTERVAL: 16, // 约60fps
  PIPE_SPACING: 300, // 管道之间的间距
  MIN_TOP_HEIGHT: 50,
  GROUND_HEIGHT: 20,
  DIFFICULTY_INTERVAL: 10 // 每10分增加难度
}

Page({
  data: {
    score: 0,
    highScore: 0,
    gameStatus: 'ready' as GameStatus,
    birdY: 0,
    birdVelocity: 0,
    pipes: [] as Pipe[],
    canvasWidth: 0,
    canvasHeight: 0,
    cellSize: 0,
    gameLoop: null as ReturnType<typeof setInterval> | null
  },

  canvas: null as WechatMiniprogram.Canvas | null,
  ctx: null as CanvasRenderingContext2D | null,
  gravity: CONFIG.GRAVITY,
  jumpPower: CONFIG.JUMP_POWER,
  pipeSpeed: CONFIG.PIPE_SPEED,
  pipeWidth: CONFIG.PIPE_WIDTH,
  pipeGap: CONFIG.INITIAL_PIPE_GAP,
  birdSize: CONFIG.BIRD_SIZE,
  birdX: CONFIG.BIRD_X,

  onLoad() {
    const systemInfo = wx.getSystemInfoSync()
    const windowWidth = systemInfo.windowWidth
    const windowHeight = systemInfo.windowHeight
    
    // 计算画布尺寸（留出头部和底部空间）
    const canvasWidth = windowWidth - 40
    const canvasHeight = windowHeight - 400 // 增加底部空间
    
    this.setData({
      canvasWidth: canvasWidth,
      canvasHeight: canvasHeight,
      cellSize: 1
    })

    const highScore = wx.getStorageSync('flappyHighScore') || 0
    this.setData({
      highScore: highScore
    })
  },

  onReady() {
    const query = wx.createSelectorQuery()
    query.select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          wx.showToast({
            title: '画布初始化失败',
            icon: 'none'
          })
          return
        }

        const canvas = res[0].node as WechatMiniprogram.Canvas
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
        
        if (!ctx) {
          wx.showToast({
            title: '画布上下文获取失败',
            icon: 'none'
          })
          return
        }
        
        this.canvas = canvas
        this.ctx = ctx

        const dpr = wx.getSystemInfoSync().pixelRatio
        const width = res[0].width || this.data.canvasWidth
        const height = res[0].height || this.data.canvasHeight
        
        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)

        this.initGame()
      })
  },

  onUnload() {
    this.stopGame()
  },

  initGame() {
    // 重置难度参数
    this.pipeGap = CONFIG.INITIAL_PIPE_GAP
    this.pipeSpeed = CONFIG.PIPE_SPEED
    
    // 确保画布尺寸已设置
    const birdY = this.data.canvasHeight > 0 ? this.data.canvasHeight / 2 : 200
    
    this.setData({
      birdY: birdY,
      birdVelocity: 0,
      pipes: [],
      score: 0,
      gameStatus: 'ready'
    })
    
    // 延迟绘制，确保画布已初始化
    setTimeout(() => {
      this.draw()
    }, 100)
  },

  startGame() {
    if (this.data.gameStatus === 'playing') return

    const birdY = this.data.canvasHeight > 0 ? this.data.canvasHeight / 2 : 200

    this.setData({
      gameStatus: 'playing',
      birdY: birdY,
      birdVelocity: 0,
      pipes: [],
      score: 0
    })

    // 立即生成第一个管道
    this.generatePipe()

    this.gameLoop = setInterval(() => {
      this.update()
    }, CONFIG.GAME_LOOP_INTERVAL)
  },

  stopGame() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop)
      this.gameLoop = null
    }
  },

  jump() {
    if (this.data.gameStatus !== 'playing') {
      if (this.data.gameStatus === 'ready') {
        this.startGame()
      }
      return
    }

    this.setData({
      birdVelocity: this.jumpPower
    })
  },

  update() {
    if (this.data.gameStatus !== 'playing') return

    // 更新鸟的位置
    let newVelocity = this.data.birdVelocity + this.gravity
    let newY = this.data.birdY + newVelocity

    // 检查边界
    if (newY < 0) {
      newY = 0
      newVelocity = 0
    }
    if (newY > this.data.canvasHeight - this.birdSize) {
      this.gameOver()
      return
    }

    this.setData({
      birdY: newY,
      birdVelocity: newVelocity
    })

    // 更新管道位置
    let pipes = this.data.pipes
      .map(pipe => ({
        ...pipe,
        x: pipe.x - this.pipeSpeed
      }))
      .filter(pipe => pipe.x > -this.pipeWidth)

    // 生成新管道
    const lastPipe = pipes.length > 0 ? pipes[pipes.length - 1] : null
    const shouldGeneratePipe = pipes.length === 0 || 
      (lastPipe && lastPipe.x < this.data.canvasWidth - CONFIG.PIPE_SPACING)
    
    if (shouldGeneratePipe) {
      this.generatePipe(pipes)
      pipes = this.data.pipes
    }

    // 检查碰撞和得分
    const birdCenterX = this.birdX + this.birdSize / 2
    const birdCenterY = this.data.birdY + this.birdSize / 2
    const birdRadius = this.birdSize / 2
    let newScore = this.data.score
    let scoreUpdated = false

    for (let i = 0; i < pipes.length; i++) {
      const pipe = pipes[i]
      
      // 检查是否通过管道（得分）
      if (!pipe.passed && birdCenterX > pipe.x + this.pipeWidth / 2) {
        pipe.passed = true
        pipes[i] = pipe
        newScore = this.data.score + 1
        scoreUpdated = true
        
        // 每10分增加一点难度（管道间距稍微减小）
        if (newScore % CONFIG.DIFFICULTY_INTERVAL === 0 && this.pipeGap > CONFIG.MIN_PIPE_GAP) {
          this.pipeGap = Math.max(CONFIG.MIN_PIPE_GAP, this.pipeGap - CONFIG.GAP_DECREASE)
        }
      }

      // 检查碰撞 - 使用更精确的碰撞检测
      if (this.checkCollision(birdCenterX, birdCenterY, birdRadius, pipe)) {
        this.gameOver()
        return
      }
    }

    // 更新分数（如果变化）
    if (scoreUpdated) {
      this.setData({
        pipes: pipes,
        score: newScore
      })
    }

    this.setData({
      pipes: pipes
    })

    this.draw()
  },

  // 检查碰撞
  checkCollision(birdCenterX: number, birdCenterY: number, birdRadius: number, pipe: Pipe): boolean {
    // 检查是否在管道范围内
    if (birdCenterX + birdRadius <= pipe.x || 
        birdCenterX - birdRadius >= pipe.x + this.pipeWidth) {
      return false
    }
    
    // 检查上管道碰撞
    if (birdCenterY - birdRadius < pipe.topHeight) {
      return true
    }
    
    // 检查下管道碰撞
    const bottomY = this.data.canvasHeight - pipe.bottomHeight
    if (birdCenterY + birdRadius > bottomY) {
      return true
    }
    
    return false
  },

  gameOver() {
    this.stopGame()
    this.setData({
      gameStatus: 'gameover'
    })

    if (this.data.score > this.data.highScore) {
      const newHighScore = this.data.score
      this.setData({
        highScore: newHighScore
      })
      wx.setStorageSync('flappyHighScore', newHighScore)
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

  draw() {
    if (!this.ctx) return

    const ctx = this.ctx
    const width = this.data.canvasWidth
    const height = this.data.canvasHeight

    // 清空画布 - 天空渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#87CEEB')
    gradient.addColorStop(1, '#E0F6FF')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // 绘制云朵
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    for (let i = 0; i < 3; i++) {
      const x = (i * 200 + Date.now() / 50) % (width + 100) - 50
      const y = 50 + i * 30
      this.drawCloud(ctx, x, y, 40)
    }

    // 绘制管道
    for (let pipe of this.data.pipes) {
      // 上管道主体
      ctx.fillStyle = '#4CAF50'
      ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.topHeight)
      
      // 上管道顶部（装饰）
      ctx.fillStyle = '#2E7D32'
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, this.pipeWidth + 10, 20)
      ctx.fillRect(pipe.x - 3, pipe.topHeight - 15, this.pipeWidth + 6, 5)
      
      // 下管道主体
      const bottomY = height - pipe.bottomHeight
      ctx.fillStyle = '#4CAF50'
      ctx.fillRect(pipe.x, bottomY, this.pipeWidth, pipe.bottomHeight)
      
      // 下管道顶部（装饰）
      ctx.fillStyle = '#2E7D32'
      ctx.fillRect(pipe.x - 5, bottomY, this.pipeWidth + 10, 20)
      ctx.fillRect(pipe.x - 3, bottomY + 5, this.pipeWidth + 6, 5)
    }

    // 绘制鸟
    const birdX = this.birdX + this.birdSize / 2
    const birdY = this.data.birdY + this.birdSize / 2
    const birdRadius = this.birdSize / 2
    
    // 鸟的身体（渐变）
    const birdGradient = ctx.createRadialGradient(
      birdX - 5, birdY - 5, 0,
      birdX, birdY, birdRadius
    )
    birdGradient.addColorStop(0, '#FFEB3B')
    birdGradient.addColorStop(1, '#FFD700')
    ctx.fillStyle = birdGradient
    ctx.beginPath()
    ctx.arc(birdX, birdY, birdRadius, 0, Math.PI * 2)
    ctx.fill()
    
    // 鸟的嘴巴
    ctx.fillStyle = '#FF9800'
    ctx.beginPath()
    ctx.moveTo(birdX + birdRadius - 5, birdY)
    ctx.lineTo(birdX + birdRadius + 5, birdY - 3)
    ctx.lineTo(birdX + birdRadius + 5, birdY + 3)
    ctx.closePath()
    ctx.fill()
    
    // 鸟的眼睛
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(birdX + 3, birdY - 3, 3, 0, Math.PI * 2)
    ctx.fill()
    
    // 眼睛高光
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(birdX + 4, birdY - 4, 1, 0, Math.PI * 2)
    ctx.fill()

    // 绘制地面
    const groundY = height - CONFIG.GROUND_HEIGHT
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(0, groundY, width, CONFIG.GROUND_HEIGHT)
    
    // 地面纹理
    ctx.fillStyle = '#A0522D'
    for (let i = 0; i < width; i += 20) {
      ctx.fillRect(i, groundY, 10, CONFIG.GROUND_HEIGHT)
    }
  },

  // 生成新管道
  generatePipe(existingPipes?: Pipe[]) {
    const pipes = existingPipes || this.data.pipes
    const minTopHeight = CONFIG.MIN_TOP_HEIGHT
    const maxTopHeight = this.data.canvasHeight - this.pipeGap - CONFIG.MIN_TOP_HEIGHT
    
    if (maxTopHeight <= minTopHeight) {
      console.warn('画布高度不足，无法生成管道')
      return
    }
    
    const topHeight = Math.random() * (maxTopHeight - minTopHeight) + minTopHeight
    const bottomHeight = this.data.canvasHeight - topHeight - this.pipeGap
    
    const newPipe: Pipe = {
      x: this.data.canvasWidth,
      topHeight: topHeight,
      bottomHeight: bottomHeight,
      gap: this.pipeGap,
      passed: false
    }
    
    pipes.push(newPipe)
    this.setData({
      pipes: pipes
    })
  },

  drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.arc(x + size * 0.6, y, size * 0.8, 0, Math.PI * 2)
    ctx.arc(x + size * 1.2, y, size, 0, Math.PI * 2)
    ctx.fill()
  },

  onCanvasTap() {
    this.jump()
  },

  restart() {
    this.initGame()
  }
})
