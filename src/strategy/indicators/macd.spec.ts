import deepClone from 'deep-clone'

import { MACD } from './macd'
import { BtcCandles } from './spec.helper'

describe('MACD', () => {
  const periodData = deepClone(BtcCandles)
  const periods = []
  const macdPeriods = [
    {
      emaShort: null,
      emaLong: null,
      macd: null,
      signal: null,
      history: null,
      close: null,
    },
  ]

  const calculatePeriod = () => {
    periods.unshift(periodData.pop())
    const calculated = MACD.calculate(periods, macdPeriods, 12, 26, 9)
    const period = { ...calculated, ...periods[0] }
    macdPeriods[0] = period
    macdPeriods.unshift({
      emaShort: null,
      emaLong: null,
      macd: null,
      signal: null,
      history: null,
      close: null,
    })
  }

  it('should calculate the correct macd', () => {
    calculatePeriod()
    expect(macdPeriods[1].emaShort).toBeNull()
    expect(macdPeriods[1].close).toBe(19263.5)
    calculatePeriod()
    expect(macdPeriods[1].emaShort).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaShort).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaShort).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaShort).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaShort).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaShort).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaShort).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaShort).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaShort).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaShort).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaShort).toBe(19250.843333333334)
    calculatePeriod()
    expect(macdPeriods[1].emaShort).toBe(19254.090512820512)
    calculatePeriod()
    expect(macdPeriods[1].emaLong).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaLong).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaLong).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaLong).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaLong).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaLong).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaLong).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaLong).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaLong).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaLong).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaLong).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaLong).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].emaLong).toBe(19276.981153846154)
    expect(macdPeriods[1].macd).toBe(29.550496344927524)
    calculatePeriod()
    expect(macdPeriods[1].emaLong).toBe(19279.488475783477)
    expect(macdPeriods[1].macd).toBe(27.704458993594017)
    calculatePeriod()
    expect(macdPeriods[1].signal).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].signal).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].signal).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].signal).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].signal).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].signal).toBeNull()
    calculatePeriod()
    expect(macdPeriods[1].signal).toBe(21.213577867498113)
    expect(macdPeriods[1].history).toBe(-9.397629014654537)
    calculatePeriod()
    expect(macdPeriods[1].signal).toBe(19.15076983165038)
    expect(macdPeriods[1].history).toBe(-8.251232143390936)
  })
})
