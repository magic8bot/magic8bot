jest.mock('../../../lib/events.enum', () => {
  return { EVENT: { TRADE: 0, PERIOD: 1 } }
})

const mockRsiCalculate = jest.fn()
jest.mock('../../indicators/rsi', () => {
  return {
    RSI: { calculate: mockRsiCalculate },
  }
})

const mockEmaCalculate = jest.fn()
jest.mock('../../indicators/ema', () => {
  return {
    EMA: { calculate: mockEmaCalculate },
  }
})

import { Macd } from './macd'
import { candles } from '../../indicators/spec.helper'

describe('Macd', () => {
  let macd: Macd

  beforeEach(() => {
    macd = new Macd('test', 'test')
  })

  it('should finish preroll', () => {
    macd.prerollDone()
    // @ts-ignore
    expect(macd.isPreroll).toEqual(false)
  })

  it('should create new periods', () => {
    macd.newPeriod()

    // @ts-ignore
    expect(macd.periods.length).toEqual(2)
  })

  describe('should set overbought', () => {
    const baseRsiMockReturn = { avgGain: null, avgLoss: null }

    beforeEach(() => {
      macd.newPeriod()
      macd.newPeriod()
      macd.prerollDone()
    })

    it('as false', () => {
      // @ts-ignore
      mockRsiCalculate.mockReturnValueOnce({ rsi: 50, ...baseRsiMockReturn })
      macd.checkOverbought([])

      // @ts-ignore
      expect(macd.overbought).toEqual(false)
    })

    it('as true', () => {
      mockRsiCalculate.mockReturnValueOnce({ rsi: 80, ...baseRsiMockReturn })
      macd.checkOverbought([])

      // @ts-ignore
      expect(macd.overbought).toEqual(true)
    })
  })

  describe('should set EMAs', () => {
    beforeEach(() => {
      macd.newPeriod()
      macd.newPeriod()
    })

    mockEmaCalculate
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(20)
      .mockReturnValueOnce(30)

    it('short', () => {
      macd.getEmaShort([])
      // @ts-ignore
      expect(macd.periods[0].emaShort).toEqual(10)
    })

    it('long', () => {
      macd.getEmaLong([])
      // @ts-ignore
      expect(macd.periods[0].emaLong).toEqual(20)
    })

    it('macd', () => {
      macd.getEmaMacd()
      // @ts-ignore
      expect(macd.periods[0].emaMacd).toEqual(30)
    })
  })

  it('should calculate macd period', () => {
    macd.newPeriod()
    // @ts-ignore
    macd.periods[0].emaShort = 30
    // @ts-ignore
    macd.periods[0].emaLong = 10
    // @ts-ignore
    macd.periods[0].emaMacd = 25
    // @ts-ignore
    macd.getEmaMacd = jest.fn()

    macd.calculateMacd()

    expect(macd.getEmaMacd).toHaveBeenCalledTimes(1)

    // @ts-ignore
    expect(macd.periods[0].macd).toEqual(20)
    // @ts-ignore
    // expect(macd.periods[0].history).toEqual(-5)
  })

  it('should run calculation methods', () => {
    macd.checkOverbought = jest.fn()
    macd.getEmaShort = jest.fn()
    macd.getEmaLong = jest.fn()
    macd.calculateMacd = jest.fn()

    macd.calculate(candles.slice(0, 1))

    expect(macd.checkOverbought).toHaveBeenCalledTimes(1)
    expect(macd.getEmaShort).toHaveBeenCalledTimes(1)
    expect(macd.getEmaLong).toHaveBeenCalledTimes(1)
    expect(macd.calculateMacd).toHaveBeenCalledTimes(1)
  })

  describe('should send correct signals', () => {
    beforeEach(() => macd.prerollDone())

    it('overbought sell', () => {
      // @ts-ignore
      macd.rsi = 80
      // @ts-ignore
      macd.overbought = true
      const signal = macd.onPeriod()

      expect(signal).toEqual('sell')
    })

    xit('macd sell', () => {
      // @ts-ignore
      macd.periods = [{ history: -1 }, { history: 1 }]
      const signal = macd.onPeriod()

      expect(signal).toEqual('sell')
    })

    xit('macd buy', () => {
      // @ts-ignore
      macd.periods = [{ history: 1 }, { history: -1 }]
      const signal = macd.onPeriod()

      expect(signal).toEqual('buy')
    })

    it('null', () => {
      // @ts-ignore
      macd.periods = [{ history: 1 }, { history: 2 }]
      const signal = macd.onPeriod()

      expect(signal).toBeNull()
    })

    it('macd w/o periods', () => {
      expect(macd.calculate([])).toBeUndefined()
    })
  })
})
