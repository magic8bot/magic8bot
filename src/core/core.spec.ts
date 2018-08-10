const mockExchangeProvider = jest.fn()

jest.mock('../exchange', () => ({ ExchangeProvider: mockExchangeProvider }))

const mockNewSession = jest.fn()
const mockLoadSession = jest.fn()

const mockSessionStore = {
  instance: {
    newSession: mockNewSession,
    loadSession: mockLoadSession,
  },
}

jest.mock('../store', () => ({ SessionStore: mockSessionStore }))

const mockInit = jest.fn()
const mockExchangeCore = jest.fn().mockImplementation(() => ({ init: mockInit }))

jest.mock('./exchange', () => ({ ExchangeCore: mockExchangeCore }))

import { Core } from './core'

describe('Core', () => {
  const strategy = {
    symbol: 'test',
    strategyName: 'test',
    share: { asset: 1, currency: 1 },
  }
  const strategies = [strategy]

  const exchange = {
    exchangeName: 'test',
    tradePollInterval: 0,
    auth: { apiKey: '', secret: '' },
    options: { strategies },
  }
  const exchanges = [exchange]

  afterEach(() => {
    mockExchangeProvider.mockClear()
    mockNewSession.mockClear()
    mockLoadSession.mockClear()
    mockInit.mockClear()
    mockExchangeCore.mockClear()
  })

  test('inits the ExchangeCore', async () => {
    const core = new Core({ mode: 'live', exchanges })

    await core.init()

    expect(mockExchangeProvider).toHaveBeenCalledTimes(1)
    expect(mockExchangeCore).toHaveBeenCalledTimes(1)
  })

  test('creates a new session', async () => {
    const core = new Core({ mode: 'live', exchanges, resetSession: true })

    await core.init()

    expect(mockNewSession).toHaveBeenCalledTimes(1)
  })

  test('loads a session', async () => {
    const core = new Core({ mode: 'live', exchanges, resetSession: false })

    await core.init()

    expect(mockLoadSession).toHaveBeenCalledTimes(1)
  })

  test('creates EngineCore for each exchange', async () => {
    const core = new Core({ mode: 'live', exchanges: [exchange, exchange] })

    await core.init()

    expect(mockExchangeCore).toHaveBeenCalledTimes(2)
  })
})
