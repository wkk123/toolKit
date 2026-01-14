// quick-test.ts
Page({
  data: {
    currentStep: 0,
    testSteps: [
      {
        title: '纯白色全屏显示',
        desc: '检查屏幕是否有色斑、亮度是否均匀、边缘是否有漏光',
        color: '#FFFFFF',
        duration: 30, // 30秒
        observations: [
          '是否有色斑？',
          '亮度是否均匀？',
          '边缘是否有漏光？'
        ]
      },
      {
        title: '纯黑色全屏显示',
        desc: '检查屏幕是否有亮点、漏光现象',
        color: '#000000',
        duration: 30,
        observations: [
          '是否有亮点？',
          '边缘是否有漏光？',
          '黑色是否纯正？'
        ]
      },
      {
        title: '纯红色全屏显示',
        desc: '检查红色显示是否正常',
        color: '#FF0000',
        duration: 30,
        observations: [
          '红色是否均匀？',
          '是否有色差？',
          '是否有坏点？'
        ]
      },
      {
        title: '纯绿色全屏显示',
        desc: '检查绿色显示是否正常',
        color: '#00FF00',
        duration: 30,
        observations: [
          '绿色是否均匀？',
          '是否有色差？',
          '是否有坏点？'
        ]
      },
      {
        title: '纯蓝色全屏显示',
        desc: '检查蓝色显示是否正常',
        color: '#0000FF',
        duration: 30,
        observations: [
          '蓝色是否均匀？',
          '是否有色差？',
          '是否有坏点？'
        ]
      },
      {
        title: '灰度渐变显示',
        desc: '检查屏幕灰度显示是否正常',
        color: 'gradient',
        duration: 30,
        observations: [
          '渐变是否平滑？',
          '是否有色阶断层？',
          '是否有异常区域？'
        ]
      }
    ],
    totalDuration: 180, // 3分钟 = 180秒
    elapsedTime: 0, // 已用时间（秒）
    remainingTime: 180, // 剩余时间（秒）
    remainingTimeText: '3分0秒', // 剩余时间文本
    progress: 0, // 进度百分比
    isPaused: false, // 是否暂停
    currentTestTimer: 0, // 当前测试倒计时
    mainTimer: null as any, // 主定时器
    testTimer: null as any, // 测试定时器
    testResult: {
      hasIssue: false,
      issues: [] as string[]
    },
    showBannerAd: false // 是否显示横幅广告（已禁用）
  },

  onLoad() {
    this.startTest()
  },

  onUnload() {
    // 清理定时器
    this.clearTimers()
  },

  onHide() {
    // 页面隐藏时暂停
    this.pauseTest()
  },

  onShow() {
    // 页面显示时恢复（如果之前是暂停状态）
    if (this.data.isPaused && this.data.elapsedTime < this.data.totalDuration) {
      // 不自动恢复，需要用户手动点击继续
    }
  },

  // 清理定时器
  clearTimers() {
    if (this.data.mainTimer) {
      clearInterval(this.data.mainTimer)
    }
    if (this.data.testTimer) {
      clearInterval(this.data.testTimer)
    }
  },

  // 开始测试
  startTest() {
    this.setData({
      currentStep: 0,
      elapsedTime: 0,
      remainingTime: 180,
      remainingTimeText: '3分0秒',
      progress: 0,
      isPaused: false,
      testResult: {
        hasIssue: false,
        issues: []
      },
      showBannerAd: false
    })
    this.startMainTimer()
    this.startCurrentTest()
  },

  // 启动主定时器
  startMainTimer() {
    if (this.data.mainTimer) {
      clearInterval(this.data.mainTimer)
    }
    const timer = setInterval(() => {
      if (!this.data.isPaused) {
        const elapsed = this.data.elapsedTime + 1
        const remaining = this.data.totalDuration - elapsed
        const progress = Math.min((elapsed / this.data.totalDuration) * 100, 100)
        
        this.setData({
          elapsedTime: elapsed,
          remainingTime: remaining,
          remainingTimeText: this.formatTime(remaining),
          progress: progress
        })

        // 时间到，完成测试
        if (remaining <= 0) {
          clearInterval(timer)
          this.completeTest()
        }
      }
    }, 1000)
    this.setData({
      mainTimer: timer
    })
  },

  // 开始当前测试
  startCurrentTest() {
    const step = this.data.testSteps[this.data.currentStep]
    this.setData({
      currentTestTimer: step.duration,
      showBannerAd: false // 广告已禁用
    })
    this.startTestTimer()
  },

  // 启动测试定时器
  startTestTimer() {
    if (this.data.testTimer) {
      clearInterval(this.data.testTimer)
    }
    const timer = setInterval(() => {
      if (!this.data.isPaused) {
        const countdown = this.data.currentTestTimer - 1
        if (countdown <= 0) {
          clearInterval(timer)
          this.autoNextStep()
        } else {
          this.setData({
            currentTestTimer: countdown
          })
        }
      }
    }, 1000)
    this.setData({
      testTimer: timer
    })
  },

  // 自动下一步
  autoNextStep() {
    if (this.data.currentStep < this.data.testSteps.length - 1) {
      this.setData({
        currentStep: this.data.currentStep + 1
      })
      this.startCurrentTest()
    } else {
      this.completeTest()
    }
  },

  // 暂停/继续测试
  togglePause() {
    if (this.data.isPaused) {
      // 继续
      this.setData({
        isPaused: false
      })
      this.startMainTimer()
      this.startTestTimer()
    } else {
      // 暂停
      this.pauseTest()
    }
  },

  // 暂停测试
  pauseTest() {
    this.setData({
      isPaused: true
    })
    this.clearTimers()
  },

  // 跳过当前测试
  skipCurrentTest() {
    if (this.data.testTimer) {
      clearInterval(this.data.testTimer)
      this.setData({
        testTimer: null
      })
    }
    this.autoNextStep()
  },

  // 无问题
  noIssue() {
    this.autoNextStep()
  },

  // 有问题
  hasIssue() {
    const currentStep = this.data.testSteps[this.data.currentStep]
    const issues = [...this.data.testResult.issues, currentStep.title]
    this.setData({
      'testResult.issues': issues,
      'testResult.hasIssue': true
    })
    this.autoNextStep()
  },

  // 完成测试
  completeTest() {
    this.clearTimers()
    wx.redirectTo({
      url: `/pages/report/report?type=quick&hasIssue=${this.data.testResult.hasIssue}&issues=${encodeURIComponent(JSON.stringify(this.data.testResult.issues))}`
    })
  },

  // 格式化时间
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分${secs}秒`
  }
})
