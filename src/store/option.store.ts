import { dbDriver, Options } from '../lib'

export class OptionStore {
  public options: Options = {} as Options

  private sessionId: string

  async initOptions(sessionId: string, options: Options) {
    this.sessionId = sessionId
    const savedOptions = await this.loadOptions()

    if (!savedOptions) {
      this.options = options
      this.saveOptions(options)
      return
    }

    this.options = this.mergeOptions(savedOptions, options)
  }

  async saveOptions(options: Options) {
    const { sessionId } = this
    await dbDriver.option.save({ ...options, sessionId })
  }

  async updateOptions(options: Partial<Options>) {
    const { sessionId } = this

    await dbDriver.option.findOneAndUpdate({ sessionId }, options)
  }

  mergeOptions(optionsA: Options, optionsB: Options) {
    const selector = { ...optionsA.selector, ...optionsB.selector }

    return { ...optionsA, ...(optionsB as Options), selector } as Options
  }

  async loadOptions() {
    const { sessionId } = this
    return await dbDriver.option.findOne({ sessionId })
  }
}
