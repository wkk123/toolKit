// screen-type.ts
Page({
  data: {
    // 设备品牌列表
    brands: [
      {
        id: 'apple',
        name: '苹果 iPhone',
        screenType: 'oled', // 大部分是OLED
        icon: '🍎'
      },
      {
        id: 'samsung',
        name: '三星 Galaxy',
        screenType: 'oled',
        icon: '📱'
      },
      {
        id: 'huawei',
        name: '华为/荣耀',
        screenType: 'oled',
        icon: '🇨🇳'
      },
      {
        id: 'xiaomi',
        name: '小米/红米',
        screenType: 'mixed', // 混合
        icon: '📱'
      },
      {
        id: 'oppo',
        name: 'OPPO/realme',
        screenType: 'oled',
        icon: '📱'
      },
      {
        id: 'vivo',
        name: 'vivo/iQOO',
        screenType: 'oled',
        icon: '📱'
      },
      {
        id: 'other',
        name: '其他品牌',
        screenType: 'unknown',
        icon: '❓'
      }
    ],
    // 手动选择技术类型
    techTypes: [
      {
        id: 'oled',
        name: 'OLED屏幕检测',
        desc: 'AMOLED/柔性OLED',
        detail: '针对烧屏问题',
        icon: '⚫'
      },
      {
        id: 'lcd',
        name: 'LCD屏幕检测',
        desc: 'IPS/TFT/LTPS',
        detail: '针对背光问题',
        icon: '⚫'
      }
    ],
    showAd: false, // 是否显示广告（已禁用）
    adWatched: false // 是否已观看广告
  },

  onLoad() {
    // 页面加载
  },

  // 选择品牌
  selectBrand(e: any) {
    const brand = e.currentTarget.dataset.brand
    const screenType = brand.screenType

    if (screenType === 'unknown' || screenType === 'mixed') {
      // 需要手动选择
      wx.showModal({
        title: '提示',
        content: '该品牌设备屏幕类型多样，请手动选择屏幕技术类型',
        showCancel: false
      })
      return
    }

    // 保存选择的类型
    wx.setStorageSync('lastSelectedType', screenType)
    // 直接跳转到对应检测页面
    this.navigateToDetection(screenType)
  },

  // 手动选择技术类型
  selectTechType(e: any) {
    const type = e.currentTarget.dataset.type
    // 保存选择的类型
    wx.setStorageSync('lastSelectedType', type)
    this.navigateToDetection(type)
  },

  // 导航到检测页面
  navigateToDetection(type: string) {
    // 检查是否需要观看广告
    if (!this.data.adWatched && Math.random() > 0.5) {
      // 50%概率显示广告
      this.setData({
        showAd: true
      })
      return
    }

    // 直接跳转
    this.goToDetectionPage(type)
  },

  // 跳转到检测页面
  goToDetectionPage(type: string) {
    if (type === 'oled') {
      wx.navigateTo({
        url: '/pages/oled-detection/oled-detection'
      })
    } else if (type === 'lcd') {
      wx.navigateTo({
        url: '/pages/lcd-detection/lcd-detection'
      })
    }
  },

  // 观看激励视频广告
  watchAd() {
    // 这里应该调用微信广告API
    // 示例：模拟观看广告
    wx.showLoading({
      title: '加载广告中...'
    })

    // 模拟广告加载和播放
    setTimeout(() => {
      wx.hideLoading()
      this.setData({
        showAd: false,
        adWatched: true
      })
      wx.showToast({
        title: '广告观看完成',
        icon: 'success'
      })
      // 继续之前的操作
      const lastSelectedType = wx.getStorageSync('lastSelectedType') || 'oled'
      this.goToDetectionPage(lastSelectedType)
    }, 2000)
  },

  // 跳过广告
  skipAd() {
    this.setData({
      showAd: false
    })
    // 直接跳转到快速检测
    wx.navigateTo({
      url: '/pages/quick-test/quick-test'
    })
  }
})
