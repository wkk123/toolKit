// tetris.ts
Page({
  data: {
    score: 0,
    lines: 0,
    level: 1,
    highScore: 0,
    gameStatus: 'ready', // ready, playing, paused, gameover
    boardWidth: 10,
    boardHeight: 20,
    cellSize: 0,
    previewCellSize: 0,
    board: [] as number[][],
    currentPiece: null as any,
    nextPiece: null as any,
    gameLoop: null as any,
    dropTimer: null as any,
    clearingLines: [] as number[], // 正在消除的行
    moveRepeatTimer: null as any, // 长按移动定时器
    lastMoveTime: 0 // 上次移动时间
  },

  canvas: null as any,
  ctx: null as any,
  previewCanvas: null as any,
  previewCtx: null as any,

  // 俄罗斯方块形状定义（7种）
  pieces: [
    // I 型
    [
      [[1,1,1,1]]
    ],
    // O 型
    [
      [[1,1],
       [1,1]]
    ],
    // T 型
    [
      [[0,1,0],
       [1,1,1]],
      [[1,0],
       [1,1],
       [1,0]],
      [[1,1,1],
       [0,1,0]],
      [[0,1],
       [1,1],
       [0,1]]
    ],
    // S 型
    [
      [[0,1,1],
       [1,1,0]],
      [[1,0],
       [1,1],
       [0,1]]
    ],
    // Z 型
    [
      [[1,1,0],
       [0,1,1]],
      [[0,1],
       [1,1],
       [1,0]]
    ],
    // J 型
    [
      [[1,0,0],
       [1,1,1]],
      [[1,1],
       [1,0],
       [1,0]],
      [[1,1,1],
       [0,0,1]],
      [[0,1],
       [0,1],
       [1,1]]
    ],
    // L 型
    [
      [[0,0,1],
       [1,1,1]],
      [[1,0],
       [1,0],
       [1,1]],
      [[1,1,1],
       [1,0,0]],
      [[1,1],
       [0,1],
       [0,1]]
    ]
  ],

  // 方块颜色
  pieceColors: [
    '#00f2fe', // I - 青色
    '#fee140', // O - 黄色
    '#a855f7', // T - 紫色
    '#43e97b', // S - 绿色
    '#ff6b6b', // Z - 红色
    '#4facfe', // J - 蓝色
    '#fa709a'  // L - 粉色
  ],

  onLoad() {
    // 计算格子大小
    const systemInfo = wx.getSystemInfoSync()
    const windowWidth = systemInfo.windowWidth
    const cellSize = Math.floor((windowWidth - 200) / this.data.boardWidth)
    
    this.setData({
      cellSize: cellSize,
      previewCellSize: Math.floor(cellSize * 0.6)
    })

    // 加载最高分
    const highScore = wx.getStorageSync('tetrisHighScore') || 0
    this.setData({
      highScore: highScore
    })
  },

  onReady() {
    // 获取主画布
    const query = wx.createSelectorQuery()
    query.select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res: any) => {
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        
        this.canvas = canvas
        this.ctx = ctx

        const dpr = wx.getSystemInfoSync().pixelRatio
        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        ctx.scale(dpr, dpr)

        // 获取预览画布
        query.select('#previewCanvas')
          .fields({ node: true, size: true })
          .exec((previewRes: any) => {
            const previewCanvas = previewRes[0].node
            const previewCtx = previewCanvas.getContext('2d')
            
            this.previewCanvas = previewCanvas
            this.previewCtx = previewCtx

            const previewDpr = wx.getSystemInfoSync().pixelRatio
            previewCanvas.width = previewRes[0].width * previewDpr
            previewCanvas.height = previewRes[0].height * previewDpr
            previewCtx.scale(previewDpr, previewDpr)

            this.initGame()
          })
      })
  },

  onUnload() {
    this.stopGame()
  },

  // 初始化游戏
  initGame() {
    // 初始化游戏板
    const board: number[][] = []
    for (let y = 0; y < this.data.boardHeight; y++) {
      board[y] = []
      for (let x = 0; x < this.data.boardWidth; x++) {
        board[y][x] = 0
      }
    }

    this.setData({
      board: board,
      score: 0,
      lines: 0,
      level: 1,
      gameStatus: 'ready'
    })

    this.spawnPiece()
    this.spawnNextPiece()
    this.draw()
  },

  // 生成随机方块
  spawnPiece() {
    const pieceIndex = this.data.nextPiece !== null 
      ? this.data.nextPiece.index 
      : Math.floor(Math.random() * this.pieces.length)
    
    const rotations = this.pieces[pieceIndex]
    const rotation = Math.floor(Math.random() * rotations.length)
    
    const piece = {
      index: pieceIndex,
      shape: rotations[rotation],
      rotation: rotation,
      x: Math.floor((this.data.boardWidth - rotations[rotation][0].length) / 2),
      y: 0,
      color: this.pieceColors[pieceIndex]
    }

    this.setData({
      currentPiece: piece
    })

    // 检查游戏是否结束
    if (this.checkCollision(piece)) {
      this.gameOver()
    }
  },

  // 生成下一个方块
  spawnNextPiece() {
    const pieceIndex = Math.floor(Math.random() * this.pieces.length)
    const rotations = this.pieces[pieceIndex]
    const rotation = Math.floor(Math.random() * rotations.length)
    
    const piece = {
      index: pieceIndex,
      shape: rotations[rotation],
      rotation: rotation,
      color: this.pieceColors[pieceIndex]
    }

    this.setData({
      nextPiece: piece
    })

    this.drawPreview()
  },

  // 检查碰撞
  checkCollision(piece: any, offsetX = 0, offsetY = 0): boolean {
    const newX = piece.x + offsetX
    const newY = piece.y + offsetY

    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardX = newX + x
          const boardY = newY + y

          // 检查边界
          if (boardX < 0 || boardX >= this.data.boardWidth || 
              boardY >= this.data.boardHeight) {
            return true
          }

          // 检查与已放置方块的碰撞
          if (boardY >= 0 && this.data.board[boardY][boardX]) {
            return true
          }
        }
      }
    }
    return false
  },

  // 移动方块
  movePiece(direction: string, isRepeat = false) {
    if (this.data.gameStatus !== 'playing' || !this.data.currentPiece) return

    const now = Date.now()
    // 防止移动过快
    if (isRepeat && now - this.data.lastMoveTime < 50) return
    this.setData({
      lastMoveTime: now
    })

    const piece = this.data.currentPiece
    let offsetX = 0
    let offsetY = 0

    switch (direction) {
      case 'left':
        offsetX = -1
        break
      case 'right':
        offsetX = 1
        break
      case 'down':
        offsetY = 1
        break
    }

    if (!this.checkCollision(piece, offsetX, offsetY)) {
      this.setData({
        'currentPiece.x': piece.x + offsetX,
        'currentPiece.y': piece.y + offsetY
      })
      this.draw()
    } else if (direction === 'down') {
      // 无法下移，固定方块
      this.placePiece()
    }
  },

  // 开始长按移动
  startMoveRepeat(direction: string) {
    this.movePiece(direction)
    this.data.moveRepeatTimer = setTimeout(() => {
      const interval = setInterval(() => {
        if (!this.data.moveRepeatTimer) {
          clearInterval(interval)
          return
        }
        this.movePiece(direction, true)
      }, 100)
      this.data.moveRepeatTimer = interval as any
    }, 300)
  },

  // 停止长按移动
  stopMoveRepeat() {
    if (this.data.moveRepeatTimer) {
      clearInterval(this.data.moveRepeatTimer)
      this.data.moveRepeatTimer = null
    }
  },

  // 旋转方块
  rotatePiece() {
    if (this.data.gameStatus !== 'playing' || !this.data.currentPiece) return

    const piece = this.data.currentPiece
    const rotations = this.pieces[piece.index]
    const nextRotation = (piece.rotation + 1) % rotations.length
    const nextShape = rotations[nextRotation]

    // 尝试旋转
    const rotatedPiece = {
      ...piece,
      shape: nextShape,
      rotation: nextRotation
    }

    // 检查旋转后是否碰撞
    if (!this.checkCollision(rotatedPiece)) {
      this.setData({
        currentPiece: rotatedPiece
      })
      this.draw()
    } else {
      // 尝试左右移动后旋转（墙踢）
      for (let offset of [-1, 1, -2, 2]) {
        const testPiece = {
          ...rotatedPiece,
          x: piece.x + offset
        }
        if (!this.checkCollision(testPiece)) {
          this.setData({
            currentPiece: testPiece
          })
          this.draw()
          return
        }
      }
    }
  },

  // 快速下落
  hardDrop() {
    if (this.data.gameStatus !== 'playing' || !this.data.currentPiece) return

    let dropDistance = 0
    const piece = this.data.currentPiece

    while (!this.checkCollision(piece, 0, dropDistance + 1)) {
      dropDistance++
    }

    if (dropDistance > 0) {
      this.setData({
        'currentPiece.y': piece.y + dropDistance
      })
      this.placePiece()
    }
  },

  // 放置方块
  placePiece() {
    const piece = this.data.currentPiece
    const board = this.data.board.map(row => [...row])

    // 将方块放置到游戏板
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardX = piece.x + x
          const boardY = piece.y + y
          if (boardY >= 0) {
            board[boardY][boardX] = piece.index + 1
          }
        }
      }
    }

    this.setData({
      board: board
    })

    // 检查并消除满行
    this.clearLines()

    // 生成新方块
    this.spawnPiece()
    this.spawnNextPiece()
    this.draw()
  },

  // 消除满行
  clearLines() {
    const board = this.data.board
    const linesToClear: number[] = []

    // 找出满行
    for (let y = 0; y < board.length; y++) {
      if (board[y].every(cell => cell !== 0)) {
        linesToClear.push(y)
      }
    }

    if (linesToClear.length === 0) return

    // 显示消除动画
    this.setData({
      clearingLines: linesToClear
    })
    this.draw()

    // 延迟消除，显示动画
    setTimeout(() => {
      // 消除满行
      for (let y of linesToClear) {
        board.splice(y, 1)
        board.unshift(new Array(this.data.boardWidth).fill(0))
      }

      // 计算得分
      const lineCount = linesToClear.length
      const points = [0, 100, 300, 500, 800][lineCount] || 800
      const newScore = this.data.score + points * this.data.level
      const newLines = this.data.lines + lineCount
      const newLevel = Math.floor(newLines / 10) + 1

      this.setData({
        board: board,
        clearingLines: [],
        score: newScore,
        lines: newLines,
        level: newLevel
      })

      // 更新最高分
      if (newScore > this.data.highScore) {
        this.setData({
          highScore: newScore
        })
        wx.setStorageSync('tetrisHighScore', newScore)
      }

      // 更新游戏速度
      this.updateGameSpeed()
      this.draw()
    }, 300)
  },

  // 更新游戏速度
  updateGameSpeed() {
    this.stopGame()
    if (this.data.gameStatus === 'playing') {
      // 速度计算：使用平滑曲线
      // 初始1200ms，每级减少速度，最低250ms
      // 使用指数衰减，让速度变化更平滑
      const baseSpeed = 1200
      const minSpeed = 250
      const level = this.data.level
      // 使用公式：speed = baseSpeed * (0.9 ^ (level-1))，但限制最小值
      const speed = Math.max(minSpeed, baseSpeed * Math.pow(0.92, level - 1))
      this.startGame(Math.floor(speed))
    }
  },

  // 自动下落
  autoDrop() {
    if (this.data.gameStatus === 'playing') {
      this.movePiece('down')
    }
  },

  // 开始游戏
  startGame(speed?: number) {
    if (this.data.gameStatus === 'playing') return

    // 速度计算：使用平滑曲线
    // 初始1200ms，每级减少速度，最低250ms
    const baseSpeed = 1200
    const minSpeed = 250
    const level = this.data.level
    const gameSpeed = speed || Math.max(minSpeed, Math.floor(baseSpeed * Math.pow(0.92, level - 1)))

    this.setData({
      gameStatus: 'playing'
    })

    this.dropTimer = setInterval(() => {
      this.autoDrop()
    }, gameSpeed)
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
    this.updateGameSpeed()
  },

  // 停止游戏
  stopGame() {
    if (this.dropTimer) {
      clearInterval(this.dropTimer)
      this.dropTimer = null
    }
    this.stopMoveRepeat()
  },

  // 游戏结束
  gameOver() {
    this.stopGame()
    this.setData({
      gameStatus: 'gameover'
    })

    wx.showModal({
      title: '游戏结束',
      content: `得分: ${this.data.score}\n消除行数: ${this.data.lines}\n等级: ${this.data.level}\n最高分: ${this.data.highScore}`,
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

  // 控制操作
  onControl(e: any) {
    const action = e.currentTarget.dataset.action
    switch (action) {
      case 'left':
      case 'right':
      case 'down':
        this.movePiece(action)
        break
      case 'rotate':
        this.rotatePiece()
        break
      case 'drop':
        this.hardDrop()
        break
    }
  },

  // 长按开始
  onControlTouchStart(e: any) {
    const action = e.currentTarget.dataset.action
    if (action === 'left' || action === 'right' || action === 'down') {
      this.startMoveRepeat(action)
    }
  },

  // 长按结束
  onControlTouchEnd() {
    this.stopMoveRepeat()
  },

  // 获取阴影位置（ghost piece）
  getGhostPiece() {
    if (!this.data.currentPiece) return null

    const piece = this.data.currentPiece
    let dropDistance = 0

    while (!this.checkCollision(piece, 0, dropDistance + 1)) {
      dropDistance++
    }

    return {
      ...piece,
      y: piece.y + dropDistance
    }
  },

  // 绘制游戏
  draw() {
    if (!this.ctx) return

    const ctx = this.ctx
    const cellSize = this.data.cellSize
    const boardWidth = this.data.boardWidth
    const boardHeight = this.data.boardHeight

    // 清空画布
    ctx.fillStyle = '#0f0c29'
    ctx.fillRect(0, 0, boardWidth * cellSize, boardHeight * cellSize)

    // 绘制网格
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 1
    for (let x = 0; x <= boardWidth; x++) {
      ctx.beginPath()
      ctx.moveTo(x * cellSize, 0)
      ctx.lineTo(x * cellSize, boardHeight * cellSize)
      ctx.stroke()
    }
    for (let y = 0; y <= boardHeight; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * cellSize)
      ctx.lineTo(boardWidth * cellSize, y * cellSize)
      ctx.stroke()
    }

    // 绘制已放置的方块
    for (let y = 0; y < boardHeight; y++) {
      // 检查是否正在消除
      const isClearing = this.data.clearingLines.includes(y)
      
      for (let x = 0; x < boardWidth; x++) {
        if (this.data.board[y][x]) {
          const colorIndex = this.data.board[y][x] - 1
          this.drawCell(ctx, x, y, this.pieceColors[colorIndex], cellSize, isClearing)
        }
      }
    }

    // 绘制阴影预览（ghost piece）
    const ghostPiece = this.getGhostPiece()
    if (ghostPiece && ghostPiece.y !== this.data.currentPiece.y) {
      ctx.globalAlpha = 0.3
      for (let y = 0; y < ghostPiece.shape.length; y++) {
        for (let x = 0; x < ghostPiece.shape[y].length; x++) {
          if (ghostPiece.shape[y][x]) {
            const boardX = ghostPiece.x + x
            const boardY = ghostPiece.y + y
            if (boardY >= 0) {
              ctx.strokeStyle = ghostPiece.color
              ctx.lineWidth = 2
              ctx.strokeRect(
                boardX * cellSize + 2,
                boardY * cellSize + 2,
                cellSize - 4,
                cellSize - 4
              )
            }
          }
        }
      }
      ctx.globalAlpha = 1.0
    }

    // 绘制当前方块
    if (this.data.currentPiece) {
      const piece = this.data.currentPiece
      for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (piece.shape[y][x]) {
            const boardX = piece.x + x
            const boardY = piece.y + y
            if (boardY >= 0) {
              this.drawCell(ctx, boardX, boardY, piece.color, cellSize, false)
            }
          }
        }
      }
    }
  },

  // 绘制单个方块（带效果）
  drawCell(ctx: any, x: number, y: number, color: string, cellSize: number, isClearing: boolean) {
    const pixelX = x * cellSize
    const pixelY = y * cellSize
    const padding = 2
    const size = cellSize - padding * 2

    // 消除动画效果
    if (isClearing) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(pixelX + padding, pixelY + padding, size, size)
      return
    }

    // 创建渐变
    const gradient = ctx.createLinearGradient(
      pixelX + padding,
      pixelY + padding,
      pixelX + padding + size,
      pixelY + padding + size
    )
    gradient.addColorStop(0, this.lightenColor(color, 0.3))
    gradient.addColorStop(1, color)

    // 绘制主体
    ctx.fillStyle = gradient
    ctx.fillRect(pixelX + padding, pixelY + padding, size, size)

    // 绘制高光
    ctx.fillStyle = this.lightenColor(color, 0.5)
    ctx.fillRect(
      pixelX + padding + 2,
      pixelY + padding + 2,
      size * 0.4,
      size * 0.4
    )

    // 绘制边框
    ctx.strokeStyle = this.darkenColor(color, 0.3)
    ctx.lineWidth = 1
    ctx.strokeRect(pixelX + padding, pixelY + padding, size, size)
  },

  // 颜色变亮
  lightenColor(color: string, amount: number): string {
    const num = parseInt(color.replace('#', ''), 16)
    const r = Math.min(255, Math.floor((num >> 16) + amount * 255))
    const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + amount * 255))
    const b = Math.min(255, Math.floor((num & 0x0000FF) + amount * 255))
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  },

  // 颜色变暗
  darkenColor(color: string, amount: number): string {
    const num = parseInt(color.replace('#', ''), 16)
    const r = Math.max(0, Math.floor((num >> 16) * (1 - amount)))
    const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - amount)))
    const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - amount)))
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  },

  // 绘制预览
  drawPreview() {
    if (!this.previewCtx || !this.data.nextPiece) return

    const ctx = this.previewCtx
    const cellSize = this.data.previewCellSize
    const piece = this.data.nextPiece

    // 清空画布
    ctx.fillStyle = '#0f0c29'
    ctx.fillRect(0, 0, 200, 200)

    // 绘制下一个方块（带效果）
    const offsetX = (4 - piece.shape[0].length) / 2
    const offsetY = (4 - piece.shape.length) / 2
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const pixelX = (offsetX + x) * cellSize
          const pixelY = (offsetY + y) * cellSize
          const padding = 2
          const size = cellSize - padding * 2

          // 渐变
          const gradient = ctx.createLinearGradient(
            pixelX + padding,
            pixelY + padding,
            pixelX + padding + size,
            pixelY + padding + size
          )
          gradient.addColorStop(0, this.lightenColor(piece.color, 0.3))
          gradient.addColorStop(1, piece.color)

          ctx.fillStyle = gradient
          ctx.fillRect(pixelX + padding, pixelY + padding, size, size)

          // 高光
          ctx.fillStyle = this.lightenColor(piece.color, 0.5)
          ctx.fillRect(
            pixelX + padding + 2,
            pixelY + padding + 2,
            size * 0.4,
            size * 0.4
          )

          // 边框
          ctx.strokeStyle = this.darkenColor(piece.color, 0.3)
          ctx.lineWidth = 1
          ctx.strokeRect(pixelX + padding, pixelY + padding, size, size)
        }
      }
    }
  },

  // 重新开始
  restart() {
    this.initGame()
  }
})
