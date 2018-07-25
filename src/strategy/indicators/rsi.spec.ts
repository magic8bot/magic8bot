import { RSI } from './rsi'
import { candles } from './spec.helper'

describe('RSI', () => {
  it('should calculate first averages correctly', () => {
    const { avgGain, avgLoss, rsi } = RSI.calculate(0, 0, candles.slice(1, 16), 14)
    expect(avgGain).toEqual(0.267142857142857)
    expect(avgLoss).toEqual(0.1957142857142856)
    expect(rsi).toEqual(57.72)
  })

  it('should calculate rsi correctly', () => {
    const { avgGain: ag, avgLoss: al } = RSI.calculate(0, 0, candles.slice(1, 16), 14)

    const { avgGain, avgLoss, rsi } = RSI.calculate(ag, al, candles.slice(0, 16), 14)
    expect(avgGain).toEqual(0.3116326530612244)
    expect(avgLoss).toEqual(0.1817346938775509)
    expect(rsi).toEqual(63.16)
  })
})
