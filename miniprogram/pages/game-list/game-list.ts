// game-list.ts
Page({
  data: {
    games: [
      {
        id: 'snake',
        icon: '🐍',
        title: '贪吃蛇',
        desc: '经典贪吃蛇游戏，挑战你的反应速度',
        color: '#4facfe',
        status: 'available' // coming-soon, available
      },
      {
        id: 'tetris',
        icon: '🧩',
        title: '俄罗斯方块',
        desc: '经典消除游戏，考验你的策略能力',
        color: '#43e97b',
        status: 'hidden'
      },
      {
        id: 'flappy',
        icon: '🐦',
        title: '像素鸟',
        desc: '简单有趣的飞行游戏，看你能飞多远',
        color: '#fa709a',
        status: 'hidden' // hidden, coming-soon, available
      },
      {
        id: 'memory',
        icon: '🧠',
        title: '记忆翻牌',
        desc: '训练你的记忆力，找出相同的卡片',
        color: '#feca57',
        status: 'available'
      },
      {
        id: 'sudoku',
        icon: '🔢',
        title: '数独',
        desc: '经典数独游戏，挑战你的逻辑思维',
        color: '#667eea',
        status: 'available'
      },
      {
        id: 'minesweeper',
        icon: '💣',
        title: '扫雷',
        desc: '经典扫雷游戏，考验你的推理能力',
        color: '#4facfe',
        status: 'available'
      },
      {
        id: 'tang-poetry',
        icon: '📜',
        title: '唐诗三百首',
        desc: '补全诗句，重温经典唐诗',
        color: '#667eea',
        status: 'available'
      },
      {
        id: 'hua-rong-dao',
        icon: '🧩',
        title: '华容道',
        desc: '经典华容道拼图，考验你的空间想象力',
        color: '#ff9a9e',
        status: 'available'
      },
      {
        id: 'wu-zi-qi',
        icon: '⚫',
        title: '五子棋',
        desc: '经典五子棋游戏，连成五子即可获胜',
        color: '#667eea',
        status: 'available'
      },
      {
        id: 'lian-lian-kan',
        icon: '🔗',
        title: '连连看',
        desc: '经典连连看游戏，消除所有图案',
        color: '#ffb347',
        status: 'available'
      },
    ]
  },

  onLoad() {
    // 可以在这里加载游戏数据
  },

  // 点击游戏项
  onGameTap(e: any) {
    const gameId = e.currentTarget.dataset.gameId
    const game = this.data.games.find((g: any) => g.id === gameId)
    
    if (!game) return

    // 隐藏状态的游戏不处理点击
    if (game.status === 'hidden') return

    if (game.status === 'coming-soon') {
      wx.showToast({
        title: '游戏开发中，敬请期待',
        icon: 'none',
        duration: 2000
      })
    } else {
      // 跳转到游戏页面
      wx.navigateTo({
        url: `/pages/games/${gameId}/${gameId}`
      })
    }
  }
})
