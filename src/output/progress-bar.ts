import { ScreenBuffer } from 'terminal-kit'

export class ProgressBar {
  private readonly barBuffer: ScreenBuffer

  private innerWidth: number
  private progress: number = null

  private isDone: boolean = false

  constructor(dst: ScreenBuffer, private readonly title: string) {
    this.innerWidth = dst.width - 4 - title.length

    this.barBuffer = ScreenBuffer.create({ dst, width: dst.width, height: 1 })
  }

  private white = (str) => this.barBuffer.put({ attr: { dim: this.isDone, color: 'cyan' } }, str)
  private blue = (str) => this.barBuffer.put({ attr: { dim: this.isDone, color: 'blue' } }, str)
  private yellow = (str) => this.barBuffer.put({ attr: { dim: this.isDone, color: 'yellow' } }, str)
  private whiteBold = (str) => this.barBuffer.put({ attr: { dim: this.isDone, color: 'white', bold: true } }, str)
  private noStyle = (str) => this.barBuffer.put({ attr: { dim: this.isDone } }, str)

  update(progress: number) {
    this.progress = progress < 0 ? 0 : progress

    this.draw()
  }

  done() {
    this.isDone = true
    this.update(1)
  }

  clear() {
    this.barBuffer.clear()
  }

  force() {
    this.draw()
  }

  private draw() {
    this.barBuffer.moveTo(0, 0)

    const percent = ('   ' + Math.round((this.progress || 0) * 100) + '%').slice(-4)

    const innerBarSize = this.innerWidth - percent.length
    const progressSize = !this.progress ? 0 : Math.round(innerBarSize * Math.max(Math.min(this.progress, 1), 0))
    const voidSize = innerBarSize - progressSize

    const voidBar = ' '.repeat(voidSize)

    const progressBar = !progressSize ? '' : `${'='.repeat(progressSize - 1)}>`

    this.whiteBold(this.title)

    if (!this.progress) this.noStyle(' ')
    else this.blue(' [')

    this.white(progressBar)
    this.noStyle(voidBar)

    if (!this.progress) this.noStyle(' ')
    else this.blue('] ')

    this.yellow(percent)
    this.barBuffer.draw()
  }

  private getEtaTimeString(elapsedEtaTime: number, progress: number) {
    const remainingTime = (elapsedEtaTime * ((1 - progress) / progress)) / 1000

    if (remainingTime < 10) {
      return Math.round(remainingTime * 10) / 10 + 's'
    } else if (remainingTime < 120) {
      return Math.round(remainingTime) + 's'
    } else if (remainingTime < 7200) {
      return Math.round(remainingTime / 60) + 'min'
    } else if (remainingTime < 172800) {
      return Math.round(remainingTime / 3600) + 'hours'
    } else if (remainingTime < 31536000) {
      return Math.round(remainingTime / 86400) + 'days'
    } else {
      return 'few years'
    }
  }
}
