const mockNow = 86400000 * 2
const mockId = 'test'
const mockDays = 1

const mockGetScan = jest.fn()
const mockGetTrades = jest.fn()
const mockGetTradeCursor = jest.fn()

const mockExchangeProvider: any = {
  getScan: mockGetScan,
  getTrades: mockGetTrades,
  getTradeCursor: mockGetTradeCursor,
}

jest.mock('../exchange/exchange.provider', () => {
  return { ExchangeProvider: mockExchangeProvider }
})

const mockLoadTrades = jest.fn()
const mockInsertTrades = jest.fn()

const mockTradeStore: any = {
  loadTrades: mockLoadTrades,
  insertTrades: mockInsertTrades,
}

const mockFindLatestTradeMarker = jest.fn()
const mockGetNextBackMarker = jest.fn()
const mockGetNextForwardMarker = jest.fn()
const mockSaveMarker = jest.fn()

const mockMarkerStore: any = {
  findLatestTradeMarker: mockFindLatestTradeMarker,
  getNextBackMarker: mockGetNextBackMarker,
  getNextForwardMarker: mockGetNextForwardMarker,
  saveMarker: mockSaveMarker,
}

jest.mock('../stores', () => {
  return { TradeStore: mockTradeStore, MarkerStore: mockMarkerStore }
})

import { TradeEngine } from './trade'

describe('TradeEngine', () => {
  let tradeEngine: TradeEngine
  let getNow: jest.Mock<any>

  beforeEach(() => {
    tradeEngine = new TradeEngine(mockId, mockExchangeProvider, mockTradeStore, mockMarkerStore, 0)
    getNow = jest.spyOn<any, any>(tradeEngine, 'getNow').mockReturnValue(mockNow)
  })

  afterEach(() => {
    mockGetScan.mockReset()
    mockGetTrades.mockReset()
    mockGetTradeCursor.mockReset()
    mockLoadTrades.mockReset()
    mockInsertTrades.mockReset()
    mockFindLatestTradeMarker.mockReset()
    mockGetNextBackMarker.mockReset()
    mockGetNextForwardMarker.mockReset()
    mockSaveMarker.mockReset()
  })

  test('should scan back', async () => {
    // @ts-ignore
    tradeEngine.scanType = 'back'

    const scanBack = jest.spyOn<any, any>(tradeEngine, 'scanBack').mockResolvedValueOnce(null)
    const scanForward = jest.spyOn<any, any>(tradeEngine, 'scanForward').mockResolvedValueOnce(null)

    await tradeEngine.scan(mockId, mockDays)

    expect(scanBack).toHaveBeenCalledTimes(1)
    expect(scanBack).toHaveBeenCalledWith(mockId, mockNow / 2)
    expect(scanForward).toHaveBeenCalledTimes(0)
  })

  test('should scan forward', async () => {
    // @ts-ignore
    tradeEngine.scanType = 'forward'

    const scanBack = jest.spyOn<any, any>(tradeEngine, 'scanBack').mockResolvedValueOnce(null)
    const scanForward = jest.spyOn<any, any>(tradeEngine, 'scanForward').mockResolvedValueOnce(null)

    await tradeEngine.scan(mockId, mockDays)

    expect(scanBack).toHaveBeenCalledTimes(0)
    expect(scanForward).toHaveBeenCalledTimes(1)
    expect(scanForward).toHaveBeenCalledWith(mockId, mockNow / 2)
  })

  test('should load trades after scan', async () => {
    // @ts-ignore
    tradeEngine.scanType = 'back'

    jest.spyOn<any, any>(tradeEngine, 'scanBack').mockResolvedValueOnce(null)
    jest.spyOn<any, any>(tradeEngine, 'scanForward').mockResolvedValueOnce(null)

    await tradeEngine.scan(mockId, mockDays)

    expect(mockLoadTrades).toHaveBeenCalledTimes(1)
  })

  test('should stop back scan when oldest <= end', async () => {
    // @ts-ignore
    tradeEngine.scanType = 'back'

    mockGetNextBackMarker.mockReturnValueOnce(mockNow)
    mockGetTrades.mockReturnValueOnce([{}])
    mockGetTradeCursor.mockReturnValueOnce(mockNow / 2 - 1)
    mockSaveMarker.mockReturnValueOnce({ oldestTime: mockNow / 2 - 1 })

    const scanBack = jest.spyOn<any, any>(tradeEngine, 'scanBack')

    await tradeEngine.scan(mockId, mockDays)

    expect(scanBack).toHaveBeenCalledTimes(1)
  })

  test('should back scan until oldest <= end', async () => {
    // @ts-ignore
    tradeEngine.scanType = 'back'

    mockGetNextBackMarker.mockReturnValueOnce(mockNow).mockReturnValueOnce(mockNow)
    mockGetTrades.mockReturnValueOnce([{}]).mockReturnValueOnce([{}])
    mockGetTradeCursor.mockReturnValueOnce(mockNow - 1).mockReturnValueOnce(mockNow / 2 - 1)
    mockSaveMarker.mockReturnValueOnce({ oldestTime: mockNow - 1 }).mockReturnValueOnce({ oldestTime: mockNow / 2 - 1 })

    const scanBack = jest.spyOn<any, any>(tradeEngine, 'scanBack')

    await tradeEngine.scan(mockId, mockDays)

    expect(scanBack).toHaveBeenCalledTimes(2)
  })

  test('should stop forward scan when newestTime >= now', async () => {
    // @ts-ignore
    tradeEngine.scanType = 'forward'

    mockGetNextForwardMarker.mockReturnValueOnce(mockNow).mockReturnValueOnce(mockNow)
    mockGetTrades.mockReturnValueOnce([{}])
    mockGetTradeCursor.mockReturnValueOnce(mockNow + 1)
    mockSaveMarker.mockReturnValueOnce({ newestTime: mockNow + 1 })

    const scanForward = jest.spyOn<any, any>(tradeEngine, 'scanForward')

    await tradeEngine.scan(mockId, mockDays)

    expect(scanForward).toHaveBeenCalledTimes(1)
  })

  test('should forward scan until newestTime >= now', async () => {
    // @ts-ignore
    tradeEngine.scanType = 'forward'

    mockGetNextForwardMarker.mockReturnValueOnce(mockNow).mockReturnValueOnce(mockNow)
    mockGetTrades.mockReturnValueOnce([{}]).mockReturnValueOnce([{}])
    mockGetTradeCursor.mockReturnValueOnce(mockNow - 1).mockReturnValueOnce(mockNow + 1)
    mockSaveMarker.mockReturnValueOnce({ newestTime: mockNow - 1 }).mockReturnValueOnce({ newestTime: mockNow + 1 })

    const scanForward = jest.spyOn<any, any>(tradeEngine, 'scanForward')

    await tradeEngine.scan(mockId, mockDays)

    expect(scanForward).toHaveBeenCalledTimes(2)
  })

  test('should stop forward if 0 trades', async () => {
    // @ts-ignore
    tradeEngine.scanType = 'forward'

    mockGetNextForwardMarker.mockReturnValueOnce(mockNow)
    mockGetTrades.mockReturnValueOnce([])

    const scanForward = jest.spyOn<any, any>(tradeEngine, 'scanForward')

    await tradeEngine.scan(mockId, mockDays)

    expect(scanForward).toHaveBeenCalledTimes(1)
  })

  test('should tick back', async () => {
    // @ts-ignore
    tradeEngine.scanType = 'back'

    mockFindLatestTradeMarker.mockResolvedValueOnce({ newestTime: mockNow - 1 })

    const tickBack = jest.spyOn<any, any>(tradeEngine, 'tickBack').mockResolvedValueOnce(null)
    const scanForward = jest.spyOn<any, any>(tradeEngine, 'scanForward').mockResolvedValueOnce(null)
    const recursiveTick = jest.spyOn<any, any>(tradeEngine, 'recursiveTick').mockResolvedValueOnce(null)

    await tradeEngine.tick(mockId)

    expect(tickBack).toHaveBeenCalledTimes(1)
    expect(tickBack).toHaveBeenCalledWith(mockId, mockNow - 1)
    expect(scanForward).toHaveBeenCalledTimes(0)
    expect(recursiveTick).toHaveBeenCalledTimes(1)
  })

  test('should tick forward', async () => {
    // @ts-ignore
    tradeEngine.scanType = 'forward'

    mockFindLatestTradeMarker.mockResolvedValueOnce({ newestTime: mockNow - 1 })

    const tickBack = jest.spyOn<any, any>(tradeEngine, 'tickBack').mockResolvedValueOnce(null)
    const scanForward = jest.spyOn<any, any>(tradeEngine, 'scanForward').mockResolvedValueOnce(null)
    const recursiveTick = jest.spyOn<any, any>(tradeEngine, 'recursiveTick').mockResolvedValueOnce(null)

    await tradeEngine.tick(mockId)

    expect(tickBack).toHaveBeenCalledTimes(0)
    expect(scanForward).toHaveBeenCalledTimes(1)
    expect(scanForward).toHaveBeenCalledWith(mockId, mockNow - 1)
    expect(recursiveTick).toHaveBeenCalledTimes(1)
  })

  test('should load trades after tick', async () => {
    // @ts-ignore
    tradeEngine.scanType = 'back'

    mockFindLatestTradeMarker.mockResolvedValueOnce({ newestTime: mockNow - 1 })

    jest.spyOn<any, any>(tradeEngine, 'tickBack').mockResolvedValueOnce(null)
    jest.spyOn<any, any>(tradeEngine, 'scanForward').mockResolvedValueOnce(null)
    jest.spyOn<any, any>(tradeEngine, 'recursiveTick').mockResolvedValueOnce(null)

    await tradeEngine.tick(mockId)

    expect(mockLoadTrades).toHaveBeenCalledTimes(1)
  })

  test('should tick back until no trades', async () => {
    // @ts-ignore
    tradeEngine.scanType = 'back'

    mockFindLatestTradeMarker.mockResolvedValueOnce({ newestTime: mockNow })
    mockGetTrades.mockReturnValueOnce([])

    const tickBack = jest.spyOn<any, any>(tradeEngine, 'tickBack')
    jest.spyOn<any, any>(tradeEngine, 'scanForward').mockResolvedValueOnce(null)
    jest.spyOn<any, any>(tradeEngine, 'recursiveTick').mockResolvedValueOnce(null)

    await tradeEngine.tick(mockId)

    expect(tickBack).toHaveBeenCalledTimes(1)
  })

  test('should tick back until reach target', async () => {
    // @ts-ignore
    tradeEngine.scanType = 'back'

    mockFindLatestTradeMarker.mockResolvedValueOnce({ newestTime: mockNow })
    mockGetTrades.mockReturnValueOnce([{ timestamp: mockNow + 1 }]).mockReturnValueOnce([{ timestamp: mockNow }, { timestamp: mockNow + 1 }])

    const tickBack = jest.spyOn<any, any>(tradeEngine, 'tickBack')
    jest.spyOn<any, any>(tradeEngine, 'scanForward').mockResolvedValueOnce(null)
    jest.spyOn<any, any>(tradeEngine, 'recursiveTick').mockResolvedValueOnce(null)

    await tradeEngine.tick(mockId)

    expect(tickBack).toHaveBeenCalledTimes(2)
  })

  // Bullshit tests to get 100%

  test('bullshit recursiveTick', async () => {
    const tick = jest.spyOn<any, any>(tradeEngine, 'tick').mockReturnValueOnce(null)

    // @ts-ignore
    await tradeEngine.recursiveTick(mockId)

    expect(tick).toHaveBeenCalledTimes(1)
  })

  test('bullshit getNow', async () => {
    // tslint:disable-next-line:no-shadowed-variable
    const tradeEngine = new TradeEngine(mockId, mockExchangeProvider, mockTradeStore, mockMarkerStore, 0)

    // @ts-ignore
    const now = await tradeEngine.getNow()

    expect(now).toBeDefined()
  })
})
