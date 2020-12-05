jest.mock('../../../lib/events.enum', () => {
  return { EVENT: { TRADE: 0, PERIOD: 1 } }
})

import { SoftCodedPrice } from './softcodedprice'
import { candles } from '../../indicators/spec.helper'

describe('SoftCodedPrice', () => {
  let softCodedPrice: SoftCodedPrice

  beforeEach(() => {
    softCodedPrice = new SoftCodedPrice('test', 'test', { buyPrice: 18.0, sellPrice: 18.25, stopLoss: 17.25 })
  })

  it('should not return signal without a full period', () => {
    softCodedPrice.calculate('1m', candles.slice(0, 0))
    const signal = softCodedPrice.onPeriod('1m')

    expect(signal).toBeNull()
  })

  it('should buy when price is low enough', () => {
    softCodedPrice.calculate('1m', candles.slice(1, 2))
    const signal = softCodedPrice.onPeriod('1m')

    expect(signal).toEqual('buy')
  })

  it('should sell when price is high enough', () => {
    softCodedPrice.calculate('1m', candles.slice(1, 2)) // should buy first
    softCodedPrice.calculate('1m', candles.slice(3, 4)) // then sell for profit
    const signal = softCodedPrice.onPeriod('1m')

    expect(signal).toEqual('sell')
  })

  it('should sell when price is low after buy', () => {
    softCodedPrice.calculate('1m', candles.slice(1, 2)) // Buy first
    softCodedPrice.calculate('1m', candles.slice(7, 8)) // then panic sell
    const signal = softCodedPrice.onPeriod('1m')

    expect(signal).toEqual('sell')
  })

  it('should not sell before a buy', () => {
    softCodedPrice.calculate('1m', candles.slice(3, 4)) // attempt sell
    const signal = softCodedPrice.onPeriod('1m')

    expect(signal).toBeNull()
  })

  it('should not buy or sell if not triggered', () => {
    softCodedPrice.calculate('1m', candles.slice(3, 4))
    const signal = softCodedPrice.onPeriod('1m')

    expect(signal).toBeNull()
  })

  it('should only buy once', () => {
    softCodedPrice.calculate('1m', candles.slice(1, 2)) // First buy
    softCodedPrice.calculate('1m', candles.slice(3, 4)) // Then sell
    softCodedPrice.calculate('1m', candles.slice(1, 2)) // atempt another buy
    const signal = softCodedPrice.onPeriod('1m')

    expect(signal).toBeNull()
  })
})
describe('SoftCodedPrice repeating', () => {
  let softCodedPrice: SoftCodedPrice

  beforeEach(() => {
    softCodedPrice = new SoftCodedPrice('test', 'test', { buyPrice: 18.0, sellPrice: 18.25, stopLoss: 17.25, isRepeat: true })
  })

  it('should buy again with repeat flag set', () => {
    softCodedPrice.calculate('1m', candles.slice(1, 2)) // First buy
    softCodedPrice.calculate('1m', candles.slice(3, 4)) // Then sell
    softCodedPrice.calculate('1m', candles.slice(1, 2)) // another buy
    const signal = softCodedPrice.onPeriod('1m')

    expect(signal).toEqual('buy')
  })
})
