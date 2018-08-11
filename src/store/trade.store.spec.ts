import { TradeStore } from './trade.store'

describe('TradeStore', () => {
  const storeOpts = { exchange: 'test', symbol: 'test' }
  let tradeStore: TradeStore

  beforeAll(() => {
    tradeStore = TradeStore.instance
  })

  test('should be able to add symbols', async () => {
    tradeStore.addSymbol(storeOpts)

    expect(tradeStore.tradesMap.size).toEqual(1)
  })

  test('should load trades', async () => {
    await tradeStore.loadTrades(storeOpts)
    expect(tradeStore.tradesMap.size).toEqual(1)
  })

  test('should add trades', async () => {
    await tradeStore.insertTrades(storeOpts, [{ foo: 'bar' }] as any)
    expect(tradeStore.tradesMap.size).toEqual(1)
  })

  test('should actually load trads', async () => {
    // @ts-ignore
    const idStr = tradeStore.makeIdStr(storeOpts)
    tradeStore.tradesMap.set(idStr, 0)
    await tradeStore.insertTrades(storeOpts, [{ timestamp: 1 }] as any)
    await tradeStore.loadTrades(storeOpts)
    expect(tradeStore.tradesMap.size).toEqual(1)
  })
})
