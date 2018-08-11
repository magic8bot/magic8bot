const mockId = 'test'

import { WalletStore } from './wallet.store'
import { dbDriver } from '@lib'

describe('WalletStore', () => {
  const storeOpts = { exchange: mockId, symbol: mockId, strategy: mockId }
  let walletStore: WalletStore
  let loadOrNewWallet: jest.SpyInstance<any>
  let subcribeToWalletEvents: jest.SpyInstance<any>
  let loadWallet: jest.SpyInstance<any>
  let adjustWallet: jest.SpyInstance<any>

  beforeAll(() => {
    walletStore = WalletStore.instance
    loadOrNewWallet = jest.spyOn<any, any>(walletStore, 'loadOrNewWallet')
    subcribeToWalletEvents = jest.spyOn<any, any>(walletStore, 'subcribeToWalletEvents')
    loadWallet = jest.spyOn<any, any>(walletStore, 'loadWallet')
    adjustWallet = jest.spyOn<any, any>(walletStore, 'adjustWallet')
  })

  beforeEach(() => {
    // @ts-ignore
    walletStore.wallets = new Map()
    loadOrNewWallet.mockClear()
    subcribeToWalletEvents.mockClear()
    loadWallet.mockClear()
    adjustWallet.mockClear()
    dbDriver.wallet.deleteMany({})
  })

  test('inits a wallet', async () => {
    loadOrNewWallet.mockReturnValueOnce(null)
    subcribeToWalletEvents.mockReturnValueOnce(null)

    await walletStore.initWallet(storeOpts, { asset: 0, currency: 0, type: 'init' })

    expect(loadOrNewWallet).toHaveBeenCalledTimes(1)
    expect(subcribeToWalletEvents).toHaveBeenCalledTimes(1)
  })

  test('subscribes to wallet events', async () => {
    loadOrNewWallet.mockReturnValueOnce(null)

    await walletStore.initWallet(storeOpts, { asset: 0, currency: 0, type: 'init' })

    expect(loadOrNewWallet).toHaveBeenCalledTimes(1)
    expect(subcribeToWalletEvents).toHaveBeenCalledTimes(1)
  })

  test('loads a saved wallet', async () => {
    loadWallet.mockReturnValueOnce(true)
    subcribeToWalletEvents.mockReturnValueOnce(null)

    await walletStore.initWallet(storeOpts, { asset: 0, currency: 0, type: 'init' })

    expect(loadWallet).toHaveBeenCalledTimes(1)
    expect(adjustWallet).toHaveBeenCalledTimes(0)
  })

  test('loads a saved wallet (from db)', async () => {
    subcribeToWalletEvents.mockReturnValueOnce(null)

    // Fake save a wallet
    // @ts-ignore
    walletStore.wallets.set('test.test.test', { asset: 0, currency: 0 })
    // @ts-ignore
    await walletStore.saveWallet(storeOpts)
    // @ts-ignore
    walletStore.wallets = new Map()

    await walletStore.initWallet(storeOpts, { asset: 0, currency: 0, type: 'init' })

    expect(loadWallet).toHaveBeenCalledTimes(1)
    expect(adjustWallet).toHaveBeenCalledTimes(0)
  })

  test('creates a new wallet (from db)', async () => {
    adjustWallet.mockReturnValueOnce(null)
    subcribeToWalletEvents.mockReturnValueOnce(null)

    await walletStore.initWallet(storeOpts, { asset: 0, currency: 0, type: 'init' })

    expect(loadWallet).toHaveBeenCalledTimes(1)
    expect(adjustWallet).toHaveBeenCalledTimes(1)
  })

  test('inits a new wallet if none saved', async () => {
    loadWallet.mockReturnValueOnce(null)
    adjustWallet.mockReturnValueOnce(null)
    subcribeToWalletEvents.mockReturnValueOnce(null)

    await walletStore.initWallet(storeOpts, { asset: 0, currency: 0, type: 'init' })

    expect(loadWallet).toHaveBeenCalledTimes(1)
    expect(adjustWallet).toHaveBeenCalledTimes(1)
  })

  test('adjusts wallets', async () => {
    loadWallet.mockReturnValueOnce(null)
    subcribeToWalletEvents.mockReturnValueOnce(null)

    await walletStore.initWallet(storeOpts, { asset: 0, currency: 0, type: 'init' })

    expect(loadWallet).toHaveBeenCalledTimes(1)
    expect(adjustWallet).toHaveBeenCalledTimes(1)
  })

  test("get's a wallet ", async () => {
    const wallet = { asset: 0, currency: 0 }
    // @ts-ignore
    walletStore.wallets.set('test.test.test', wallet)

    const result = walletStore.getWallet(storeOpts)

    expect(result).toEqual(wallet)
  })
})
