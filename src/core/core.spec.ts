const mockAddExchange = jest.fn().mockReturnValue(true)
const mockExchangeProvider = jest.fn().mockImplementation(() => ({ addExchange: mockAddExchange }))

jest.mock('../exchange', () => ({ ExchangeProvider: mockExchangeProvider }))

const mockNewSession = jest.fn()
const mockLoadSession = jest.fn()

const mockSessionStore = {
  instance: {
    newSession: mockNewSession,
    loadSession: mockLoadSession,
  },
}

const strategy = {
  symbol: 'test',
  strategyName: 'test',
  share: { asset: 1, currency: 1 },
}
const strategies = [strategy]

const exchange = {
  exchange: 'test',
  tradePollInterval: 0,
  auth: { apiKey: '', secret: '' },
  options: { strategies },
}
const exchanges = [exchange]

const mockLoadAllWithAuth = jest.fn().mockReturnValue(exchanges)
const mockSave = jest.fn()

const mockExchangeStore = {
  instance: {
    loadAllWithAuth: mockLoadAllWithAuth,
    save: mockSave,
  },
}

const mockStrategyStore = {
  instance: {
    save: mockSave,
  },
}

jest.mock('../store', () => ({
  SessionStore: mockSessionStore,
  ExchangeStore: mockExchangeStore,
  StrategyStore: mockStrategyStore,
}))

const mockInit = jest.fn()
const mockExchangeCore = jest.fn().mockImplementation(() => ({ init: mockInit }))

jest.mock('./exchange', () => ({ ExchangeCore: mockExchangeCore }))

import { Core } from './core'

describe('Core', () => {
  afterEach(() => {
    mockExchangeProvider.mockClear()
    mockNewSession.mockReset()
    mockLoadSession.mockReset()
    mockInit.mockReset()
    // mockExchangeCore.mockReset()
  })

  test('loads a session', async () => {
    const core = new Core()
    jest.spyOn<any, any>(core, 'initExchangeCore').mockReturnValue(null)

    await core.init()

    expect(mockLoadSession).toHaveBeenCalledTimes(1)
  })

  test('inits the ExchangeCore', async () => {
    const core = new Core()

    await core.init()

    expect(mockExchangeProvider).toHaveBeenCalledTimes(1)
    expect(mockExchangeCore).toHaveBeenCalledTimes(1)
  })

  test('creates EngineCore for each exchange', async () => {
    const core = new Core()

    mockLoadAllWithAuth.mockReturnValue(exchanges)
    await core.init()

    expect(mockExchangeCore).toHaveBeenCalledTimes(2)
  })
})
