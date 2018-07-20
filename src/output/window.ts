import fs from 'fs'
import path from 'path'
import { EventEmitter } from 'events'
import blessed, { Widgets } from 'blessed'
import contrib, { ContribWidgets } from 'blessed-contrib'

import { ProgressBar } from './progress-bar'

const { version } = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'UTF-8'))

class Window {
  public screenEvents: EventEmitter = new EventEmitter()

  private title = `Magic8bot ${version}`

  private screen: Widgets.Screen
  private progressArea: Widgets.BoxElement

  private log: ContribWidgets.LogElement

  private progressBars: Widgets.BoxElement[] = []

  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
    })

    this.screen.key(['escape', 'q', 'C-c'], () => {
      return process.exit(0)
    })

    this.createHeader()
    this.createProgressArea()
    this.createLog()
  }

  public addProgressBar(title: string) {
    const barLine = blessed.box({ height: 1, width: '100%' })
    const bar = new ProgressBar(barLine, title)

    this.progressBars.push(barLine)
    barLine.top = this.progressBars.length - 1
    this.progressArea.height = this.progressBars.length

    this.progressArea.append(barLine)
    this.progressArea.render()
    this.screen.render()

    return {
      done: () => {
        // @ts-ignore
        this.log.log(`${title} done`)
        bar.done()
        this.screen.render()
      },
      update: (percent: number) => {
        bar.update(percent)
        this.screen.render()
      },
    }
  }

  public setStatus(msg: string) {
    this.log.log(msg)
  }

  private createHeader() {
    const title = blessed.box({ top: 0, left: 0, height: 1, tags: true })
    title.setContent(`{center}{red-fg}${this.title}{/red-fg}{/center}`)

    const orientation = 'horizontal'
    const style = { fg: 'cyan' }
    const line = blessed.line({ top: 1, left: 0, height: 1, orientation, style })

    this.screen.append(title)
    this.screen.append(line)
  }

  private createProgressArea() {
    this.progressArea = blessed.box({ top: 2, height: 1, width: '100%' })
    this.screen.append(this.progressArea)
  }

  private createLog() {
    const logBox = blessed.box({ top: '100%-6', height: 6, width: '100%' })
    this.log = contrib.log({
      border: { type: 'line', fg: 'cyan' },
      fg: 'green',
      height: 6,
      label: 'Logs',
      width: '100%',
    })
    logBox.append(this.log)
    this.screen.append(logBox)
  }
}

export const window = new Window()
