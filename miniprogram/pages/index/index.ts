// index.ts
Page({
  data: {
    // 主要功能按钮
    mainActions: [
      {
        icon: '🔍',
        title: '开始检测',
        desc: '选择屏幕类型进行专业检测',
        action: 'startTest',
        color: '#667eea'
      },
      {
        icon: '⚡',
        title: '快速检测',
        desc: '不确定屏幕类型？快速检测',
        action: 'quickTest',
        color: '#f5576c'
      },
      {
        icon: '🎨',
        title: '颜色测试',
        desc: '全屏显示纯色，检查是否有色斑',
        action: 'colorTest',
        color: '#43e97b'
      },
      {
        icon: '📋',
        title: '查看历史',
        desc: '查看以往的检测记录',
        action: 'history',
        color: '#4facfe'
      }
    ],
    // 菜单项（已移除：我的设备、检测记录、使用指南）
    menuItems: [],
    stats: {
      totalTests: 0,
      issueCount: 0
    }
  },

  onLoad() {
    this.loadStats()
  },

  onShow() {
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

  // 主要功能按钮点击
  handleMainAction(e: any) {
    const action = e.currentTarget.dataset.action
    switch (action) {
      case 'startTest':
        wx.navigateTo({
          url: '/pages/screen-type/screen-type'
        })
        break
      case 'quickTest':
        wx.navigateTo({
          url: '/pages/quick-test/quick-test'
        })
        break
      case 'colorTest':
        wx.navigateTo({
          url: '/pages/color-test/color-test'
        })
        break
      case 'history':
        wx.navigateTo({
          url: '/pages/history/history'
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
