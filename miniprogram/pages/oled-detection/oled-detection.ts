// oled-detection.ts
Page({
  data: {
    currentStep: 0,
    totalSteps: 5,
    testSteps: [
      {
        id: 1,
        title: '纯色检测',
        desc: '红/绿/蓝/白/黑',
        type: 'color-test',
        colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000'],
        currentColorIndex: 0,
        timer: 0,
        duration: 30 // 30秒
      },
      {
        id: 2,
        title: '残影测试',
        desc: '棋盘格→纯黑背景',
        type: 'burn-in-test',
        pattern: 'checkerboard', // checkerboard, black
        timer: 0,
        duration: 30
      },
      {
        id: 3,
        title: 'UI元素模拟',
        desc: '状态栏/导航键',
        type: 'ui-simulation',
        timer: 0,
        duration: 30
      },
      {
        id: 4,
        title: '灰度渐变',
        desc: '256级灰阶检测',
        type: 'grayscale',
        timer: 0,
        duration: 30
      },
      {
        id: 5,
        title: '文字残影',
        desc: '滚动文字检测',
        type: 'text-burn',
        timer: 0,
        duration: 30
      }
    ],
    testResult: {
      hasIssue: false,
      issues: [] as string[]
    },
    showInterstitialAd: false, // 是否显示插屏广告（已禁用）
    countdown: 0, // 倒计时
    timer: null as any // 定时器
  },

  onLoad() {
    this.startTest()
  },

  onUnload() {
    // 清理定时器
    if (this.data.timer) {
      clearInterval(this.data.timer)
    }
  },

  startTest() {
    this.setData({
      currentStep: 0,
      testResult: {
        hasIssue: false,
        issues: []
      },
      showInterstitialAd: false
    })
    this.startCurrentTest()
  },

  // 开始当前测试
  startCurrentTest() {
    const step = this.data.testSteps[this.data.currentStep]
    this.setData({
      countdown: step.duration
    })
    this.startTimer()
  },

  // 启动定时器
  startTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
    }
    const timer = setInterval(() => {
      const countdown = this.data.countdown - 1
      if (countdown <= 0) {
        clearInterval(timer)
        this.setData({
          timer: null,
          countdown: 0
        })
        // 测试完成，显示插屏广告
        this.showInterstitialAdBeforeNext()
      } else {
        this.setData({
          countdown: countdown
        })
      }
    }, 1000)
    this.setData({
      timer: timer
    })
  },

  // 显示插屏广告（开始下一个测试前）
  showInterstitialAdBeforeNext() {
    // 广告已禁用，直接进入下一步
    this.autoNextStep()
  },

  // 关闭插屏广告
  closeInterstitialAd() {
    this.setData({
      showInterstitialAd: false
    })
    this.autoNextStep()
  },

  // 自动进入下一步
  autoNextStep() {
    if (this.data.currentStep < this.data.totalSteps - 1) {
      this.setData({
        currentStep: this.data.currentStep + 1
      })
      this.startCurrentTest()
    } else {
      this.completeTest()
    }
  },

  // 手动下一步
  nextStep() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
      this.setData({
        timer: null
      })
    }
    if (this.data.currentStep < this.data.totalSteps - 1) {
      this.setData({
        currentStep: this.data.currentStep + 1,
        countdown: 0
      })
      this.showInterstitialAdBeforeNext()
    } else {
      this.completeTest()
    }
  },

  prevStep() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
      this.setData({
        timer: null
      })
    }
    if (this.data.currentStep > 0) {
      this.setData({
        currentStep: this.data.currentStep - 1,
        countdown: 0
      })
      this.startCurrentTest()
    }
  },

  // 切换纯色检测的颜色
  switchColor() {
    const step = this.data.testSteps[this.data.currentStep]
    if (step.type === 'color-test') {
      const nextIndex = (step.currentColorIndex + 1) % step.colors.length
      this.setData({
        [`testSteps[${this.data.currentStep}].currentColorIndex`]: nextIndex
      })
    }
  },

  // 切换残影测试模式
  switchBurnInPattern() {
    const step = this.data.testSteps[this.data.currentStep]
    if (step.type === 'burn-in-test') {
      const nextPattern = step.pattern === 'checkerboard' ? 'black' : 'checkerboard'
      this.setData({
        [`testSteps[${this.data.currentStep}].pattern`]: nextPattern
      })
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
      url: `/pages/report/report?type=oled&hasIssue=${this.data.testResult.hasIssue}&issues=${encodeURIComponent(JSON.stringify(this.data.testResult.issues))}`
    })
  },

  // 查看预防指南
  viewPrevention() {
    wx.navigateTo({
      url: '/pages/prevention/prevention'
    })
  }
})
