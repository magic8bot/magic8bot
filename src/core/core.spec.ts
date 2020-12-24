const mockAddExchange = jest.fn().mockReturnValue(true)
const mockExchangeProvider = jest.fn().mockImplementation(() => ({ addExchange: mockAddExchange }))

jest.mock('../exchange', () => ({ ExchangeProvider: mockExchangeProvider }))

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

const mockInit = jest.fn()
const mockExchangeCore = jest.fn().mockImplementation(() => ({ init: mockInit }))

jest.mock('./exchange', () => ({ ExchangeCore: mockExchangeCore }))

import { core } from './core'

describe.skip('Core', () => {
  afterEach(() => {
    mockExchangeProvider.mockClear()
    mockInit.mockReset()
    // mockExchangeCore.mockReset()
  })

  test('inits the ExchangeCore', async () => {
    // const core = new Core()

    await core.init()

    expect(mockExchangeProvider).toHaveBeenCalledTimes(1)
    expect(mockExchangeCore).toHaveBeenCalledTimes(1)
  })

  test('creates EngineCore for each exchange', async () => {
    // const core = new Core()

    mockLoadAllWithAuth.mockReturnValue(exchanges)
    await core.init()

    expect(mockExchangeCore).toHaveBeenCalledTimes(2)
  })
})
