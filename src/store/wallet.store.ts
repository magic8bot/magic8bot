import { EventBusListener } from '@magic8bot/event-bus'
import { dbDriver, Wallet, eventBus, EVENT, Adjustment, wsServer } from '@lib'
import { SessionStore } from './session.store'
import { AdjustmentStore } from './adjustment.store'
import { StoreOpts } from '@m8bTypes'

const singleton = Symbol()

export class WalletStore {
  public static get instance(): WalletStore {
    /* istanbul ignore next */
    if (!this[singleton]) this[singleton] = new WalletStore()
    return this[singleton]
  }

  private readonly adjustmentStore = AdjustmentStore.instance

  private sessionId: string = SessionStore.instance.sessionId
  private wallets: Map<string, Wallet> = new Map()

  private constructor() {}

  public async initWallet(storeOpts: StoreOpts, adjustment: Adjustment) {
    await this.loadOrNewWallet(storeOpts, adjustment)
    this.subcribeToWalletEvents(storeOpts)
    wsServer.broadcast('wallet', { ...storeOpts, wallet: this.getWallet(storeOpts) })
  }

  public getWallet(storeOpts: StoreOpts) {
    const idStr = this.makeIdStr(storeOpts)
    return this.wallets.get(idStr)
  }

  private async loadOrNewWallet(storeOpts: StoreOpts, adjustment: Adjustment) {
    const idStr = this.makeIdStr(storeOpts)

    const wallet = await this.loadWallet(storeOpts)
    if (wallet) {
      this.wallets.set(idStr, wallet)
      return wallet
    }

    this.wallets.set(idStr, { asset: 0, currency: 0 })
    await this.adjustWallet(storeOpts, adjustment)
  }

  private async loadWallet(storeOpts: StoreOpts): Promise<Wallet> {
    const wallet = await dbDriver.wallet.findOne({ sessionId: this.sessionId, ...storeOpts })

    return !wallet ? null : { asset: wallet.asset, currency: wallet.currency }
  }

  private subcribeToWalletEvents(storeOpts: StoreOpts) {
    const { exchange, symbol, strategy } = storeOpts
    const walletListener: EventBusListener<Adjustment> = eventBus.get(EVENT.WALLET_ADJUST)(exchange)(symbol)(strategy).listen

    /* istanbul ignore next */
    walletListener((adjustment: Adjustment) => this.adjustWallet(storeOpts, adjustment))
  }

  private async adjustWallet(storeOpts: StoreOpts, adjustment: Adjustment) {
    const idStr = this.makeIdStr(storeOpts)

    const wallet = this.wallets.get(idStr)

    wallet.asset += adjustment.asset
    wallet.currency += adjustment.currency

    await this.adjustmentStore.adjustWallet(storeOpts, adjustment)

    this.saveWallet(storeOpts)
  }

  private async saveWallet(storeOpts: StoreOpts) {
    const idStr = this.makeIdStr(storeOpts)
    const timestamp = new Date().getTime()
    const wallet = this.wallets.get(idStr)
    await dbDriver.wallet.updateOne({ sessionId: this.sessionId, ...storeOpts }, { $set: { timestamp, ...wallet } }, { upsert: true })
    wsServer.broadcast('wallet', { ...storeOpts, wallet: this.getWallet(storeOpts) })
  }

  private makeIdStr({ exchange, symbol, strategy }: StoreOpts) {
    return `${exchange}.${symbol}.${strategy}`
  }
}
