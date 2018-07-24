// Mock must be above the import
const mockSubscribe = jest.fn()
const mockRegister = jest.fn().mockReturnValue(jest.fn())

jest.mock('../../../lib', () => {
  return {
    eventBus: { subscribe: mockSubscribe, register: mockRegister },
    EVENT: { TRADE: 0, PERIOD: 1 },
  }
})

const mockRsiCalculate = jest.fn()
jest.mock('../../analysis/rsi', () => {
  return {
    RSI: { calculate: mockRsiCalculate },
  }
})

const mockEmaCalculate = jest.fn()
jest.mock('../../analysis/ema', () => {
  return {
    EMA: { calculate: mockEmaCalculate },
  }
})

import { Macd } from './macd'

describe('Macd', () => {
  let macd: Macd

  beforeEach(() => {
    mockSubscribe.mockClear()
    macd = new Macd('test', 'test')
  })

  it('should subscribe to and register events', () => {
    expect(mockSubscribe).toHaveBeenCalledTimes(2)
    expect(mockRegister).toHaveBeenCalledTimes(2)
  })

  it('should finish preroll', () => {
    macd.prerollDone()
    // @ts-ignore
    expect(macd.isPreroll).toEqual(false)
  })

  describe('should set overbought', () => {
    const baseRsiMockReturn = { avgGain: null, avgLoss: null }

    beforeEach(() => {
      macd.prerollDone()
    })

    it('as false', () => {
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

  it('should create new periods', () => {
    macd.newPeriod()

    // @ts-ignore
    expect(macd.periods.length).toEqual(2)
  })

  describe('should set EMAs', () => {
    mockEmaCalculate
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(20)
      .mockReturnValueOnce(30)

    it('short', () => {
      macd.getEmaShort([])
      // @ts-ignore
      expect(macd.emaShort).toEqual(10)
    })

    it('long', () => {
      macd.getEmaLong([])
      // @ts-ignore
      expect(macd.emaLong).toEqual(20)
    })

    it('macd', () => {
      macd.getEmaMacd()
      // @ts-ignore
      expect(macd.emaMacd).toEqual(30)
    })
  })

  it('should calculate macd period', () => {
    // @ts-ignore
    macd.emaShort = 30
    // @ts-ignore
    macd.emaLong = 10
    // @ts-ignore
    macd.emaMacd = 25
    // @ts-ignore
    macd.getEmaMacd = jest.fn()

    macd.calculateMacd()

    expect(macd.getEmaMacd).toHaveBeenCalledTimes(1)

    // @ts-ignore
    expect(macd.periods[0].macd).toEqual(20)
    // @ts-ignore
    expect(macd.periods[0].history).toEqual(-5)
  })

  it('should run calculation methods', () => {
    macd.checkOverbought = jest.fn()
    macd.getEmaShort = jest.fn()
    macd.getEmaLong = jest.fn()
    macd.calculateMacd = jest.fn()

    macd.calculate([])

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

    it('macd sell', () => {
      // @ts-ignore
      macd.periods = [{ history: -1 }, { history: 1 }]
      const signal = macd.onPeriod()

      expect(signal).toEqual('sell')
    })

    it('macd buy', () => {
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
  })
})
