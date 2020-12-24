/**
 * @description Soft Coded Price
 * @author @tsrnc2
 *
 * Limit orders without tying up funds with stop loss calculated on period close
 * @todo when ordersize can be set allow, for multiple sell points to reduce risk
 */
import { BaseStrategy, StrategyField } from '../base-strategy'
import { SIGNAL, PeriodItem } from '@m8bTypes'
import { logger } from '../../../util/logger'

export interface SoftCodedPriceOptions {
  period: string
  buyPrice: number
  stopLoss: number
  sellPrice: number
  isRepeat: boolean
}

export class SoftCodedPrice extends BaseStrategy<SoftCodedPriceOptions> {
  public static description = 'Buy in and sell a at specific price with a stop limit. Optionaly repeatable'

  public static fields: StrategyField[] = [
    {
      name: 'period',
      type: 'text',
      prettyName: 'Period Length',
      description: 'Length of time to sample.',
      default: '1m',
    },
    {
      name: 'buyPrice',
      type: 'number',
      prettyName: 'Buy Price',
      description: 'When price is below this point buy once.',
      default: 0,
    },
    {
      name: 'stopLoss',
      type: 'number',
      prettyName: 'Stop Loss',
      description: 'If the price drops down below this point sell.',
      default: 0,
    },
    {
      name: 'sellPrice',
      type: 'number',
      prettyName: 'Sell Price',
      description: 'If the price increases up above this point sell.',
      default: 0,
    },
    {
      name: 'isRepeat',
      type: 'boolean',
      prettyName: 'Repeat',
      description: 'after a successful sell should the strategy repeat true:false',
      default: 'false',
    },
  ]

  public options: SoftCodedPriceOptions = {
    period: '1m',
    buyPrice: 0,
    stopLoss: 0,
    sellPrice: 0,
    isRepeat: false,
  }

  private signal: SIGNAL = null
  private isHolding = false // have we bought in yet

  constructor(exchange: string, symbol: string, options?: Partial<SoftCodedPriceOptions>) {
    super('softcodedprice', exchange, symbol)
    this.options = { ...this.options, ...options }
  }

  public calculate(period: string, periods: PeriodItem[]) {
    if (!periods.length) return

    const curPrice = periods[0].close // use closing price as current price

    this.signal = this.closeLong(curPrice) ? SIGNAL.CLOSE_LONG : this.openLong(curPrice) ? SIGNAL.OPEN_LONG : null
    return
  }

  public onPeriod(period: string) {
    /* istanbul ignore next */
    logger.verbose(`Period finished => Signal: ${this.signal === null ? 'no signal' : this.signal}`)
    return { signal: this.signal }
  }

  private closeLong(curPrice: number): boolean {
    if (!this.isHolding) return false // havnt bought yet

    const isSelling = curPrice >= this.options.sellPrice || curPrice <= this.options.stopLoss
    if (isSelling) this.sold() // set isHolding flag
    return isSelling
  }

  private openLong(curPrice: number): boolean {
    if (this.isHolding) return false // already bought

    const isBuying = curPrice <= this.options.buyPrice
    if (isBuying) this.bought() // set isHolding flag
    return isBuying
  }

  private sold() {
    this.isHolding = !this.options.isRepeat // reset if repeat flag is set
  }

  private bought() {
    this.isHolding = true
  }
}
