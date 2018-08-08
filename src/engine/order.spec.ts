const mockAsset = 5
const mockCurrency = 200
const mockPrice = 100

const mockNewOrder = jest.fn()
const mockCloseOpenOrder = jest.fn()
const mockUpdateOrder = jest.fn()
const mockSaveOrder = jest.fn()
const mockGetOpenOrder = jest.fn()
const mockUpdateOrderState = jest.fn()
const mockWalletStore: any = {
  getWallet: jest.fn().mockReturnValue({ asset: mockAsset, currency: mockCurrency }),
}

jest.mock('../stores', () => {
  // tslint:disable-next-line:only-arrow-functions
  const orderStore = function() {
    return {
      newOrder: mockNewOrder,
      closeOpenOrder: mockCloseOpenOrder,
      updateOrder: mockUpdateOrder,
      saveOrder: mockSaveOrder,
      getOpenOrder: mockGetOpenOrder,
      updateOrderState: mockUpdateOrderState,
    }
  }

  const ORDER_STATE = {
    PENDING: 'pending',
    PENDING_CANCEL: 'pending_cancel',
    DONE: 'done',
    CANCELED: 'canceled',
  }

  return { WalletStore: mockWalletStore, OrderStore: orderStore, ORDER_STATE }
})

const mockAmountToPrecision = jest.fn()
const mockPlaceOrder = jest.fn()
const mockCheckOrder = jest.fn()
const mockPriceToPrecision = jest.fn()
const mockCancelOrder = jest.fn()
const mockExchangeProvider: any = {
  amountToPrecision: mockAmountToPrecision,
  placeOrder: mockPlaceOrder,
  checkOrder: mockCheckOrder,
  priceToPrecision: mockPriceToPrecision,
  cancelOrder: mockCancelOrder,
}

jest.mock('../exchange/exchange.provider', () => {
  return { ExchangeProvider: mockExchangeProvider }
})

jest.mock('./quote', () => {
  // tslint:disable-next-line:only-arrow-functions
  const quoteEngine = function() {
    return {
      getBuyPrice: jest.fn().mockReturnValue(mockPrice),
      getSellPrice: jest.fn().mockReturnValue(mockPrice),
    }
  }

  return { QuoteEngine: quoteEngine }
})

const mockStrategyConf: any = {
  markUp: 0,
  markDown: 0,
  strategyName: 'test',
  orderPollInterval: 0,
}

import { OrderEngine } from './order'
import { InsufficientFunds } from 'ccxt'

describe('OrderEngine', () => {
  let orderEngine: OrderEngine

  beforeEach(() => {
    mockPriceToPrecision.mockClear()
    mockAmountToPrecision.mockClear()
    orderEngine = new OrderEngine(mockExchangeProvider, mockWalletStore, mockStrategyConf, 'test', 'test')
  })

  test('can get a wallet', () => {
    const wallet = orderEngine.wallet
    expect(wallet.asset).toEqual(5)
    expect(wallet.currency).toEqual(200)
  })

  test('executes a buy', async () => {
    mockPriceToPrecision.mockReturnValueOnce(mockPrice).mockReturnValueOnce(mockCurrency)
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    const currency = -(amount * mockPrice)
    const placeOrder = jest.fn().mockReturnValue({ id: 'test' })
    const emitWalletAdjusment = jest.fn()
    const checkOrder = jest.fn()
    // @ts-ignore
    orderEngine.placeOrder = placeOrder
    // @ts-ignore
    orderEngine.emitWalletAdjusment = emitWalletAdjusment
    // @ts-ignore
    orderEngine.checkOrder = checkOrder

    await orderEngine.executeBuy()

    const expectedAdjustment = { asset: 0, currency, type: 'newOrder' }
    const expectedOrderOpts = { symbol: 'test', price: mockPrice, amount, type: 'limit', side: 'buy' }

    expect(mockPriceToPrecision).toHaveBeenCalledTimes(2)
    expect(mockAmountToPrecision).toHaveBeenCalledTimes(1)
    expect(emitWalletAdjusment).toHaveBeenCalledTimes(1)
    expect(emitWalletAdjusment).toHaveBeenCalledWith(expectedAdjustment)
    expect(placeOrder).toHaveBeenCalledTimes(1)
    expect(placeOrder).toHaveBeenCalledWith(expectedOrderOpts)
    expect(checkOrder).toHaveBeenCalledTimes(1)
  })

  test('executes a sell', async () => {
    mockPriceToPrecision.mockReturnValueOnce(mockPrice)
    mockAmountToPrecision.mockReturnValueOnce(mockAsset)
    const placeOrder = jest.fn().mockReturnValue({ id: 'test' })
    const emitWalletAdjusment = jest.fn()
    const checkOrder = jest.fn()
    // @ts-ignore
    orderEngine.placeOrder = placeOrder
    // @ts-ignore
    orderEngine.emitWalletAdjusment = emitWalletAdjusment
    // @ts-ignore
    orderEngine.checkOrder = checkOrder

    await orderEngine.executeSell()

    const expectedAdjustment = { asset: -mockAsset, currency: 0, type: 'newOrder' }
    const expectedOrderOpts = { symbol: 'test', price: mockPrice, amount: mockAsset, type: 'limit', side: 'sell' }

    expect(mockPriceToPrecision).toHaveBeenCalledTimes(1)
    expect(mockAmountToPrecision).toHaveBeenCalledTimes(1)
    expect(placeOrder).toHaveBeenCalledTimes(1)
    expect(placeOrder).toHaveBeenCalledWith(expectedOrderOpts)
    expect(emitWalletAdjusment).toHaveBeenCalledTimes(1)
    expect(emitWalletAdjusment).toHaveBeenCalledWith(expectedAdjustment)
    expect(checkOrder).toHaveBeenCalledTimes(1)
  })

  test('does not adjust wallet if execute buy fails', async () => {
    mockPriceToPrecision.mockReturnValueOnce(mockPrice).mockReturnValueOnce(mockCurrency)
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    const placeOrder = jest.fn().mockReturnValue(false)
    const emitWalletAdjusment = jest.fn()
    const checkOrder = jest.fn()
    // @ts-ignore
    orderEngine.placeOrder = placeOrder
    // @ts-ignore
    orderEngine.emitWalletAdjusment = emitWalletAdjusment
    // @ts-ignore
    orderEngine.checkOrder = checkOrder

    await orderEngine.executeBuy()

    expect(mockPriceToPrecision).toHaveBeenCalledTimes(2)
    expect(mockAmountToPrecision).toHaveBeenCalledTimes(1)
    expect(placeOrder).toHaveBeenCalledTimes(1)
    expect(emitWalletAdjusment).toHaveBeenCalledTimes(0)
    expect(checkOrder).toHaveBeenCalledTimes(0)
  })

  test('does not adjust wallet if execute sell fails', async () => {
    mockPriceToPrecision.mockReturnValueOnce(mockPrice)
    mockAmountToPrecision.mockReturnValueOnce(mockAsset)
    const placeOrder = jest.fn().mockReturnValue(false)
    const emitWalletAdjusment = jest.fn()
    const checkOrder = jest.fn()
    // @ts-ignore
    orderEngine.placeOrder = placeOrder
    // @ts-ignore
    orderEngine.emitWalletAdjusment = emitWalletAdjusment
    // @ts-ignore
    orderEngine.checkOrder = checkOrder

    await orderEngine.executeSell()

    expect(mockPriceToPrecision).toHaveBeenCalledTimes(1)
    expect(mockAmountToPrecision).toHaveBeenCalledTimes(1)
    expect(placeOrder).toHaveBeenCalledTimes(1)
    expect(emitWalletAdjusment).toHaveBeenCalledTimes(0)
  })
})
