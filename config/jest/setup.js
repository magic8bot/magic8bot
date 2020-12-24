jest.mock('crypto', () => ({ randomBytes: () => ({ toString: () => 'random-string' }) }))

const mockA = jest.fn()
const mockB = jest.fn()
mockA.mockReturnValue(mockB)
mockB.mockReturnValue(mockA)

mockA.get = jest.fn().mockReturnValue(mockB)
mockA.emit = jest.fn()
mockA.listen = jest.fn()

mockB.get = jest.fn().mockReturnValue(mockA)
mockB.emit = jest.fn()
mockB.listen = jest.fn()

jest.mock('../../src/lib/event-bus', () => {
  return { eventBus: mockA }
})

jest.mock('../../src/lib/ws-server', () => {
  const wsServer = {
    init: jest.fn(),
    broadcast: jest.fn(),
    registerAction: jest.fn(),
  }
  return { wsServer }
})

jest.mock('@magic8bot/db', () => {
  const { db } = global

  const dbDriver = {
    get trade() {
      return db.collection('trades')
    },
    get option() {
      return db.collection('options')
    },
    get marker() {
      return db.collection('markers')
    },
    get order() {
      return db.collection('orders')
    },
    get wallet() {
      return db.collection('wallets')
    },
    get adjustment() {
      return db.collection('adjustments')
    },
  }

  const AdjustmentModel = {
    adjustWallet: jest.fn(),
  }

  const ExchangeModel = {
    save: jest.fn(),
    load: jest.fn(),
    loadWithAuth: jest.fn(),
    loadAll: jest.fn(),
    loadAllWithAuth: jest.fn(),
    delete: jest.fn(),
  }

  const MarkerModel = {
    saveMarker: jest.fn(),
    findLatestTradeMarker: jest.fn(),
    findInRange: jest.fn(),
  }

  const OrderModel = {
    newOrder: jest.fn(),
    getOpenOrder: jest.fn(),
    saveOrder: jest.fn(),
  }

  const StrategyModel = {
    save: jest.fn(),
    load: jest.fn(),
    loadAll: jest.fn(),
    loadAllForExchange: jest.fn(),
    delete: jest.fn(),
    deleteAllForExchange: jest.fn(),
  }

  const TradeModel = {
    insertTrades: jest.fn(),
    findTrades: jest.fn().mockResolvedValue([]),
  }

  const WalletModel = {
    loadAll: jest.fn(),
    loadWallet: jest.fn(),
    saveWallet: jest.fn(),
  }

  return { dbDriver, AdjustmentModel, ExchangeModel, MarkerModel, OrderModel, StrategyModel, TradeModel, WalletModel }
})

jest.mock('../../src/util/logger', () => {
  const logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
    silly: jest.fn(),
    error: jest.fn(),
  }

  return { logger }
})

jest.mock('../../src/util/async', () => {
  const asyncTimeout = jest.fn().mockResolvedValue()
  const sleep = jest.fn().mockResolvedValue()
  const asyncNextTick = jest.fn().mockResolvedValue()

  return { asyncTimeout, sleep, asyncNextTick }
})
