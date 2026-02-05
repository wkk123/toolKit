// memory.ts
Page({
  data: {
    score: 0,
    moves: 0,
    gameStatus: 'ready', // ready, playing, gameover
    cards: [] as Array<{id: number, value: number, icon: string, flipped: boolean, matched: boolean}>,
    flippedCards: [] as number[],
    canFlip: true,
    gridSize: 4, // 4x4 = 16 cards, 8 pairs
    cellSize: 0
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync()
    const windowWidth = systemInfo.windowWidth
    // 计算卡片大小，留出边距
    const cellSize = Math.floor((windowWidth - 120) / this.data.gridSize)
    
    this.setData({
      cellSize: cellSize
    })
    
    // 初始化游戏
    this.initGame()
  },

  initGame() {
    // 生成卡片对
    const pairs = this.data.gridSize * this.data.gridSize / 2
    const values: number[] = []
    
    // 使用图标而不是数字，更有趣
    const icons = ['🎮', '🎯', '🎨', '🎪', '🎭', '🎬', '🎤', '🎧', '🎸', '🎺', '🎻', '🥁', '🎲', '🎰', '🎳', '🏀']
    
    for (let i = 0; i < pairs; i++) {
      values.push(i)
      values.push(i)
    }

    // 打乱顺序（Fisher-Yates 洗牌算法）
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]]
    }

    // 创建卡片
    const cards = values.map((value, index) => ({
      id: index,
      value: value,
      icon: icons[value] || (value + 1).toString(),
      flipped: false,
      matched: false
    }))

    this.setData({
      cards: cards,
      score: 0,
      moves: 0,
      flippedCards: [],
      canFlip: true,
      gameStatus: 'ready'
    })
  },

  startGame() {
    this.setData({
      gameStatus: 'playing'
    })
  },

  onCardTap(e: any) {
    if (this.data.gameStatus !== 'playing' || !this.data.canFlip) return

    const cardId = parseInt(e.currentTarget.dataset.cardId)
    const card = this.data.cards.find(c => c.id === cardId)

    if (!card || card.flipped || card.matched) return

    // 翻牌
    const cards = this.data.cards.map(c => 
      c.id === cardId ? { ...c, flipped: true } : c
    )

    const flippedCards = [...this.data.flippedCards, cardId]

    this.setData({
      cards: cards,
      flippedCards: flippedCards
    })

    // 检查是否翻了两张牌
    if (flippedCards.length === 2) {
      this.setData({
        canFlip: false
      })

      const [firstId, secondId] = flippedCards
      const firstCard = cards.find(c => c.id === firstId)!
      const secondCard = cards.find(c => c.id === secondId)!

      if (firstCard.value === secondCard.value) {
        // 匹配成功
        setTimeout(() => {
          const updatedCards = cards.map(c => 
            flippedCards.includes(c.id) ? { ...c, matched: true, flipped: true } : c
          )

          this.setData({
            cards: updatedCards,
            flippedCards: [],
            canFlip: true,
            score: this.data.score + 10,
            moves: this.data.moves + 1
          })

          // 检查游戏是否完成
          setTimeout(() => {
            if (updatedCards.every(c => c.matched)) {
              this.gameOver()
            }
          }, 200)
        }, 500)
      } else {
        // 匹配失败，翻回去
        setTimeout(() => {
          const resetCards = cards.map(c => 
            flippedCards.includes(c.id) && !c.matched 
              ? { ...c, flipped: false } 
              : c
          )

          this.setData({
            cards: resetCards,
            flippedCards: [],
            canFlip: true,
            moves: this.data.moves + 1
          })
        }, 1200)
      }
    }
  },

  gameOver() {
    this.setData({
      gameStatus: 'gameover'
    })

    wx.showModal({
      title: '恭喜完成！',
      content: `得分: ${this.data.score}\n移动次数: ${this.data.moves}`,
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

  restart() {
    this.initGame()
  }
})
