// index.ts
Page({
  data: {
    // 主要功能按钮
    mainActions: [
      {
        icon: '🎨',
        title: '颜色测试',
        desc: '全屏显示纯色，检查是否有色斑',
        action: 'colorTest',
        color: '#43e97b'
      },
      {
        icon: '🎮',
        title: '小游戏',
        desc: '精选小游戏，轻松娱乐',
        action: 'gameList',
        color: '#ff6b6b'
      }
    ],
    // 保留一份完整的按钮配置，用于按日期过滤
    originalMainActions: [] as any[],
    // 菜单项（已移除：我的设备、检测记录、使用指南）
    menuItems: [],
    stats: {
      totalTests: 0,
      issueCount: 0
    }
  },

  onLoad() {
    // 首次进入首页时，记录原始按钮列表
    if (!this.data.originalMainActions || this.data.originalMainActions.length === 0) {
      this.setData({
        originalMainActions: this.data.mainActions
      })
    }
    // 根据日期决定是否显示“小游戏”入口
    this.updateMainActionsByDate()
    this.loadStats()
  },

  onShow() {
    // 每次返回首页时重新检查日期
    this.updateMainActionsByDate()
    this.loadStats()
  },

  loadStats() {
    const history = wx.getStorageSync('testHistory') || []
    const issueCount = history.filter((item: any) => item.hasIssue).length
    this.setData({
      'stats.totalTests': history.length,
      'stats.issueCount': issueCount
    })
  },

  // 根据固定日期（2026-02-10 后第三天）决定是否展示“小游戏”模块
  updateMainActionsByDate() {
    const UNLOCK_TIME = new Date(2026, 1, 13, 0, 0, 0).getTime() // 注意月份从 0 开始，1 表示 2 月
    const now = Date.now()
    const showMiniGame = now >= UNLOCK_TIME

    const all = this.data.originalMainActions && this.data.originalMainActions.length > 0
      ? this.data.originalMainActions
      : this.data.mainActions

    const mainActions = all.filter((item: any) => {
      if (item.action === 'gameList') {
        return showMiniGame
      }
      return true
    })

    this.setData({
      mainActions
    })
  },

  // 主要功能按钮点击
  handleMainAction(e: any) {
    const action = e.currentTarget.dataset.action
    switch (action) {
      case 'colorTest':
        wx.navigateTo({
          url: '/pages/color-test/color-test'
        })
        break
      case 'gameList':
        wx.navigateTo({
          url: '/pages/game-list/game-list'
        })
        break
    }
  },

  // 菜单项点击（已移除相关功能）
  handleMenuClick(e: any) {
    // 菜单项已移除
  },

  // 广告点击（示例）
  onAdClick() {
    // 广告点击处理
    console.log('广告被点击')
  }
})
