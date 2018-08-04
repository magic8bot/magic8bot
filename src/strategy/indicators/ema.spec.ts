import { SMA } from './sma'
import { EMA } from './ema'
import { candles } from './spec.helper'

describe('EMA', () => {

  it('should return null, if not enough data', () => {
    expect(EMA.calculate(0, candles.slice(0, 1), 15, 'close')).toBeNull()
  })

  it('should calculate the sma for first ema period', () => {
    const sma = SMA.calculate(candles.slice(1, 16), 14)
    const ema = EMA.calculate(0, candles.slice(1, 16), 14)
    expect(ema).toEqual(sma)
  })

  it('should calculate the correct ema', () => {
    const sma = SMA.calculate(candles.slice(1, 15), 14)
    const ema = EMA.calculate(sma, candles.slice(0, 15), 14)
    expect(ema).toEqual(17.533047619047622)
  })

})
