import fs from 'fs'
import path from 'path'
import { EventEmitter } from 'events'
import { terminal, ScreenBuffer, Terminal } from 'terminal-kit'

import { progressBar } from './progress-bar'

const { version } = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'UTF-8'))

class Window {
  public screenEvents: EventEmitter = new EventEmitter()

  private TITLE: string = `Zenbot ${version}`
  private redrawTimeout: NodeJS.Timer = null
  private statusTimeout: NodeJS.Timer = null

  private term: Terminal = terminal
  private screen: ScreenBuffer
  private header: ScreenBuffer
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
    this.createFooter()
    // this.setStatus('Bot start')

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
      // this.progressBars.forEach((buffer) => buffer.draw())
      // this.drawFooter()
      this.screen.draw()
    }, 100)
  }

  addProgressBar(title: string) {
    const dst = this.screen
    const y = this.term.height - (this.progressBars.length + 3)

    const buffer = ScreenBuffer.create({
      dst,
      x: 0,
      y,
      width: this.term.width,
      height: 1,
    })

    this.progressBars.push(buffer)

    const bar = progressBar({
      title,
      eta: true,
      percent: true,
      dst: buffer,
    })

    return {
      update: (percent: number) => {
        const idx = this.progressBars.findIndex((b) => b === buffer)
        const y = this.term.height - (idx + 3)
        this.term.saveCursor()
        bar.update(percent)
        buffer.draw({ y, x: 0, dst })
        dst.draw()
        this.term.restoreCursor()
      },
      done: () => {
        const idx = this.progressBars.findIndex((b) => b === buffer)
        buffer.clear()
        this.progressBars.splice(idx, 1)
        this.progressBars.forEach((buffer, idx) => {
          buffer.draw({ y, x: 0, dst })
        })

        this.setStatus(`${title} done`)
        dst.draw()
      },
    }
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

  private createFooter() {
    this.footer = ScreenBuffer.create({
      dst: this.screen,
      height: 2,
      y: this.term.height - 2,
      width: this.term.width,
      noFill: true,
    })
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
      height: 3,
      width: this.term.width,
      noFill: true,
    })
  }

  private drawHeader() {
    terminal.saveCursor()
    const title = ` ${this.TITLE} `
    const x = Math.round((this.term.width - title.length) / 2)

    const border = '-'.repeat(this.term.width)

    this.header.moveTo(0, 0)
    this.header.put(null, border)
    this.header.moveTo(0, 1)
    this.header.put(null, '|')
    this.header.moveTo(x, 1)
    this.header.put({ attr: { color: 'red', bold: true } }, this.TITLE)
    this.header.moveTo(this.term.width - 1, 1)
    this.header.put(null, '|')
    this.header.moveTo(0, 2)
    this.header.put(null, border)
    this.header.draw()
    this.term.restoreCursor()
  }

  private drawFooter(status?: string) {
    terminal.saveCursor()
    if (!status) status = this.lastStatus
    const border = '-'.repeat(this.term.width)

    this.footer.moveTo(0, 0)
    this.footer.put(null, border)
    this.footer.moveTo(0, 1)
    this.footer.put({ attr: { color: 'red', bold: true } }, ' => ')
    this.footer.put({ attr: { color: 'red' } }, status || ' ')
    this.footer.draw()
    this.term.restoreCursor()
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
    this.screen.clear()
    this.term.eraseDisplay()
    this.term.clear()
  }

  private exit() {
    this.TITLE = 'GRACEFUL SHUTDOW'
    this.draw()

    setTimeout(() => {
      this.term.hideCursor(false)
      this.term.grabInput(false)
      this.term.fullscreen(false)
      this.term.clear()
      setTimeout(() => process.exit(), 100)
    }, 1000)
  }
}

export const window = new Window()
