import blessed, { Widgets } from 'blessed'

export class ProgressBar {
  private progress: number = null
  private bar: Widgets.ProgressBarElement
  private line: Widgets.BoxElement
  private end: Widgets.BoxElement

  constructor(private readonly dst: Widgets.Screen | Widgets.BoxElement, private title: string) {
    this.draw()
    this.dst.append(this.line)
  }

  public update = (progress: number) => {
    this.progress = progress < 0 ? 0 : progress
    this.bar.setProgress(this.progress * 100)
    const percent = ('   ' + Math.round((this.progress || 0) * 100) + '%').slice(-4)
    this.end.setContent(`{cyan-fg}]{/cyan-fg} ${percent}`)
  }

  public done = () => {
    this.bar.setProgress(100)
  }

  public clear = () => {
    this.dst.remove(this.line)
  }

  private draw() {
    const baseOpts = { top: 0, left: 0, height: 1, tags: true }

    const title = blessed.box({ ...baseOpts, width: this.title.length + 4 })
    title.setContent(` {white-fg}{bold}${this.title}{/bold}{/white-fg} {cyan-fg}[{/cyan-fg}`)

    const orientation = 'horizontal'
    const barBaseOpts = { top: 0, height: 1, filled: 0, value: 0, pch: '=', keys: false, mouse: false, orientation }

    this.bar = blessed.progressbar({
      ...barBaseOpts,
      left: this.title.length + 3,
      style: { bar: { fg: 'blue' } },
      width: `100%-${this.title.length + 10}`,
    })

    this.end = blessed.box({ ...baseOpts, left: '100%-7', width: 7 })
    const percent = ('   ' + Math.round((this.progress || 0) * 100) + '%').slice(-4)
    this.end.setContent(`{cyan-fg}]{/cyan-fg} ${percent}`)

    this.line = blessed.box({ ...baseOpts, width: '100%' })
    this.line.append(title)
    this.line.append(this.bar)
    this.line.append(this.end)
  }
}
