// profile.ts
Page({
  data: {
    userInfo: {
      nickName: '用户',
      avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
    },
    menuItems: [
      {
        icon: '📖',
        title: '预防指南',
        url: '/pages/prevention/prevention'
      },
      {
        icon: '⚙️',
        title: '设置',
        action: 'settings'
      },
      {
        icon: 'ℹ️',
        title: '关于',
        action: 'about'
      }
    ],
    stats: {
      totalTests: 0,
      issueCount: 0
    }
  },

  onLoad() {
    this.loadUserInfo()
    this.loadStats()
  },

  onShow() {
    this.loadStats()
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      })
    }
  },

  loadStats() {
    const history = wx.getStorageSync('testHistory') || []
    const issueCount = history.filter((item: any) => item.hasIssue).length
    this.setData({
      'stats.totalTests': history.length,
      'stats.issueCount': issueCount
    })
  },

  navigateTo(e: any) {
    const item = e.currentTarget.dataset.item
    if (item.url) {
      wx.navigateTo({
        url: item.url
      })
    } else if (item.action) {
      this.handleAction(item.action)
    }
  },

  handleAction(action: string) {
    if (action === 'settings') {
      wx.showToast({
        title: '设置功能开发中',
        icon: 'none'
      })
    } else if (action === 'about') {
      wx.showModal({
        title: '关于',
        content: '屏幕检测小程序\n版本 1.0.0\n帮助您检测和保护屏幕健康',
        showCancel: false
      })
    }
  }
})

