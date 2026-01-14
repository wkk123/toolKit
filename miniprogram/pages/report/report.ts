// report.ts
Page({
  data: {
    reportType: '',
    hasIssue: false,
    issues: [] as string[],
    testDate: '',
    screenTypeName: '',
    deviceName: 'iPhone 13 Pro', // 设备名称
    screenType: 'OLED', // 屏幕类型
    healthScore: 85, // 健康评分
    healthScorePercent: 85, // 健康评分百分比
    indicators: [
      {
        name: '烧屏风险',
        value: '低',
        level: 'good'
      },
      {
        name: '色彩均匀度',
        value: '良好',
        level: 'good'
      },
      {
        name: '亮度均匀度',
        value: '优秀',
        level: 'excellent'
      },
      {
        name: '坏点数量',
        value: '0个',
        level: 'excellent'
      },
      {
        name: '响应速度',
        value: '正常',
        level: 'good'
      }
    ],
    suggestions: [] as string[],
    showInterstitialAd: false, // 是否显示插屏广告（已禁用）
    recommendations: [
      {
        icon: '📱',
        name: '屏幕保护膜',
        desc: '高清防指纹'
      },
      {
        icon: '📐',
        name: '手机支架',
        desc: '可调节角度'
      },
      {
        icon: '💡',
        name: '护眼台灯',
        desc: '减少屏幕反光'
      }
    ]
  },

  onLoad(options: any) {
    const type = options.type || 'quick'
    const hasIssue = options.hasIssue === 'true'
    let issues: string[] = []
    
    try {
      issues = JSON.parse(decodeURIComponent(options.issues || '[]'))
    } catch (e) {
      issues = []
    }

    const typeNames: Record<string, string> = {
      'quick': '快速检测',
      'oled': 'OLED检测',
      'lcd': 'LCD检测'
    }

    const screenTypes: Record<string, string> = {
      'quick': 'OLED',
      'oled': 'OLED',
      'lcd': 'LCD'
    }

    // 计算健康评分
    const score = this.calculateHealthScore(hasIssue, issues, type)
    
    // 生成各项指标
    const indicators = this.generateIndicators(hasIssue, issues, type)
    
    // 生成专业建议
    const suggestions = this.generateSuggestions(hasIssue, issues, type, score)

    this.setData({
      reportType: type,
      hasIssue: hasIssue,
      issues: issues,
      testDate: this.formatDate(new Date()),
      screenTypeName: typeNames[type] || '快速检测',
      screenType: screenTypes[type] || 'OLED',
      healthScore: score,
      healthScorePercent: score,
      indicators: indicators,
      suggestions: suggestions
    })

    // 保存到历史记录
    this.saveToHistory()
  },

  // 计算健康评分
  calculateHealthScore(hasIssue: boolean, issues: string[], type: string): number {
    let score = 100
    
    // 根据问题数量扣分
    if (hasIssue) {
      score -= issues.length * 10
    }
    
    // 根据检测类型调整
    if (type === 'oled' && issues.some(issue => issue.includes('烧屏'))) {
      score -= 20
    }
    
    if (type === 'lcd' && issues.some(issue => issue.includes('漏光'))) {
      score -= 15
    }
    
    // 确保分数在0-100之间
    return Math.max(0, Math.min(100, score))
  },

  // 生成各项指标
  generateIndicators(hasIssue: boolean, issues: string[], type: string): any[] {
    const indicators: any[] = []
    
    if (type === 'oled') {
      // OLED指标
      const burnInRisk = issues.some(issue => issue.includes('烧屏') || issue.includes('残影')) ? '高' : '低'
      indicators.push({
        name: '烧屏风险',
        value: burnInRisk,
        level: burnInRisk === '高' ? 'bad' : 'good'
      })
    } else if (type === 'lcd') {
      // LCD指标
      const lightBleed = issues.some(issue => issue.includes('漏光')) ? '有漏光' : '无漏光'
      indicators.push({
        name: '漏光情况',
        value: lightBleed,
        level: lightBleed === '有漏光' ? 'bad' : 'good'
      })
    }
    
    // 通用指标
    const colorUniformity = issues.some(issue => issue.includes('色彩')) ? '一般' : '良好'
    const brightnessUniformity = issues.some(issue => issue.includes('亮度')) ? '一般' : '优秀'
    const deadPixels = issues.some(issue => issue.includes('坏点') || issue.includes('亮点')) ? '有坏点' : '0个'
    const responseSpeed = '正常'
    
    indicators.push(
      {
        name: '色彩均匀度',
        value: colorUniformity,
        level: colorUniformity === '良好' ? 'good' : 'normal'
      },
      {
        name: '亮度均匀度',
        value: brightnessUniformity,
        level: brightnessUniformity === '优秀' ? 'excellent' : 'normal'
      },
      {
        name: '坏点数量',
        value: deadPixels,
        level: deadPixels === '0个' ? 'excellent' : 'bad'
      },
      {
        name: '响应速度',
        value: responseSpeed,
        level: 'good'
      }
    )
    
    return indicators
  },

  // 生成专业建议
  generateSuggestions(hasIssue: boolean, issues: string[], type: string, score: number): string[] {
    const suggestions: string[] = []
    
    if (type === 'oled') {
      suggestions.push('建议开启自动亮度')
      if (issues.some(issue => issue.includes('烧屏'))) {
        suggestions.push('避免长时间显示静态图像')
        suggestions.push('定期更换壁纸和主题')
      }
      suggestions.push('避免长时间高亮度')
    } else if (type === 'lcd') {
      suggestions.push('避免屏幕受到物理撞击')
      if (issues.some(issue => issue.includes('漏光'))) {
        suggestions.push('注意屏幕边缘密封')
      }
      suggestions.push('定期清理屏幕表面')
    }
    
    if (score < 70) {
      suggestions.push('建议联系售后服务进行进一步检查')
    }
    
    suggestions.push('定期检测屏幕健康')
    
    return suggestions
  },

  formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  saveToHistory() {
    const history = wx.getStorageSync('testHistory') || []
    const report = {
      id: Date.now(),
      type: this.data.reportType,
      screenTypeName: this.data.screenTypeName,
      hasIssue: this.data.hasIssue,
      issues: this.data.issues,
      date: this.data.testDate,
      healthScore: this.data.healthScore
    }
    history.unshift(report)
    // 只保留最近50条记录
    if (history.length > 50) {
      history.splice(50)
    }
    wx.setStorageSync('testHistory', history)
  },

  // 分享报告
  shareReport() {
    // 广告已禁用，直接执行分享
    this.doShare()
  },

  // 保存PDF
  savePDF() {
    // 广告已禁用，直接执行保存
    this.doSavePDF()
  },

  // 关闭插屏广告
  closeInterstitialAd() {
    this.setData({
      showInterstitialAd: false
    })
  },

  // 执行分享
  doShare() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    })
  },

  // 执行保存PDF
  doSavePDF() {
    wx.showToast({
      title: 'PDF保存功能开发中',
      icon: 'none'
    })
  },

  // 查看推荐商品
  viewRecommendation(e: any) {
    const item = e.currentTarget.dataset.item
    wx.showModal({
      title: item.name,
      content: item.desc,
      showCancel: false
    })
  }
})
