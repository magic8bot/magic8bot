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
  const WsServer = class {}
  return { WsServer }
})

jest.mock('../../src/lib/db/db-driver.lib', () => {
  const { db } = global

  const dbDriver = {
    get trade() {
      return db.collection('trades')
    },
    get session() {
      return db.collection('sessions')
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
  }

  return { dbDriver }
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

  return { asyncTimeout, sleep }
})
