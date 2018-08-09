import { EventBusListener } from '@magic8bot/event-bus'
import { dbDriver, Wallet, eventBus, EVENT, Adjustment } from '@lib'
import { SessionStore } from './session.store'

const singleton = Symbol()
const singletonEnforcer = Symbol()

export interface WalletOpts {
  exchange: string
  symbol: string
  strategy: string
}

export class WalletStore {
  public static get instance(): WalletStore {
    if (!this[singleton]) this[singleton] = new WalletStore(singletonEnforcer)
    return this[singleton]
  }

  private sessionId: string = SessionStore.instance.sessionId
  private wallets: Map<string, Wallet> = new Map()

  constructor(enforcer: Symbol) {
    if (enforcer !== singletonEnforcer) {
      throw new Error('Cannot construct singleton')
    }
  }

  public async initWallet(walletOpts: WalletOpts, adjustment: Adjustment) {
    await this.loadOrNewWallet(walletOpts, adjustment)
    this.subcribeToWalletEvents(walletOpts)
  }

  public getWallet(walletOpts: WalletOpts) {
    const idStr = this.makeIdStr(walletOpts)
    return this.wallets.get(idStr)
  }

  private async loadOrNewWallet(walletOpts: WalletOpts, adjustment: Adjustment) {
    const idStr = this.makeIdStr(walletOpts)

    const wallet = await this.loadWallet(walletOpts)
    if (wallet) {
      this.wallets.set(idStr, wallet)
      return wallet
    }

    this.wallets.set(idStr, { asset: 0, currency: 0 })
    await this.adjustWallet(walletOpts, adjustment)
  }

  private async loadWallet(walletOpts: WalletOpts): Promise<Wallet> {
    const wallet = await dbDriver.wallet.findOne({ sessionId: this.sessionId, ...walletOpts })

    return !wallet ? null : { asset: wallet.asset, currency: wallet.currency }
  }

  private subcribeToWalletEvents(walletOpts: WalletOpts) {
    const { exchange, symbol, strategy } = walletOpts
    const walletListener: EventBusListener<Adjustment> = eventBus.get(EVENT.WALLET_ADJUST)(exchange)(symbol)(strategy).listen

    walletListener((adjustment: Adjustment) => this.adjustWallet(walletOpts, adjustment))
  }

  private async adjustWallet(walletOpts: WalletOpts, adjustment: Adjustment) {
    const idStr = this.makeIdStr(walletOpts)

    const wallet = this.wallets.get(idStr)

    wallet.asset += adjustment.asset
    wallet.currency += adjustment.currency

    const timestamp = new Date().getTime()
    await dbDriver.adjustment.save({ sessionId: this.sessionId, ...walletOpts, timestamp, ...adjustment })

    this.saveWallet(walletOpts)
  }

  private async saveWallet(walletOpts: WalletOpts) {
    const idStr = this.makeIdStr(walletOpts)
    const timestamp = new Date().getTime()
    const wallet = this.wallets.get(idStr)
    await dbDriver.wallet.updateOne({ sessionId: this.sessionId, ...walletOpts }, { $set: { timestamp, ...wallet } }, { upsert: true })
  }

  private makeIdStr({ exchange, symbol, strategy }: WalletOpts) {
    return `${exchange}.${symbol}.${strategy}`
  }
}
