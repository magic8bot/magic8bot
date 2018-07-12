import { terminal, ScreenBuffer, Terminal, TextBuffer } from 'terminal-kit'

class Window {
  private readonly TITLE: string = 'Zenbot 5'
  private redrawTimeout: NodeJS.Timer = null

  private term: Terminal = terminal
  private screen: ScreenBuffer = ScreenBuffer.create({
    dst: this.term,
    width: this.term.width,
    height: this.term.height,
  })

  private header: ScreenBuffer = ScreenBuffer.create({
    dst: this.screen,
    height: 3,
    width: this.term.width * 2,
    noFill: true,
  })

  constructor() {
    this.term.hideCursor(true)
    this.term.fullscreen(true)
    this.term.grabInput(true)

    this.term.on('resize', () => this.draw())

    this.term.on('key', (name) => {
      if (name === 'CTRL_C') this.exit()
    })
  }

  private drawHeader() {
    const title = ` ${this.TITLE} - ${this.term.width} `
    const padding = Math.round((this.term.width - title.length) / 2)
    const paddedStr = '-'.repeat(padding - 1)

    this.header.moveTo(0, 0)
    this.header.put(null, paddedStr)
    this.header.put(null, ' ')
    this.header.put({ attr: { color: 'red', bold: true } }, this.TITLE)
    this.header.put(null, ' - ')
    this.header.put({ attr: { color: 'cyan', bold: true } }, String(this.term.width))
    this.header.put(null, ' ')
    this.header.put(null, paddedStr)
    this.header.draw()
  }

  draw() {
    clearTimeout(this.redrawTimeout)

    this.redrawTimeout = setTimeout(() => {
      this.header.clear()
      this.screen.clear()
      this.term.eraseDisplay()
      this.term.clear()

      setImmediate(() => {
        this.drawHeader()
        this.screen.draw()
      })
    }, 400)
  }

  private exit() {
    this.term.hideCursor(false)
    this.term.grabInput(false)
    this.term.fullscreen(false)
    this.term.clear()
    setTimeout(() => process.exit(), 100)
  }
}

export const window = new Window()
