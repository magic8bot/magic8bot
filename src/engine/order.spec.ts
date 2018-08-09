const mockAsset = 5
const mockCurrency = 200
const mockPrice = 100
const mockWalletStore: any = {
  instance: {
    getWallet: jest.fn().mockReturnValue({ asset: mockAsset, currency: mockCurrency }),
  },
}

const MOCK_ORDER_STATE = {
  PENDING: 'pending',
  PENDING_CANCEL: 'pending_cancel',
  DONE: 'done',
  CANCELED: 'canceled',
}

const mockAddSymbol = jest.fn()
const mockNewOrder = jest.fn()
const mockCloseOpenOrder = jest.fn()
const mockUpdateOrder = jest.fn()
const mockSaveOrder = jest.fn()
const mockGetOpenOrder = jest.fn()
const mockUpdateOrderState = jest.fn()

// tslint:disable-next-line:only-arrow-functions
const mockOrderStore: any = {
  instance: {
    addSymbol: mockAddSymbol,
    newOrder: mockNewOrder,
    closeOpenOrder: mockCloseOpenOrder,
    updateOrder: mockUpdateOrder,
    saveOrder: mockSaveOrder,
    getOpenOrder: mockGetOpenOrder,
    updateOrderState: mockUpdateOrderState,
  },
}

jest.mock('../stores', () => {
  return { WalletStore: mockWalletStore, OrderStore: mockOrderStore, ORDER_STATE: MOCK_ORDER_STATE }
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

const mockId = 'test'
const mockStrategyConf: any = {
  markUp: 0,
  markDown: 0,
  strategyName: mockId,
  orderPollInterval: 0,
  orderSlippageAdjustmentTolerance: 0,
}

import { OrderEngine } from './order'
import { InsufficientFunds, OrderNotFound } from 'ccxt'

describe('OrderEngine', () => {
  const storeOpts = { exchange: mockId, strategy: mockId, symbol: mockId }
  let orderEngine: OrderEngine
  let mockEmitWalletAdjustment

  beforeEach(() => {
    orderEngine = new OrderEngine(mockExchangeProvider, mockId, mockId, mockStrategyConf)
    mockEmitWalletAdjustment = jest.spyOn<any, any>(orderEngine, 'emitWalletAdjustment').mockReturnValueOnce(undefined)
  })

  afterEach(() => {
    mockEmitWalletAdjustment.mockReset()
    mockNewOrder.mockReset()
    mockCloseOpenOrder.mockReset()
    mockUpdateOrder.mockReset()
    mockSaveOrder.mockReset()
    mockGetOpenOrder.mockReset()
    mockUpdateOrderState.mockReset()
    mockAmountToPrecision.mockReset()
    mockPlaceOrder.mockReset()
    mockCheckOrder.mockReset()
    mockPriceToPrecision.mockReset()
    mockCancelOrder.mockReset()
  })

  test('can get a wallet', () => {
    const wallet = orderEngine.wallet
    expect(wallet.asset).toEqual(5)
    expect(wallet.currency).toEqual(200)
  })

  test('executes a buy', async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision.mockReturnValueOnce(mockPrice).mockReturnValueOnce(mockCurrency)

    const placeOrder = jest.spyOn<any, any>(orderEngine, 'placeOrder').mockReturnValueOnce({ id: mockId })
    const checkOrder = jest.spyOn<any, any>(orderEngine, 'checkOrder').mockReturnValueOnce(undefined)

    await orderEngine.executeBuy()

    const currency = -(amount * mockPrice)
    const expectedAdjustment = { asset: 0, currency, type: 'newOrder' }
    const expectedOrderOpts = { symbol: mockId, price: mockPrice, amount, type: 'limit', side: 'buy' }

    expect(mockPriceToPrecision).toHaveBeenCalledTimes(2)
    expect(mockAmountToPrecision).toHaveBeenCalledTimes(1)
    expect(placeOrder).toHaveBeenCalledTimes(1)
    expect(placeOrder).toHaveBeenCalledWith(expectedOrderOpts, expectedAdjustment)
    expect(checkOrder).toHaveBeenCalledTimes(1)
  })

  test('executes a sell', async () => {
    mockAmountToPrecision.mockReturnValueOnce(mockAsset)
    mockPriceToPrecision.mockReturnValueOnce(mockPrice)

    const placeOrder = jest.spyOn<any, any>(orderEngine, 'placeOrder').mockReturnValueOnce({ id: mockId })
    const checkOrder = jest.spyOn<any, any>(orderEngine, 'checkOrder').mockReturnValueOnce(undefined)

    await orderEngine.executeSell()

    const expectedAdjustment = { asset: -mockAsset, currency: 0, type: 'newOrder' }
    const expectedOrderOpts = { symbol: mockId, price: mockPrice, amount: mockAsset, type: 'limit', side: 'sell' }

    expect(mockPriceToPrecision).toHaveBeenCalledTimes(1)
    expect(mockAmountToPrecision).toHaveBeenCalledTimes(1)
    expect(placeOrder).toHaveBeenCalledTimes(1)
    expect(placeOrder).toHaveBeenCalledWith(expectedOrderOpts, expectedAdjustment)
    expect(checkOrder).toHaveBeenCalledTimes(1)
  })

  test('does not check order after execute buy fails', async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision.mockReturnValueOnce(mockPrice).mockReturnValueOnce(mockCurrency)

    const placeOrder = jest.spyOn<any, any>(orderEngine, 'placeOrder').mockReturnValueOnce(false)
    const checkOrder = jest.spyOn<any, any>(orderEngine, 'checkOrder').mockReturnValueOnce(undefined)

    await orderEngine.executeBuy()

    expect(mockPriceToPrecision).toHaveBeenCalledTimes(2)
    expect(mockAmountToPrecision).toHaveBeenCalledTimes(1)
    expect(placeOrder).toHaveBeenCalledTimes(1)
    expect(checkOrder).toHaveBeenCalledTimes(0)
  })

  test('does not check order after execute sell fails', async () => {
    mockPriceToPrecision.mockReturnValueOnce(mockPrice)
    mockAmountToPrecision.mockReturnValueOnce(mockAsset)

    const placeOrder = jest.spyOn<any, any>(orderEngine, 'placeOrder').mockReturnValueOnce(false)
    jest.spyOn<any, any>(orderEngine, 'checkOrder').mockReturnValueOnce(undefined)

    await orderEngine.executeSell()

    expect(mockPriceToPrecision).toHaveBeenCalledTimes(1)
    expect(mockAmountToPrecision).toHaveBeenCalledTimes(1)
    expect(placeOrder).toHaveBeenCalledTimes(1)
    expect(mockEmitWalletAdjustment).toHaveBeenCalledTimes(0)
  })

  test('handle wallet adjustment for successful orders', async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision.mockReturnValueOnce(mockPrice).mockReturnValueOnce(mockCurrency)

    mockPlaceOrder.mockReturnValueOnce({ id: mockId })

    const checkOrder = jest.spyOn<any, any>(orderEngine, 'checkOrder').mockReturnValueOnce(undefined)

    await orderEngine.executeBuy()

    const currency = -(amount * mockPrice)
    const expectedOrderOpts = { symbol: mockId, price: mockPrice, amount, type: 'limit', side: 'buy' }
    const expectedAdjustment = { asset: 0, currency, type: 'newOrder' }

    expect(mockPlaceOrder).toHaveBeenCalledTimes(1)
    expect(mockPlaceOrder).toHaveBeenCalledWith(mockId, expectedOrderOpts)
    expect(mockEmitWalletAdjustment).toHaveBeenCalledTimes(1)
    expect(mockEmitWalletAdjustment).toHaveBeenCalledWith(expectedAdjustment)
    expect(mockNewOrder).toHaveBeenCalledTimes(1)
    expect(checkOrder).toHaveBeenCalledTimes(1)
  })

  test('handle wallet adjustment for insufficient funds orders', async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision.mockReturnValueOnce(mockPrice).mockReturnValueOnce(mockCurrency)

    mockPlaceOrder.mockImplementation(() => {
      throw new InsufficientFunds('no monies')
    })

    const checkOrder = jest.spyOn<any, any>(orderEngine, 'checkOrder').mockReturnValueOnce(undefined)

    await orderEngine.executeBuy()

    const currency = -(amount * mockPrice)
    const expectedOrderOpts = { symbol: mockId, price: mockPrice, amount, type: 'limit', side: 'buy' }
    const expectedAdjustment = { asset: 0, currency, type: 'newOrder' }

    expect(mockPlaceOrder).toHaveBeenCalledTimes(1)
    expect(mockPlaceOrder).toHaveBeenCalledWith(mockId, expectedOrderOpts)
    expect(mockEmitWalletAdjustment).toHaveBeenCalledTimes(1)
    expect(mockEmitWalletAdjustment).toHaveBeenCalledWith(expectedAdjustment)
    expect(mockNewOrder).toHaveBeenCalledTimes(0)
    expect(checkOrder).toHaveBeenCalledTimes(0)
  })

  test("don't adjust wallet on failed orders", async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision.mockReturnValueOnce(mockPrice).mockReturnValueOnce(mockCurrency)

    mockPlaceOrder.mockImplementation(() => {
      throw new Error('done goofed')
    })

    const checkOrder = jest.spyOn<any, any>(orderEngine, 'checkOrder').mockReturnValueOnce(undefined)

    await orderEngine.executeBuy()

    const expectedOrderOpts = { symbol: mockId, price: mockPrice, amount, type: 'limit', side: 'buy' }

    expect(mockPlaceOrder).toHaveBeenCalledTimes(1)
    expect(mockPlaceOrder).toHaveBeenCalledWith(mockId, expectedOrderOpts)
    expect(mockEmitWalletAdjustment).toHaveBeenCalledTimes(0)
    expect(mockNewOrder).toHaveBeenCalledTimes(0)
    expect(checkOrder).toHaveBeenCalledTimes(0)
  })

  test('adjust orders with status open', async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision.mockReturnValueOnce(mockPrice).mockReturnValueOnce(mockCurrency)

    const order = { id: mockId, status: 'open' }
    mockPlaceOrder.mockReturnValueOnce(order)
    mockCheckOrder.mockReturnValueOnce(order)

    const updateOrder = jest.spyOn<any, any>(orderEngine, 'updateOrder').mockReturnValueOnce(undefined)
    const adjustOrder = jest.spyOn<any, any>(orderEngine, 'adjustOrder').mockReturnValueOnce(undefined)

    await orderEngine.executeBuy()

    expect(updateOrder).toHaveBeenCalledTimes(1)
    expect(updateOrder).toHaveBeenCalledWith(order)
    expect(adjustOrder).toHaveBeenCalledTimes(1)
    expect(adjustOrder).toHaveBeenCalledWith(mockId)
    expect(mockCloseOpenOrder).toHaveBeenCalledTimes(0)
  })

  test('close orders with status not open', async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision.mockReturnValueOnce(mockPrice).mockReturnValueOnce(mockCurrency)

    const order = { id: mockId, status: 'open' }
    mockPlaceOrder.mockReturnValueOnce(order)
    mockCheckOrder.mockReturnValueOnce({ ...order, status: 'closed' })

    const updateOrder = jest.spyOn<any, any>(orderEngine, 'updateOrder').mockReturnValueOnce(undefined)
    const adjustOrder = jest.spyOn<any, any>(orderEngine, 'adjustOrder').mockReturnValueOnce(undefined)

    await orderEngine.executeBuy()

    expect(updateOrder).toHaveBeenCalledTimes(1)
    expect(updateOrder).toHaveBeenCalledWith({ ...order, status: 'closed' })
    expect(adjustOrder).toHaveBeenCalledTimes(0)
    expect(mockCloseOpenOrder).toHaveBeenCalledTimes(1)
    expect(mockCloseOpenOrder).toHaveBeenCalledWith(storeOpts, mockId)
  })

  test('update and save order', async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision.mockReturnValueOnce(mockPrice).mockReturnValueOnce(mockCurrency)

    const order = { id: mockId, status: 'open' }
    mockPlaceOrder.mockReturnValueOnce(order)
    mockCheckOrder.mockReturnValueOnce(order)

    const adjustWallet = jest.spyOn<any, any>(orderEngine, 'adjustWallet').mockReturnValueOnce(undefined)
    jest.spyOn<any, any>(orderEngine, 'adjustOrder').mockReturnValueOnce(undefined)

    await orderEngine.executeBuy()

    expect(adjustWallet).toHaveBeenCalledTimes(1)
    expect(adjustWallet).toHaveBeenCalledWith(order)
    expect(mockUpdateOrder).toHaveBeenCalledTimes(1)
    expect(mockUpdateOrder).toHaveBeenCalledWith(storeOpts, order)
    expect(mockSaveOrder).toHaveBeenCalledTimes(1)
    expect(mockSaveOrder).toHaveBeenCalledWith(mockId, order)
  })

  test('adjust wallet when partial buy fill', async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision.mockReturnValueOnce(mockPrice).mockReturnValueOnce(mockCurrency)

    const order = { id: mockId, status: 'open', side: 'buy', filled: amount / 2 }
    const orderFill = { ...order, filled: amount }
    mockPlaceOrder.mockReturnValueOnce(order)
    mockCheckOrder.mockReturnValueOnce(orderFill)
    mockGetOpenOrder.mockReturnValueOnce(order)

    jest.spyOn<any, any>(orderEngine, 'adjustOrder').mockReturnValueOnce(undefined)

    const expectedAdjustment = { asset: amount / 2, currency: 0, type: 'fillOrder' }

    await orderEngine.executeBuy()

    expect(mockGetOpenOrder).toHaveBeenCalledTimes(1)
    expect(mockGetOpenOrder).toHaveBeenCalledWith(storeOpts, mockId)
    expect(mockEmitWalletAdjustment).toHaveBeenCalledTimes(2)
    expect(mockEmitWalletAdjustment).toHaveBeenLastCalledWith(expectedAdjustment)
  })

  test('adjust wallet when partial sell fill', async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision.mockReturnValueOnce(mockPrice).mockReturnValueOnce(mockCurrency)

    const order = { id: mockId, status: 'open', side: 'sell', cost: (mockAsset / 2) * mockPrice }
    const orderFill = { ...order, cost: mockAsset * mockPrice }
    mockPlaceOrder.mockReturnValueOnce(order)
    mockCheckOrder.mockReturnValueOnce(orderFill)
    mockGetOpenOrder.mockReturnValueOnce(order)

    jest.spyOn<any, any>(orderEngine, 'adjustOrder').mockReturnValueOnce(undefined)

    const expectedAdjustment = { asset: 0, currency: 250, type: 'fillOrder' }

    await orderEngine.executeSell()

    expect(mockGetOpenOrder).toHaveBeenCalledTimes(1)
    expect(mockGetOpenOrder).toHaveBeenCalledWith(storeOpts, mockId)
    expect(mockEmitWalletAdjustment).toHaveBeenCalledTimes(2)
    expect(mockEmitWalletAdjustment).toHaveBeenLastCalledWith(expectedAdjustment)
  })

  test('recheck order with if no slippage', async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision
      .mockReturnValueOnce(mockPrice)
      .mockReturnValueOnce(mockCurrency)
      .mockReturnValueOnce(mockPrice)

    const order = { id: mockId, status: 'open', side: 'buy', price: mockPrice }
    mockPlaceOrder.mockReturnValueOnce(order)
    mockCheckOrder.mockReturnValueOnce(order).mockReturnValueOnce({ ...order, status: 'closed' })
    mockGetOpenOrder
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)

    const executeBuy = jest.spyOn(orderEngine, 'executeBuy')
    const checkOrder = jest.spyOn<any, any>(orderEngine, 'checkOrder')

    await orderEngine.executeBuy()

    expect(executeBuy).toHaveBeenCalledTimes(1)
    expect(checkOrder).toHaveBeenCalledTimes(2)
  })

  test('re-execute order if slippage (buy)', async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision
      .mockReturnValueOnce(mockPrice)
      .mockReturnValueOnce(mockCurrency)
      .mockReturnValueOnce(mockPrice + 1)

    const order = { id: mockId, status: 'open', side: 'buy', price: mockPrice }
    mockPlaceOrder.mockReturnValueOnce(order).mockReturnValueOnce(false)
    mockCheckOrder.mockReturnValueOnce(order)
    mockGetOpenOrder
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)

    const executeBuy = jest.spyOn(orderEngine, 'executeBuy')
    const checkOrder = jest.spyOn<any, any>(orderEngine, 'checkOrder')
    const cancelOrder = jest.spyOn<any, any>(orderEngine, 'cancelOrder').mockImplementationOnce(() => true)

    await orderEngine.executeBuy()

    expect(executeBuy).toHaveBeenCalledTimes(2)
    expect(cancelOrder).toHaveBeenCalledTimes(1)
    expect(cancelOrder).toHaveBeenCalledWith(mockId)
    expect(checkOrder).toHaveBeenCalledTimes(1)
  })

  test('re-execute order if slippage (buy) w/ tolerance', async () => {
    // @ts-ignore
    orderEngine.orderSlippageAdjustmentTolerance = 1

    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision
      .mockReturnValueOnce(mockPrice)
      .mockReturnValueOnce(mockCurrency)
      .mockReturnValueOnce(mockPrice + 2)

    const order = { id: mockId, status: 'open', side: 'buy', price: mockPrice }
    mockPlaceOrder.mockReturnValueOnce(order).mockReturnValueOnce(false)
    mockCheckOrder.mockReturnValueOnce(order)
    mockGetOpenOrder
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)

    const executeBuy = jest.spyOn(orderEngine, 'executeBuy')
    const checkOrder = jest.spyOn<any, any>(orderEngine, 'checkOrder')
    const cancelOrder = jest.spyOn<any, any>(orderEngine, 'cancelOrder').mockImplementationOnce(() => true)

    await orderEngine.executeBuy()

    expect(executeBuy).toHaveBeenCalledTimes(2)
    expect(cancelOrder).toHaveBeenCalledTimes(1)
    expect(cancelOrder).toHaveBeenCalledWith(mockId)
    expect(checkOrder).toHaveBeenCalledTimes(1)
  })

  test("don't re-execute order if no-slippage (buy) w/ tolerance", async () => {
    // @ts-ignore
    orderEngine.orderSlippageAdjustmentTolerance = 1

    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision
      .mockReturnValueOnce(mockPrice)
      .mockReturnValueOnce(mockCurrency)
      .mockReturnValueOnce(mockPrice + 1)

    const order = { id: mockId, status: 'open', side: 'buy', price: mockPrice }
    mockPlaceOrder.mockReturnValueOnce(order).mockReturnValueOnce(false)
    mockCheckOrder.mockReturnValueOnce(order).mockReturnValueOnce({ ...order, status: 'closed' })
    mockGetOpenOrder
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)

    const executeBuy = jest.spyOn(orderEngine, 'executeBuy')
    const checkOrder = jest.spyOn<any, any>(orderEngine, 'checkOrder')
    const cancelOrder = jest.spyOn<any, any>(orderEngine, 'cancelOrder').mockImplementationOnce(() => true)

    await orderEngine.executeBuy()

    expect(executeBuy).toHaveBeenCalledTimes(1)
    expect(cancelOrder).toHaveBeenCalledTimes(0)
    expect(checkOrder).toHaveBeenCalledTimes(2)
  })

  test('re-execute order if slippage (sell)', async () => {
    mockAmountToPrecision.mockReturnValueOnce(mockAsset)
    mockPriceToPrecision.mockReturnValueOnce(mockPrice).mockReturnValueOnce(mockPrice - 1)

    const order = { id: mockId, status: 'open', side: 'sell', price: mockPrice }
    mockPlaceOrder.mockReturnValueOnce(order).mockReturnValueOnce(false)
    mockCheckOrder.mockReturnValueOnce(order)
    mockGetOpenOrder
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)

    const executeSell = jest.spyOn(orderEngine, 'executeSell')
    const checkOrder = jest.spyOn<any, any>(orderEngine, 'checkOrder')
    const cancelOrder = jest.spyOn<any, any>(orderEngine, 'cancelOrder').mockImplementationOnce(() => true)

    await orderEngine.executeSell()

    expect(executeSell).toHaveBeenCalledTimes(2)
    expect(cancelOrder).toHaveBeenCalledTimes(1)
    expect(cancelOrder).toHaveBeenCalledWith(mockId)
    expect(checkOrder).toHaveBeenCalledTimes(1)
  })

  test('re-execute order if slippage (sell) w/ tolerance', async () => {
    // @ts-ignore
    orderEngine.orderSlippageAdjustmentTolerance = 1

    mockAmountToPrecision.mockReturnValueOnce(mockAsset)
    mockPriceToPrecision.mockReturnValueOnce(mockPrice).mockReturnValueOnce(mockPrice - 2)

    const order = { id: mockId, status: 'open', side: 'sell', price: mockPrice }
    mockPlaceOrder.mockReturnValueOnce(order).mockReturnValueOnce(false)
    mockCheckOrder.mockReturnValueOnce(order)
    mockGetOpenOrder
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)

    const executeSell = jest.spyOn(orderEngine, 'executeSell')
    const checkOrder = jest.spyOn<any, any>(orderEngine, 'checkOrder')
    const cancelOrder = jest.spyOn<any, any>(orderEngine, 'cancelOrder').mockImplementationOnce(() => true)

    await orderEngine.executeSell()

    expect(executeSell).toHaveBeenCalledTimes(2)
    expect(cancelOrder).toHaveBeenCalledTimes(1)
    expect(cancelOrder).toHaveBeenCalledWith(mockId)
    expect(checkOrder).toHaveBeenCalledTimes(1)
  })

  test("don't re-execute order if slippage (sell) w/ tolerance", async () => {
    // @ts-ignore
    orderEngine.orderSlippageAdjustmentTolerance = 1

    mockAmountToPrecision.mockReturnValueOnce(mockAsset)
    mockPriceToPrecision.mockReturnValueOnce(mockPrice).mockReturnValueOnce(mockPrice - 1)

    const order = { id: mockId, status: 'open', side: 'sell', price: mockPrice }
    mockPlaceOrder.mockReturnValueOnce(order).mockReturnValueOnce(false)
    mockCheckOrder.mockReturnValueOnce(order).mockReturnValueOnce({ ...order, status: 'closed' })
    mockGetOpenOrder
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)

    const executeSell = jest.spyOn(orderEngine, 'executeSell')
    const checkOrder = jest.spyOn<any, any>(orderEngine, 'checkOrder')
    const cancelOrder = jest.spyOn<any, any>(orderEngine, 'cancelOrder').mockImplementationOnce(() => true)

    await orderEngine.executeSell()

    expect(executeSell).toHaveBeenCalledTimes(1)
    expect(cancelOrder).toHaveBeenCalledTimes(0)
    expect(checkOrder).toHaveBeenCalledTimes(2)
  })

  test("don't re-execute order if slippage and cancel fails", async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision
      .mockReturnValueOnce(mockPrice)
      .mockReturnValueOnce(mockCurrency)
      .mockReturnValueOnce(mockPrice - 1)

    const order = { id: mockId, status: 'open', side: 'sell', price: mockPrice }
    mockPlaceOrder.mockReturnValueOnce(order).mockReturnValueOnce(false)
    mockCheckOrder.mockReturnValueOnce(order)
    mockGetOpenOrder
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)

    const executeBuy = jest.spyOn(orderEngine, 'executeBuy')
    const checkOrder = jest.spyOn<any, any>(orderEngine, 'checkOrder')
    const cancelOrder = jest.spyOn<any, any>(orderEngine, 'cancelOrder').mockImplementationOnce(() => false)

    await orderEngine.executeBuy()

    expect(executeBuy).toHaveBeenCalledTimes(1)
    expect(cancelOrder).toHaveBeenCalledTimes(1)
    expect(checkOrder).toHaveBeenCalledTimes(1)
  })

  test('update order state if slippage', async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision
      .mockReturnValueOnce(mockPrice)
      .mockReturnValueOnce(mockCurrency)
      .mockReturnValueOnce(mockPrice - 1)

    const order = { id: mockId, status: 'open', side: 'sell', price: mockPrice }
    mockPlaceOrder.mockReturnValueOnce(order).mockReturnValueOnce(false)
    mockCheckOrder.mockReturnValueOnce(order)
    mockGetOpenOrder
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)

    await orderEngine.executeBuy()

    expect(mockUpdateOrderState).toHaveBeenCalledTimes(2)
    expect(mockUpdateOrderState).toHaveBeenNthCalledWith(1, storeOpts, mockId, MOCK_ORDER_STATE.PENDING_CANCEL)
    expect(mockUpdateOrderState).toHaveBeenNthCalledWith(2, storeOpts, mockId, MOCK_ORDER_STATE.CANCELED)
  })

  test('update order state if slippage and OrderNotFound error', async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision
      .mockReturnValueOnce(mockPrice)
      .mockReturnValueOnce(mockCurrency)
      .mockReturnValueOnce(mockPrice - 1)

    const order = { id: mockId, status: 'open', side: 'sell', price: mockPrice }
    mockPlaceOrder.mockReturnValueOnce(order).mockReturnValueOnce(false)
    mockCheckOrder.mockReturnValueOnce(order)
    mockGetOpenOrder
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)

    mockCancelOrder.mockImplementation(() => {
      throw new OrderNotFound('nope')
    })

    await orderEngine.executeBuy()

    expect(mockUpdateOrderState).toHaveBeenCalledTimes(2)
    expect(mockUpdateOrderState).toHaveBeenNthCalledWith(1, storeOpts, mockId, MOCK_ORDER_STATE.PENDING_CANCEL)
    expect(mockUpdateOrderState).toHaveBeenNthCalledWith(2, storeOpts, mockId, MOCK_ORDER_STATE.DONE)
  })

  test('update order state if slippage and Error', async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision
      .mockReturnValueOnce(mockPrice)
      .mockReturnValueOnce(mockCurrency)
      .mockReturnValueOnce(mockPrice - 1)

    const order = { id: mockId, status: 'open', side: 'sell', price: mockPrice }
    mockPlaceOrder.mockReturnValueOnce(order).mockReturnValueOnce(false)
    mockCheckOrder.mockReturnValueOnce(order)
    mockGetOpenOrder
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)

    mockCancelOrder.mockImplementation(() => {
      throw new Error('err...')
    })

    await orderEngine.executeBuy()

    expect(mockUpdateOrderState).toHaveBeenCalledTimes(2)
    expect(mockUpdateOrderState).toHaveBeenNthCalledWith(1, storeOpts, mockId, MOCK_ORDER_STATE.PENDING_CANCEL)
    expect(mockUpdateOrderState).toHaveBeenNthCalledWith(2, storeOpts, mockId, MOCK_ORDER_STATE.CANCELED)
  })

  test('refund correct amount for canceled buy', async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision
      .mockReturnValueOnce(mockPrice)
      .mockReturnValueOnce(mockCurrency)
      .mockReturnValueOnce(mockPrice + 1)

    const order = { id: mockId, status: 'open', side: 'buy', price: mockPrice, remaining: amount }
    mockPlaceOrder.mockReturnValueOnce(order).mockReturnValueOnce(false)
    mockCheckOrder.mockReturnValueOnce(order)
    mockGetOpenOrder
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)

    const currency = amount * mockPrice
    const expectedAdjustment = { asset: 0, currency, type: 'cancelOrder' }

    await orderEngine.executeBuy()

    expect(mockEmitWalletAdjustment).toHaveBeenLastCalledWith(expectedAdjustment)
  })

  test('refund correct amount for canceled sell', async () => {
    const amount = (mockCurrency / mockPrice) * 0.995
    mockAmountToPrecision.mockReturnValueOnce(amount)
    mockPriceToPrecision
      .mockReturnValueOnce(mockPrice)
      .mockReturnValueOnce(mockCurrency)
      .mockReturnValueOnce(mockPrice - 1)

    const order = { id: mockId, status: 'open', side: 'sell', price: mockPrice, remaining: amount }
    mockPlaceOrder.mockReturnValueOnce(order).mockReturnValueOnce(false)
    mockCheckOrder.mockReturnValueOnce(order)
    mockGetOpenOrder
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)
      .mockReturnValueOnce(order)

    const expectedAdjustment = { asset: amount, currency: 0, type: 'cancelOrder' }

    await orderEngine.executeBuy()

    expect(mockEmitWalletAdjustment).toHaveBeenLastCalledWith(expectedAdjustment)
  })
})
