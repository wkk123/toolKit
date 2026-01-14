// prevention.ts
Page({
  data: {
    selectedType: 'oled', // 当前选择的屏幕类型：oled 或 lcd
    oledTips: [
      '自动亮度调节',
      '深色模式使用',
      '动态壁纸设置',
      '导航栏隐藏'
    ],
    lcdTips: [
      '避免长时间高亮度',
      '定期更换壁纸',
      '适当降低对比度'
    ],
    tools: [
      {
        icon: '🎬',
        name: '烧屏修复视频',
        desc: '学习如何修复OLED烧屏问题',
        type: 'video'
      },
      {
        icon: '🔄',
        name: '像素刷新工具',
        desc: '专业像素刷新软件推荐',
        type: 'tool'
      },
      {
        icon: '📱',
        name: '屏幕校准APP',
        desc: '屏幕色彩校准应用',
        type: 'app'
      }
    ],
    showBannerAd: false // 是否显示信息流广告（已禁用）
  },

  onLoad() {
    // 页面加载
  },

  // 选择屏幕类型
  selectType(e: any) {
    const type = e.currentTarget.dataset.type
    this.setData({
      selectedType: type
    })
  },

  // 查看工具详情
  viewTool(e: any) {
    const tool = e.currentTarget.dataset.tool
    wx.showModal({
      title: tool.name,
      content: tool.desc,
      showCancel: false
    })
  },

  // 升级专业版
  upgradePro() {
    wx.showModal({
      title: '升级专业版',
      content: '专业版功能开发中，敬请期待',
      showCancel: false
    })
  }
})
