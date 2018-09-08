/**
 * @description Soft Coded Price
 * @author @tsrnc2
 *
 * Limit orders without tying up funds with stop loss calculated on period close
 * @todo when ordersize can be set allow, for multiple sell points to reduce risk
 */
import { PeriodItem } from '@lib'
import { BaseStrategy, StrategyField } from '../base-strategy'
import { Signal } from '@m8bTypes'
import { logger } from '../../../util/logger'

export interface SoftCodedPriceOptions {
  period: string
  buyPrice: number
  stopLimit: number
  sellPrice: number
  isRepeat: boolean
  }

export class SoftCodedPrice extends BaseStrategy<SoftCodedPriceOptions> {
  public static description =
  'Buy in and sell a at specific price with a stop limit. Optionaly repeatable'

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
      description: 'If the price is at or bellow this price buy.',
      default: 0,
    },
    {
      name: 'stopLimit',
      type: 'number',
      prettyName: 'Stop Limit',
      description: 'If after a buy the price gets to this point sell.',
      default: 0,
    },
    {
      name: 'sellPrice',
      type: 'number',
      prettyName: 'Sell Price',
      description: 'If after a buy the price reaches this point sell',
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
    stopLimit: 0,
    sellPrice: 0,
    isRepeat: false,
  }

  private signal: Signal = null
  private isHolding = false // have we bought in yet

  constructor(exchange: string, symbol: string, options?: Partial<SoftCodedPriceOptions>) {
    super('softcodedprice', exchange, symbol)
    this.options = { ...this.options, ...options }
  }

  public calculate(periods: PeriodItem[]) {
    if (!periods.length) return
    const curPrice = periods[0].close // use closing price as current price
    if (this.isHolding) { // we have already bought and are holding
      if ((curPrice >= this.options.sellPrice) || (curPrice <= this.options.stopLimit)) {
        // sell price reached reset if we are to repeat
        if (this.options.isRepeat) this.reset()
        this.signal = 'sell' }
      else {
        this.signal = null } // if we arent buying or selling cancel signal
    }
    else {  // else we are not already holding
      if (curPrice <= this.options.buyPrice) {
        this.isHolding = true
        this.signal = 'buy' }
      else {
        this.signal = null } // if we arent buying or selling cancel signal
    }
    const signal = 0
    const rsi = 0
    return { rsi, signal }
  }

  public onPeriod() {
    /* istanbul ignore next */
    logger.verbose(`Period finished => Signal: ${this.signal === null ? 'no signal' : this.signal}`)
    return this.signal
  }

  public reset() {
    this.isHolding = false
  }
}
