const mockExchange = 'mockExchange'
const mockSymbol = 'mockSymbol'
const mockBuy = 999
const mockSell = 1000
const mockMarkUp = 50
const mockMarkDn = 50

const mockGetOrderbook = jest.fn().mockReturnValue({ bids: [[mockBuy]], asks: [[mockSell]] })
const mockExchangeProvider: any = {
  getOrderbook: mockGetOrderbook,
}

jest.mock('../exchange/exchange.provider', () => {
  return { ExchangeProvider: mockExchangeProvider }
})

import { QuoteEngine } from './quote'

describe('QuoteEngine', () => {
  test('get a buy price', async () => {
    const opts = { exchange: mockExchange, symbol: mockSymbol, markDn: 0, markUp: 0 }
    const quoteEngine = new QuoteEngine(mockExchangeProvider, opts)

    const result = await quoteEngine.getBuyPrice()

    expect(result).toEqual(mockBuy)
  })

  test('get a sell price', async () => {
    const opts = { exchange: mockExchange, symbol: mockSymbol, markDn: 0, markUp: 0 }
    const quoteEngine = new QuoteEngine(mockExchangeProvider, opts)

    const result = await quoteEngine.getSellPrice()

    expect(result).toEqual(mockSell)
  })

  test('get an adjusted buy price', async () => {
    const opts = { exchange: mockExchange, symbol: mockSymbol, markDn: mockMarkDn, markUp: mockMarkUp }
    const quoteEngine = new QuoteEngine(mockExchangeProvider, opts)

    const result = await quoteEngine.getBuyPrice()
    const expected = mockBuy - mockBuy * mockMarkDn

    expect(result).toEqual(expected)
  })

  test('get an adjusted sell price', async () => {
    const opts = { exchange: mockExchange, symbol: mockSymbol, markDn: mockMarkDn, markUp: mockMarkUp }
    const quoteEngine = new QuoteEngine(mockExchangeProvider, opts)

    const result = await quoteEngine.getSellPrice()
    const expected = mockSell + mockSell * mockMarkUp

    expect(result).toEqual(expected)
  })
})
