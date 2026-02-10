// 五子棋游戏

type Piece = 'black' | 'white' | null

Page({
  data: {
    boardSize: 15, // 15x15 棋盘
    board: [] as Piece[][],
    currentPlayer: 'black' as 'black' | 'white', // 黑棋先行
    gameStatus: 'playing' as 'playing' | 'blackWin' | 'whiteWin' | 'draw',
    blackCount: 0,
    whiteCount: 0
  },

  onLoad() {
    this.initGame()
  },

  // 初始化游戏
  initGame() {
    const boardSize = this.data.boardSize
    const board: Piece[][] = []
    
    // 初始化空棋盘
    for (let i = 0; i < boardSize; i++) {
      board[i] = []
      for (let j = 0; j < boardSize; j++) {
        board[i][j] = null
      }
    }

    this.setData({
      board: board,
      currentPlayer: 'black',
      gameStatus: 'playing',
      blackCount: 0,
      whiteCount: 0
    })
  },

  // 点击棋盘格子（用户只能下黑棋）
  onCellTap(e: WechatMiniprogram.TouchEvent) {
    if (this.data.gameStatus !== 'playing') return
    
    // 只有轮到黑棋（用户）时才能点击
    if (this.data.currentPlayer !== 'black') {
      wx.showToast({
        title: '请等待电脑下棋',
        icon: 'none',
        duration: 1000
      })
      return
    }

    const row = Number(e.currentTarget.dataset.row)
    const col = Number(e.currentTarget.dataset.col)
    
    if (isNaN(row) || isNaN(col)) return

    const board = this.data.board.map(r => [...r])
    
    // 检查该位置是否已有棋子
    if (board[row][col] !== null) {
      wx.showToast({
        title: '该位置已有棋子',
        icon: 'none',
        duration: 1000
      })
      return
    }

    // 用户下黑棋
    this.makeMove(row, col, 'black', board)
  },

  // 执行下棋操作
  makeMove(row: number, col: number, player: 'black' | 'white', board: Piece[][]) {
    board[row][col] = player

    // 更新计数
    const blackCount = player === 'black' 
      ? this.data.blackCount + 1 
      : this.data.blackCount
    const whiteCount = player === 'white' 
      ? this.data.whiteCount + 1 
      : this.data.whiteCount

    this.setData({
      board: board,
      blackCount: blackCount,
      whiteCount: whiteCount
    })

    // 检查是否获胜
    if (this.checkWin(row, col, board)) {
      const winner = player
      const status = winner === 'black' ? 'blackWin' : 'whiteWin'
      this.handleGameOver(status)
      return
    }

    // 检查是否平局（棋盘满了）
    if (this.isBoardFull(board)) {
      this.handleGameOver('draw')
      return
    }

    // 如果是用户下的黑棋，轮到电脑下白棋
    if (player === 'black') {
      this.setData({
        currentPlayer: 'white'
      })
      
      // 延迟一下让用户看到自己的棋子，然后电脑下棋
      setTimeout(() => {
        this.computerMove()
      }, 300)
    } else {
      // 电脑下完，轮到用户
      this.setData({
        currentPlayer: 'black'
      })
    }
  },

  // 电脑AI下棋
  computerMove() {
    if (this.data.gameStatus !== 'playing') return
    if (this.data.currentPlayer !== 'white') return

    const board = this.data.board.map(r => [...r])
    const move = this.findBestMove(board)
    
    if (move) {
      this.makeMove(move.row, move.col, 'white', board)
    }
  },

  // 寻找最佳下棋位置（简单AI）
  findBestMove(board: Piece[][]): { row: number, col: number } | null {
    const boardSize = this.data.boardSize
    const moves: Array<{ row: number, col: number, score: number }> = []

    // 遍历所有空位，计算分数
    for (let i = 0; i < boardSize; i++) {
      for (let j = 0; j < boardSize; j++) {
        if (board[i][j] !== null) continue

        let score = 0

        // 1. 如果电脑能连成五子，优先选择（最高优先级）
        board[i][j] = 'white'
        if (this.checkWin(i, j, board)) {
          board[i][j] = null
          return { row: i, col: j }
        }
        board[i][j] = null

        // 2. 如果用户下一步能连成五子，必须阻止（高优先级）
        board[i][j] = 'black'
        if (this.checkWin(i, j, board)) {
          board[i][j] = null
          score += 10000
        }
        board[i][j] = null

        // 3. 计算电脑连子的潜力
        score += this.evaluatePosition(i, j, 'white', board) * 100

        // 4. 计算阻止用户连子的价值
        score += this.evaluatePosition(i, j, 'black', board) * 50

        // 5. 中心位置加分
        const center = Math.floor(boardSize / 2)
        const distanceFromCenter = Math.abs(i - center) + Math.abs(j - center)
        score += (boardSize - distanceFromCenter) * 2

        // 6. 周围有棋子的地方加分（更活跃）
        const nearbyScore = this.getNearbyScore(i, j, board)
        score += nearbyScore

        moves.push({ row: i, col: j, score })
      }
    }

    if (moves.length === 0) return null

    // 按分数排序，选择最高分的位置
    moves.sort((a, b) => b.score - a.score)
    return { row: moves[0].row, col: moves[0].col }
  },

  // 评估位置的连子潜力
  evaluatePosition(row: number, col: number, player: Piece, board: Piece[][]): number {
    const directions = [
      [0, 1],   // 横向
      [1, 0],   // 纵向
      [1, 1],   // 主对角线
      [1, -1]   // 副对角线
    ]

    let totalScore = 0

    for (const [dx, dy] of directions) {
      let count = 0
      let blocked = 0

      // 正向检查
      for (let i = 1; i < 5; i++) {
        const newRow = row + dx * i
        const newCol = col + dy * i
        if (newRow >= 0 && newRow < this.data.boardSize && 
            newCol >= 0 && newCol < this.data.boardSize) {
          if (board[newRow][newCol] === player) {
            count++
          } else if (board[newRow][newCol] !== null) {
            blocked++
            break
          }
        } else {
          blocked++
          break
        }
      }

      // 反向检查
      for (let i = 1; i < 5; i++) {
        const newRow = row - dx * i
        const newCol = col - dy * i
        if (newRow >= 0 && newRow < this.data.boardSize && 
            newCol >= 0 && newCol < this.data.boardSize) {
          if (board[newRow][newCol] === player) {
            count++
          } else if (board[newRow][newCol] !== null) {
            blocked++
            break
          }
        } else {
          blocked++
          break
        }
      }

      // 根据连子数和是否被阻挡计算分数
      if (count >= 4) totalScore += 1000
      else if (count === 3 && blocked < 2) totalScore += 100
      else if (count === 2 && blocked < 2) totalScore += 10
      else if (count === 1 && blocked < 2) totalScore += 1
    }

    return totalScore
  },

  // 获取周围棋子的分数（鼓励在已有棋子附近下棋）
  getNearbyScore(row: number, col: number, board: Piece[][]): number {
    let score = 0
    const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]

    for (const [dx, dy] of directions) {
      const newRow = row + dx
      const newCol = col + dy
      if (newRow >= 0 && newRow < this.data.boardSize && 
          newCol >= 0 && newCol < this.data.boardSize &&
          board[newRow][newCol] !== null) {
        score += 5
      }
    }

    return score
  },

  // 检查是否获胜（五子连珠）
  checkWin(row: number, col: number, board: Piece[][]): boolean {
    const player = board[row][col]
    if (!player) return false

    const directions = [
      [0, 1],   // 横向
      [1, 0],   // 纵向
      [1, 1],   // 主对角线
      [1, -1]   // 副对角线
    ]

    for (const [dx, dy] of directions) {
      let count = 1 // 当前棋子本身

      // 正向检查
      for (let i = 1; i < 5; i++) {
        const newRow = row + dx * i
        const newCol = col + dy * i
        if (newRow >= 0 && newRow < this.data.boardSize && 
            newCol >= 0 && newCol < this.data.boardSize &&
            board[newRow][newCol] === player) {
          count++
        } else {
          break
        }
      }

      // 反向检查
      for (let i = 1; i < 5; i++) {
        const newRow = row - dx * i
        const newCol = col - dy * i
        if (newRow >= 0 && newRow < this.data.boardSize && 
            newCol >= 0 && newCol < this.data.boardSize &&
            board[newRow][newCol] === player) {
          count++
        } else {
          break
        }
      }

      if (count >= 5) {
        return true
      }
    }

    return false
  },

  // 检查棋盘是否已满
  isBoardFull(board: Piece[][]): boolean {
    for (let i = 0; i < this.data.boardSize; i++) {
      for (let j = 0; j < this.data.boardSize; j++) {
        if (board[i][j] === null) {
          return false
        }
      }
    }
    return true
  },

  // 重新开始
  restart() {
    this.initGame()
  },

  // 对局结束后统一处理：给出提示，并可选择下一局或返回首页
  handleGameOver(result: 'blackWin' | 'whiteWin' | 'draw') {
    if (this.data.gameStatus !== 'playing') {
      // 已经处理过结束状态
      return
    }

    this.setData({
      gameStatus: result
    })

    let content = ''
    if (result === 'blackWin') {
      content = '本局结果：你获胜了！\n\n是否开始下一局？'
    } else if (result === 'whiteWin') {
      content = '本局结果：电脑获胜了。\n\n是否开始下一局？'
    } else {
      content = '本局结果：平局。\n\n是否开始下一局？'
    }

    wx.showModal({
      title: '对局结束',
      content,
      confirmText: '下一局',
      cancelText: '返回首页',
      success: (res) => {
        if (res.confirm) {
          // 下一局：重新初始化棋盘
          this.initGame()
        } else if (res.cancel) {
          // 返回上一页
          wx.navigateBack()
        }
      }
    })
  }
})
