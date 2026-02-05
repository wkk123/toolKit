// tang-poetry.ts

import { POEMS } from './poems'

// 类型定义
type GameStatus = 'ready' | 'playing' | 'completed'
type Difficulty = 'easy' | 'medium' | 'hard'

export interface Poem {
  title: string
  author: string
  content: string[]
  difficulty: Difficulty
}

interface Question {
  poem: Poem
  blanks: Array<{lineIndex: number, wordIndex: number, correctWord: string, wrongWord: string}>
  options: string[][]
  userAnswers: string[]
  displayLines: Array<{text: string, isBlank: boolean, blankIndex: number | null}>[]
}

// 唐诗三百首数据（已载入301首经典唐诗）
// 唐诗三百首数据已抽离到 poems.ts 中

Page({
  data: {
    currentQuestion: null as Question | null,
    currentPoemIndex: 0,
    score: 0,
    totalPoems: 0,
    gameStatus: 'ready' as GameStatus,
    difficulty: 'medium' as Difficulty,
    poems: [] as Poem[],
    time: 0,
    timeDisplay: '00:00',
    timer: null as ReturnType<typeof setInterval> | null
  },

  // 初始化游戏
  initGame() {
    this.stopTimer()
    
    // 按难度排序：easy -> medium -> hard，固定顺序
    const difficultyOrder: Record<Difficulty, number> = {
      'easy': 1,
      'medium': 2,
      'hard': 3
    }
    
    // 先按难度排序，再按标题排序（确保顺序固定）
    const sortedPoems = [...POEMS].sort((a, b) => {
      const diffA = difficultyOrder[a.difficulty]
      const diffB = difficultyOrder[b.difficulty]
      if (diffA !== diffB) {
        return diffA - diffB
      }
      // 同难度按标题排序
      return a.title.localeCompare(b.title, 'zh-CN')
    })
    
    // 检查是否有诗歌
    if (sortedPoems.length === 0) {
      wx.showToast({
        title: '暂无诗歌',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    this.setData({
      poems: sortedPoems,
      currentPoemIndex: 0,
      score: 0,
      totalPoems: sortedPoems.length,
      gameStatus: 'ready',
      time: 0,
      timeDisplay: '00:00',
      currentQuestion: null
    })
    
    this.loadNextQuestion()
  },

  // 打乱数组
  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  },

  // 加载下一题
  loadNextQuestion() {
    if (this.data.currentPoemIndex >= this.data.poems.length) {
      this.completeGame()
      return
    }

    const poem = this.data.poems[this.data.currentPoemIndex]
    if (!poem) {
      this.completeGame()
      return
    }
    
    const question = this.generateQuestion(poem)
    if (!question) {
      // 如果生成题目失败，跳过这首诗
      this.data.currentPoemIndex++
      this.loadNextQuestion()
      return
    }
    
    this.setData({
      currentQuestion: question
    })
  },

  // 生成题目
  generateQuestion(poem: Poem): Question | null {
    if (!poem || !poem.content || poem.content.length === 0) {
      return null
    }
    
    const blanks: Array<{lineIndex: number, wordIndex: number, correctWord: string, wrongWord: string}> = []
    const options: string[][] = []
    
    // 根据难度决定空白数量
    const blankCount = this.data.difficulty === 'easy' ? 1 : this.data.difficulty === 'medium' ? 2 : 3
    
    // 随机选择要填空的位置
    const allPositions: Array<{lineIndex: number, wordIndex: number}> = []
    poem.content.forEach((line, lineIndex) => {
      if (!line || line.length === 0) return
      const words = this.splitIntoWords(line)
      words.forEach((word, wordIndex) => {
        if (word && word.length > 0 && word.trim().length > 0) {
          allPositions.push({ lineIndex, wordIndex })
        }
      })
    })
    
    // 检查是否有可用的位置
    if (allPositions.length === 0) {
      return null
    }
    
    // 随机选择位置，但选择后按照阅读顺序（从上到下、从左到右）排序
    const shuffledPositions = this.shuffleArray(allPositions)
    const selectedPositions = shuffledPositions.slice(0, Math.min(blankCount, shuffledPositions.length))
    
    // 按照阅读顺序排序：先按行索引（从上到下），再按字索引（从左到右）
    selectedPositions.sort((a, b) => {
      if (a.lineIndex !== b.lineIndex) {
        return a.lineIndex - b.lineIndex  // 从上到下
      }
      return a.wordIndex - b.wordIndex    // 从左到右
    })
    
    selectedPositions.forEach((pos, blankIndex) => {
      const line = poem.content[pos.lineIndex]
      if (!line) return
      
      const words = this.splitIntoWords(line)
      const correctWord = words[pos.wordIndex]
      
      if (!correctWord) return
      
      // 生成选项（正确答案 + 干扰项）
      const wrongOptions = this.generateWrongOptions(correctWord, poem)
      const allOptions = this.shuffleArray([correctWord, ...wrongOptions])
      const finalOptions = allOptions.slice(0, 4)
      
      // 从干扰项中选择一个错误的字（确保不等于正确答案）
      const wrongWordOptions = finalOptions.filter(opt => opt !== correctWord)
      const wrongWord = wrongWordOptions.length > 0 
        ? wrongWordOptions[Math.floor(Math.random() * wrongWordOptions.length)]
        : wrongOptions.length > 0 
          ? wrongOptions[0] 
          : '错'
      
      blanks.push({
        lineIndex: pos.lineIndex,
        wordIndex: pos.wordIndex,
        correctWord: correctWord,
        wrongWord: wrongWord
      })
      
      options.push(finalOptions)
    })
    
    // 检查是否成功生成空白
    if (blanks.length === 0) {
      return null
    }
    
    // 生成显示行（用于渲染）
    // 空白位置显示错误的字，而不是显示空白
    const displayLines = poem.content.map((line, lineIndex) => {
      if (!line) return []
      const words = this.splitIntoWords(line)
      return words.map((word, wordIndex) => {
        const blankIndex = blanks.findIndex(b => b.lineIndex === lineIndex && b.wordIndex === wordIndex)
        if (blankIndex >= 0) {
          // 空白位置显示错误的字
          const blank = blanks[blankIndex]
          return {
            text: blank.wrongWord || '',
            isBlank: true,
            blankIndex: blankIndex
          }
        }
        return {
          text: word || '',
          isBlank: false,
          blankIndex: null
        }
      })
    })
    
    return {
      poem: poem,
      blanks: blanks,
      options: options,
      userAnswers: new Array(blanks.length).fill(''),
      displayLines: displayLines
    }
  },

  // 将诗句分割成字词
  splitIntoWords(line: string): string[] {
    if (!line) return []
    // 处理标点符号，保留字词（过滤掉空格和换行符）
    return line.split('').filter(char => {
      // 保留中文字符、标点符号，过滤空格和换行
      return char.trim().length > 0 && char !== '\n' && char !== '\r'
    })
  },

  // 生成错误选项
  generateWrongOptions(correctWord: string, poem: Poem): string[] {
    if (!correctWord) return []
    
    const wrongOptions: string[] = []
    const allWords = new Set<string>()
    
    // 从整首诗收集所有字
    if (poem && poem.content) {
      poem.content.forEach(line => {
        if (!line) return
        const words = this.splitIntoWords(line)
        words.forEach(word => {
          if (word && word !== correctWord && word.length > 0 && word.trim().length > 0) {
            allWords.add(word)
          }
        })
      })
    }
    
    // 从其他诗中收集字
    POEMS.forEach(p => {
      if (p && p.title !== poem.title && p.content) {
        p.content.forEach(line => {
          if (!line) return
          const words = this.splitIntoWords(line)
          words.forEach(word => {
            if (word && word !== correctWord && word.length > 0 && word.trim().length > 0) {
              allWords.add(word)
            }
          })
        })
      }
    })
    
    const wordArray = Array.from(allWords)
    if (wordArray.length === 0) {
      // 如果没有足够的干扰项，使用一些常见字
      return ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没', '看', '好', '自', '己', '这']
        .filter(word => word !== correctWord)
        .slice(0, 3)
    }
    
    const shuffled = this.shuffleArray(wordArray)
    return shuffled.slice(0, 3) // 返回3个干扰项
  },

  // 选择答案
  onOptionTap(e: WechatMiniprogram.TouchEvent) {
    if (this.data.gameStatus !== 'playing') {
      if (this.data.gameStatus === 'ready') {
        this.startGame()
      }
      return
    }

    const blankIndex = parseInt(e.currentTarget.dataset.blankIndex as string)
    const optionIndex = parseInt(e.currentTarget.dataset.optionIndex as string)
    
    if (isNaN(blankIndex) || isNaN(optionIndex)) return
    
    const question = this.data.currentQuestion
    if (!question) return
    
    const selectedOption = question.options[blankIndex][optionIndex]
    
    // 更新用户答案
    const userAnswers = [...question.userAnswers]
    userAnswers[blankIndex] = selectedOption
    
    // 更新显示行
    const displayLines = question.displayLines.map((line, lineIndex) => {
      return line.map(word => {
        if (word.isBlank && word.blankIndex === blankIndex) {
          return {
            ...word,
            text: selectedOption
          }
        }
        return word
      })
    })
    
    const updatedQuestion: Question = {
      ...question,
      userAnswers: userAnswers,
      displayLines: displayLines
    }
    
    this.setData({
      currentQuestion: updatedQuestion
    })
    
    // 检查是否全部填完
    if (userAnswers.length > 0 && userAnswers.every(answer => answer !== '')) {
      setTimeout(() => {
        this.checkAnswer()
      }, 500)
    }
  },

  // 检查答案
  checkAnswer() {
    const question = this.data.currentQuestion
    if (!question) return
    
    let correctCount = 0
    question.blanks.forEach((blank, index) => {
      if (question.userAnswers[index] === blank.correctWord) {
        correctCount++
      }
    })
    
    const isAllCorrect = correctCount === question.blanks.length
    
    if (isAllCorrect) {
      wx.showToast({
        title: '回答正确！',
        icon: 'success',
        duration: 1500
      })
      
      this.setData({
        score: this.data.score + 1
      })
      
      // 检查是否还有下一首
      const nextIndex = this.data.currentPoemIndex + 1
      if (nextIndex >= this.data.poems.length) {
        // 全部完成，延迟显示完成界面
        setTimeout(() => {
          this.completeGame()
        }, 2000)
      } else {
        // 进入下一题，显示下一首提示
        setTimeout(() => {
          const nextPoem = this.data.poems[nextIndex]
          if (nextPoem) {
            wx.showToast({
              title: `下一首：${nextPoem.title}`,
              icon: 'none',
              duration: 1500
            })
          }
          setTimeout(() => {
            this.data.currentPoemIndex++
            this.loadNextQuestion()
          }, 1800)
        }, 1800)
      }
    } else {
      wx.showToast({
        title: `答对 ${correctCount}/${question.blanks.length} 个`,
        icon: 'none',
        duration: 2000
      })
      
      // 显示正确答案
      setTimeout(() => {
        this.showCorrectAnswer()
      }, 2500)
    }
  },

  // 显示正确答案
  showCorrectAnswer() {
    const question = this.data.currentQuestion
    if (!question) return
    
    const correctAnswers = question.blanks.map(b => b.correctWord).join('、')
    wx.showModal({
      title: '正确答案',
      content: correctAnswers,
      showCancel: false,
      confirmText: '下一题',
      success: () => {
        this.data.currentPoemIndex++
        this.loadNextQuestion()
      }
    })
  },

  // 开始游戏
  startGame() {
    if (this.data.gameStatus === 'playing') return
    
    this.setData({
      gameStatus: 'playing'
    })
    
    this.data.timer = setInterval(() => {
      if (this.data.gameStatus === 'playing') {
        const newTime = this.data.time + 1
        this.setData({
          time: newTime,
          timeDisplay: this.formatTime(newTime)
        })
      }
    }, 1000)
  },

  // 停止计时器
  stopTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
      this.data.timer = null
    }
  },

  // 格式化时间
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  },

  // 完成游戏
  completeGame() {
    this.stopTimer()
    this.setData({
      gameStatus: 'completed'
    })
    
    const accuracy = this.data.totalPoems > 0 
      ? Math.round((this.data.score / this.data.totalPoems) * 100) 
      : 0
    
    // 庆祝动画效果
    wx.showToast({
      title: '🎉 恭喜通关！',
      icon: 'success',
      duration: 2000
    })
    
    // 延迟显示完成弹窗，让庆祝效果先显示
    setTimeout(() => {
      wx.showModal({
        title: '🎊 游戏成功！',
        content: `恭喜你完成了所有诗歌！\n\n完成数量: ${this.data.score}/${this.data.totalPoems}\n正确率: ${accuracy}%\n用时: ${this.data.timeDisplay}\n\n你真是太棒了！`,
        showCancel: true,
        cancelText: '返回',
        confirmText: '再来一局',
        success: (res) => {
          if (res.confirm) {
            this.initGame()
          } else {
            wx.navigateBack()
          }
        }
      })
    }, 2500)
  },

  // 选择难度
  onDifficultyChange(e: WechatMiniprogram.TouchEvent) {
    const difficulty = e.currentTarget.dataset.difficulty as Difficulty
    if (!difficulty) return
    
    this.setData({
      difficulty: difficulty
    })
    this.initGame()
  },

  // 重新开始
  restart() {
    this.initGame()
  },

  onLoad() {
    this.initGame()
  },

  onUnload() {
    this.stopTimer()
  }
})
