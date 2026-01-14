// history.ts
Page({
  data: {
    devices: [
      {
        id: 'device1',
        name: 'iPhone 13 Pro',
        type: 'OLED'
      },
      {
        id: 'device2',
        name: 'iPad Pro 2021',
        type: 'LCD'
      },
      {
        id: 'device3',
        name: '小米11 Ultra',
        type: 'OLED'
      }
    ],
    historyList: [] as any[],
    recentHistory: [] as any[], // 最近检测记录
    trendData: [] as any[], // 趋势数据
    scoreChange: 0, // 分数变化
    scoreChangeAbs: 0, // 分数变化绝对值
    showBannerAd: false, // 是否显示横幅广告（已禁用）
    showChartAd: false // 是否显示图表广告（已禁用）
  },

  onLoad() {
    this.loadHistory()
    this.loadDevices()
  },

  onShow() {
    this.loadHistory()
  },

  // 加载设备列表
  loadDevices() {
    // 从历史记录中提取设备信息
    const history = wx.getStorageSync('testHistory') || []
    const deviceMap = new Map()
    
    history.forEach((item: any) => {
      if (item.deviceName) {
        if (!deviceMap.has(item.deviceName)) {
          deviceMap.set(item.deviceName, {
            id: `device_${item.deviceName}`,
            name: item.deviceName,
            type: item.screenType || 'OLED'
          })
        }
      }
    })

    // 如果有设备信息，使用实际数据，否则使用默认数据
    if (deviceMap.size > 0) {
      this.setData({
        devices: Array.from(deviceMap.values())
      })
    }
  },

  // 加载历史记录
  loadHistory() {
    const history = wx.getStorageSync('testHistory') || []
    
    // 获取最近4条记录
    const recent = history.slice(0, 4).map((item: any) => {
      const date = this.formatDateShort(item.date)
      const score = item.healthScore || this.calculateScore(item)
      return {
        ...item,
        dateShort: date,
        score: score
      }
    })

    // 生成趋势数据（最近10条）
    const trend = history.slice(0, 10).map((item: any) => {
      return {
        date: this.formatDateShort(item.date),
        score: item.healthScore || this.calculateScore(item)
      }
    }).reverse()

    // 计算分数变化
    let scoreChange = 0
    let scoreChangeAbs = 0
    if (trend.length >= 2) {
      scoreChange = trend[trend.length - 1].score - trend[0].score
      scoreChangeAbs = Math.abs(scoreChange)
    }

    this.setData({
      historyList: history,
      recentHistory: recent,
      trendData: trend,
      scoreChange: scoreChange,
      scoreChangeAbs: scoreChangeAbs
    })

    // 广告已禁用
    // if (trend.length > 0 && Math.random() > 0.5) {
    //   this.setData({
    //     showChartAd: true
    //   })
    // }
  },

  // 计算分数（如果没有存储）
  calculateScore(item: any): number {
    let score = 100
    if (item.hasIssue) {
      score -= item.issues.length * 10
    }
    return Math.max(0, Math.min(100, score))
  },

  // 格式化日期（短格式）
  formatDateShort(dateStr: string): string {
    if (!dateStr) return ''
    const date = new Date(dateStr.replace(/-/g, '/'))
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}-${day}`
  },

  // 查看详情
  viewDetail(e: any) {
    const item = e.currentTarget.dataset.item
    wx.navigateTo({
      url: `/pages/report/report?type=${item.type}&hasIssue=${item.hasIssue}&issues=${encodeURIComponent(JSON.stringify(item.issues || []))}`
    })
  },

  // 重新检测
  reTest() {
    wx.navigateTo({
      url: '/pages/screen-type/screen-type'
    })
  },

  // 查看建议
  viewSuggestions() {
    wx.navigateTo({
      url: '/pages/prevention/prevention'
    })
  },

  // 导出所有记录
  exportRecords() {
    wx.showModal({
      title: '导出记录',
      content: '导出功能开发中，敬请期待',
      showCancel: false
    })
  },

  // 设置提醒检测
  setReminder() {
    wx.showModal({
      title: '设置提醒',
      content: '提醒功能开发中，敬请期待',
      showCancel: false
    })
  }
})
