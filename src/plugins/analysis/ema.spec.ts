import { SMA } from './sma'
import { EMA } from './ema'
import { candles } from './spec.helper'

describe('EMA', () => {
  it('should calculate the correct ema', () => {
    const sma = SMA.calculate(candles.slice(1, 15), 14)
    const ema = EMA.calculate(sma, candles.slice(0, 15), 14)
    expect(ema).toEqual(17.533047619047622)
  })
})
