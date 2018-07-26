import { dbDriver, Options } from '@lib'
import { sessionStore } from './session.store'

export class OptionStore {
  public options: Options = {} as Options
  private readonly sessionId = sessionStore.sessionId

  public async initOptions(options: Options) {
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
    const symbol = { ...optionsA.symbol, ...optionsB.symbol }

    return { ...optionsA, ...optionsB, symbol } as Options
  }

  public async loadOptions() {
    const { sessionId } = this
    return dbDriver.option.findOne({ sessionId })
  }
}
