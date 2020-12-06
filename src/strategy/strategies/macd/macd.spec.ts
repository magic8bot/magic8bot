jest.mock('../../../lib/events.enum', () => {
  return { EVENT: { TRADE: 0, PERIOD: 1 } }
})

const mockRsiCalculate = jest.fn()
jest.mock('../../indicators/rsi', () => {
  return {
    RSI: { calculate: mockRsiCalculate },
  }
})

const mockMacdCalculate = jest.fn()
jest.mock('../../indicators/macd', () => {
  return {
    MACD: { calculate: mockMacdCalculate },
  }
})

import { Macd } from './macd'
import { candles } from '../../indicators/spec.helper'
import { SIGNAL } from '../../../types'

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

  it('should run calculation methods', () => {
    macd.checkOverbought = jest.fn()
    mockMacdCalculate.mockReturnValueOnce({})

    macd.calculate('1m', candles.slice(0, 1))

    expect(mockMacdCalculate).toHaveBeenCalledTimes(1)
    expect(macd.checkOverbought).toHaveBeenCalledTimes(1)
  })

  describe('should send correct signals', () => {
    beforeEach(() => macd.prerollDone())

    it('overbought sell', () => {
      // @ts-ignore
      macd.rsi = 80
      // @ts-ignore
      macd.overbought = true
      const signal = macd.onPeriod('1m')

      expect(signal).toEqual({ signal: SIGNAL.CLOSE_LONG })
    })

    it('macd signal sell', () => {
      // "mock" periods into current macd instance
      Object.defineProperty(macd, 'periods', { get: () => [{ history: -1 }, { history: 1 }] })

      const signal = macd.onPeriod('1m')

      expect(signal).toEqual({ signal: SIGNAL.CLOSE_LONG })
    })

    it('macd signal buy', () => {
      // "mock" periods into current macd instance
      Object.defineProperty(macd, 'periods', { get: () => [{ history: 1 }, { history: -1 }] })
      const signal = macd.onPeriod('1m')

      expect(signal).toEqual({ signal: SIGNAL.OPEN_LONG })
    })

    it('macd signal null', () => {
      // "mock" periods into current macd instance
      Object.defineProperty(macd, 'periods', { get: () => [{ history: 1 }, { history: 2 }] })
      const signal = macd.onPeriod('1m')

      expect(signal).toEqual({ signal: null })
    })

    it('macd w/o periods', () => {
      expect(macd.calculate('1m', [])).toBeUndefined()
    })
  })
})
