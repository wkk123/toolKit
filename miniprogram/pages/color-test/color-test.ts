// color-test.ts
Page({
  data: {
    colors: [
      {
        name: '红',
        value: '#FF0000'
      },
      {
        name: '绿',
        value: '#00FF00'
      },
      {
        name: '蓝',
        value: '#0000FF'
      },
      {
        name: '白',
        value: '#FFFFFF'
      },
      {
        name: '灰',
        value: '#808080'
      }
    ],
    currentColorIndex: 0,
    showTip: true // 显示提示弹框
  },

  onLoad() {
    // 显示提示弹框
    this.setData({
      showTip: true
    })
    // 隐藏导航栏，实现全屏
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: this.data.colors[this.data.currentColorIndex].value,
      animation: {
        duration: 0,
        timingFunc: 'easeIn'
      }
    })
  },

  onShow() {
    // 每次显示时显示提示弹框
    this.setData({
      showTip: true
    })
    // 每次显示时更新导航栏颜色
    this.updateNavigationBar()
  },

  // 关闭提示弹框
  closeTip() {
    this.setData({
      showTip: false
    })
  },

  // 更新导航栏颜色
  updateNavigationBar() {
    const currentColor = this.data.colors[this.data.currentColorIndex].value
    // 根据颜色亮度决定文字颜色
    const textColor = this.getTextColor(currentColor)
    wx.setNavigationBarColor({
      frontColor: textColor,
      backgroundColor: currentColor,
      animation: {
        duration: 300,
        timingFunc: 'easeIn'
      }
    })
  },

  // 根据背景色决定文字颜色
  getTextColor(backgroundColor: string): string {
    // 简单的亮度判断
    if (backgroundColor === '#FFFFFF' || backgroundColor === '#00FF00') {
      return '#000000' // 白色和绿色用黑色文字
    }
    return '#ffffff' // 其他颜色用白色文字
  },

  // 点击屏幕切换颜色
  switchColor() {
    const nextIndex = (this.data.currentColorIndex + 1) % this.data.colors.length
    this.setData({
      currentColorIndex: nextIndex
    })
    // 更新导航栏颜色
    this.updateNavigationBar()
  }
})
