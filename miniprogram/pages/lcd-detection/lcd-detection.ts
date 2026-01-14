// lcd-detection.ts
Page({
  data: {
    currentStep: 0,
    totalSteps: 4,
    testSteps: [
      {
        id: 1,
        title: '背光均匀度',
        desc: '全屏灰色检测',
        type: 'backlight-uniformity',
        color: '#808080', // 灰色
        timer: 0,
        duration: 30
      },
      {
        id: 2,
        title: '漏光检测',
        desc: '全屏黑色+暗室',
        type: 'light-bleed',
        color: '#000000', // 黑色
        timer: 0,
        duration: 30
      },
      {
        id: 3,
        title: '坏点检测',
        desc: '黑白红绿蓝全屏',
        type: 'dead-pixel',
        colors: ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF'], // 黑白红绿蓝
        currentColorIndex: 0,
        timer: 0,
        duration: 30
      },
      {
        id: 4,
        title: '色彩均匀度',
        desc: '全屏纯色检测',
        type: 'color-uniformity',
        colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'], // 红绿蓝黄紫青
        currentColorIndex: 0,
        timer: 0,
        duration: 30
      }
    ],
    testResult: {
      hasIssue: false,
      issues: [] as string[]
    },
    showVideoAd: false, // 是否显示视频广告（已禁用）
    videoAdCountdown: 15, // 视频广告倒计时
    videoAdTimer: null as any, // 视频广告定时器
    timer: null as any // 测试定时器
  },

  onLoad() {
    this.startTest()
  },

  onUnload() {
    // 清理定时器
    if (this.data.timer) {
      clearInterval(this.data.timer)
    }
    if (this.data.videoAdTimer) {
      clearInterval(this.data.videoAdTimer)
    }
  },

  startTest() {
    this.setData({
      currentStep: 0,
      testResult: {
        hasIssue: false,
        issues: []
      },
      showVideoAd: false
    })
    this.startCurrentTest()
  },

  // 开始当前测试
  startCurrentTest() {
    // 广告已禁用，直接开始测试
    this.startTestTimer()
  },

  // 显示视频广告
  showVideoAd() {
    this.setData({
      showVideoAd: true,
      videoAdCountdown: 15
    })
    this.startVideoAdTimer()
  },

  // 视频广告倒计时
  startVideoAdTimer() {
    if (this.data.videoAdTimer) {
      clearInterval(this.data.videoAdTimer)
    }
    const timer = setInterval(() => {
      const countdown = this.data.videoAdCountdown - 1
      if (countdown <= 0) {
        clearInterval(timer)
        this.closeVideoAd()
      } else {
        this.setData({
          videoAdCountdown: countdown
        })
      }
    }, 1000)
    this.setData({
      videoAdTimer: timer
    })
  },

  // 关闭视频广告
  closeVideoAd() {
    if (this.data.videoAdTimer) {
      clearInterval(this.data.videoAdTimer)
      this.setData({
        videoAdTimer: null
      })
    }
    this.setData({
      showVideoAd: false
    })
    this.startTestTimer()
  },

  // 跳过视频广告
  skipVideoAd() {
    this.closeVideoAd()
  },

  // 启动测试定时器
  startTestTimer() {
    const step = this.data.testSteps[this.data.currentStep]
    if (this.data.timer) {
      clearInterval(this.data.timer)
    }
    // 测试不需要倒计时，用户可以随时继续
  },

  // 切换坏点检测颜色
  switchDeadPixelColor() {
    const step = this.data.testSteps[this.data.currentStep]
    if (step.type === 'dead-pixel') {
      const nextIndex = (step.currentColorIndex + 1) % step.colors.length
      this.setData({
        [`testSteps[${this.data.currentStep}].currentColorIndex`]: nextIndex
      })
    }
  },

  // 切换色彩均匀度颜色
  switchColorUniformity() {
    const step = this.data.testSteps[this.data.currentStep]
    if (step.type === 'color-uniformity') {
      const nextIndex = (step.currentColorIndex + 1) % step.colors.length
      this.setData({
        [`testSteps[${this.data.currentStep}].currentColorIndex`]: nextIndex
      })
    }
  },

  nextStep() {
    if (this.data.currentStep < this.data.totalSteps - 1) {
      this.setData({
        currentStep: this.data.currentStep + 1
      })
      this.startCurrentTest()
    } else {
      this.completeTest()
    }
  },

  prevStep() {
    if (this.data.currentStep > 0) {
      this.setData({
        currentStep: this.data.currentStep - 1
      })
      this.startCurrentTest()
    }
  },

  reportIssue() {
    const currentStep = this.data.testSteps[this.data.currentStep]
    const issues = [...this.data.testResult.issues, currentStep.title]
    this.setData({
      'testResult.issues': issues,
      'testResult.hasIssue': true
    })
    this.nextStep()
  },

  completeTest() {
    wx.redirectTo({
      url: `/pages/report/report?type=lcd&hasIssue=${this.data.testResult.hasIssue}&issues=${encodeURIComponent(JSON.stringify(this.data.testResult.issues))}`
    })
  },

  // 打开坏点修复软件推荐
  openDeadPixelFix() {
    wx.showModal({
      title: '坏点修复软件',
      content: '推荐使用：Dead Pixel Test、Screen Test等专业工具进行坏点修复',
      showCancel: false
    })
  },

  // 打开屏幕校准工具
  openScreenCalibration() {
    wx.showModal({
      title: '屏幕校准工具',
      content: '推荐使用：Display Calibration、Color Calibration等工具进行屏幕校准',
      showCancel: false
    })
  }
})
