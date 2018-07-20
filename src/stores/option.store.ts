import { dbDriver, Options } from '@lib'

export class OptionStore {
  public options: Options = {} as Options

  private sessionId: string

  public async initOptions(sessionId: string, options: Options) {
    this.sessionId = sessionId
    const savedOptions = await this.loadOptions()

    if (!savedOptions) {
      this.options = options
      this.saveOptions(options)
      return
    }

    this.options = this.mergeOptions(savedOptions, options)
  }

  public async saveOptions(options: Options) {
    const { sessionId } = this
    await dbDriver.option.save({ ...options, sessionId })
  }

  public async updateOptions(options: Partial<Options>) {
    const { sessionId } = this

    await dbDriver.option.findOneAndUpdate({ sessionId }, options)
  }

  public mergeOptions(optionsA: Options, optionsB: Options) {
    const selector = { ...optionsA.selector, ...optionsB.selector }

    return { ...optionsA, ...optionsB, selector } as Options
  }

  public async loadOptions() {
    const { sessionId } = this
    return dbDriver.option.findOne({ sessionId })
  }
}
