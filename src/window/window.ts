import fs from 'fs'
import path from 'path'
import { EventEmitter } from 'events'
import { terminal, ScreenBuffer, Terminal } from 'terminal-kit'

import { ProgressBar } from './progress-bar'

const { version } = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'UTF-8'))

class Window {
  public screenEvents: EventEmitter = new EventEmitter()

  private TITLE: string = `Zenbot ${version}`
  private redrawTimeout: NodeJS.Timer = null

  private term: Terminal = terminal
  private screen: ScreenBuffer
  private header: ScreenBuffer
  private progressArea: ScreenBuffer
  private footer: ScreenBuffer

  private progressBars: ScreenBuffer[] = []

  private lastWidth: number = this.term.width
  private lastStatus: string = null

  constructor() {
    this.term.hideCursor(true)
    this.term.fullscreen(true)
    this.term.grabInput(true)

    this.createScreen()
    this.createHeader()
    this.createProgressArea()
    this.createFooter()

    this.term.on('resize', () => {
      if (this.term.width > this.lastWidth) {
        this.lastWidth = this.term.width
        this.nuke()
      } else {
        this.draw()
      }
    })

    this.term.on('key', (name) => {
      if (name === 'CTRL_C') this.exit()
    })
  }

  draw() {
    clearTimeout(this.redrawTimeout)

    this.redrawTimeout = setTimeout(() => {
      this.clear()
      this.drawHeader()

      this.drawFooter()
      this.screen.draw()
    }, 100)
  }

  addProgressBar(title: string) {
    const dst = this.progressArea
    const y = this.progressBars.length

    const buffer = ScreenBuffer.create({
      dst,
      x: 0,
      y: 0 + y,
      width: this.term.width,
      height: 1,
      wrap: false,
    })

    this.progressBars.push(buffer)

    dst.resize({
      height: this.progressBars.length,
      width: this.term.width,
      y: this.term.height - (2 + this.progressBars.length),
      x: 0,
    })

    const bar = new ProgressBar(buffer, title)
    // bar.update(0)

    buffer.draw()
    dst.draw()
    this.screen.draw()

    const scopedActions = (bar, buffer) => {
      return {
        update: (percent: number) => {
          bar.update(percent)
          buffer.draw()
          dst.draw()
          this.screen.draw()
        },
        done: () => {
          bar.done()
          buffer.draw()
          dst.draw()
          this.setStatus(`${title} done`)
          this.screen.draw()
        },
      }
    }

    return scopedActions(bar, buffer)
  }

  setStatus(msg: string) {
    // clearTimeout(this.statusTimeout)

    // this.statusTimeout = setTimeout(() => {
    this.footer.clear()
    this.drawFooter(msg)
    this.lastStatus = msg
    this.screen.draw()
    // }, 500)
  }

  private createScreen() {
    this.screen = ScreenBuffer.create({
      dst: this.term,
      width: this.term.width,
      height: this.term.height,
    })
  }

  private createHeader() {
    this.header = ScreenBuffer.create({
      dst: this.screen,
      height: 2,
      width: this.term.width,
      noFill: true,
    })
  }

  private createProgressArea() {
    this.progressArea = ScreenBuffer.create({
      dst: this.screen,
      height: 1,
      y: this.term.height - 6,
      width: this.term.width,
      noFill: true,
      wrap: false,
    })
  }

  private createFooter() {
    this.footer = ScreenBuffer.create({
      dst: this.screen,
      height: 2,
      y: this.term.height - 2,
      width: this.term.width,
      noFill: true,
    })
  }

  private drawHeader() {
    terminal.saveCursor()
    const title = ` ${this.TITLE} `
    const x = Math.round((this.term.width - title.length) / 2)

    const border = '-'.repeat(this.term.width)

    this.header.moveTo(x, 0)
    this.header.put({ attr: { color: 'red', bold: true } }, this.TITLE)
    this.header.moveTo(0, 1)
    this.header.put(null, border)
    this.header.draw()
    this.term.restoreCursor()
  }

  private drawFooter(status?: string) {
    if (!status) status = this.lastStatus
    const border = '-'.repeat(this.term.width)

    this.footer.moveTo(0, 0)
    this.footer.put(null, border)
    this.footer.moveTo(0, 1)
    this.footer.put({ attr: { color: 'red', bold: true } }, ' => ')
    this.footer.put({ attr: { color: 'red' } }, status || ' ')
    this.footer.draw()
  }

  private nuke() {
    clearTimeout(this.redrawTimeout)

    this.redrawTimeout = setTimeout(() => {
      this.clear()
      delete this.header
      delete this.screen

      this.createScreen()
      this.createHeader()
      this.drawHeader()
      this.screen.draw()
    }, 400)
  }

  private clear() {
    this.header.clear()
    this.progressArea.clear()
    this.footer.clear()
  }

  private exit() {
    this.term.clear()
    this.term.eraseDisplay()
    this.screen.clear()
    this.header.clear()
    this.progressArea.clear()
    this.footer.clear()

    this.TITLE = 'GRACEFUL SHUTDOW'
    this.draw()

    setTimeout(() => {
      this.term.clear()
      this.term.eraseDisplay()
      this.screen.clear()
      this.header.clear()
      this.progressArea.clear()
      this.footer.clear()
      this.term.hideCursor(false)
      this.term.grabInput(false)
      this.term.fullscreen(false)
      setTimeout(() => process.exit(), 100)
    }, 1000)
  }
}

export const window = new Window()
