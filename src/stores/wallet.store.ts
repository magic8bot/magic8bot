import { dbDriver, Wallet, eventBus, EVENT, Adjustment } from '@lib'
import { sessionStore } from './session.store'

export interface WalletOpts {
  exchange: string
  symbol: string
  strategy: string
}

export class WalletStore {
  private sessionId: string = sessionStore.sessionId
  private wallets: Map<string, Wallet> = new Map()

  public async initWallet(walletOpts: WalletOpts, adjustment: Adjustment) {
    await this.loadOrNewWallet(walletOpts, adjustment)
    this.subcribeToWalletEvents(walletOpts)
  }

  public getWallet(walletOpts: WalletOpts) {
    const idStr = this.makeIdStr(walletOpts)
    return this.wallets.get(idStr)
  }

  private async loadOrNewWallet(walletOpts: WalletOpts, adjustment: Adjustment) {
    const wallet = await this.loadWallet(walletOpts)
    if (wallet) return wallet

    const idStr = this.makeIdStr(walletOpts)
    this.wallets.set(idStr, { asset: 0, currency: 0 })
    await this.adjustWallet(walletOpts, adjustment)
  }

  private async loadWallet(walletOpts: WalletOpts): Promise<Wallet> {
    const wallet = await dbDriver.wallet.findOne({ sessionId: this.sessionId, ...walletOpts })

    return !wallet ? null : { asset: wallet.asset, currency: wallet.currency }
  }

  private subcribeToWalletEvents(walletOpts: WalletOpts) {
    eventBus.subscribe({ event: EVENT.WALLET_ADJUST, ...walletOpts }, (adjustment: Adjustment) =>
      this.adjustWallet(walletOpts, adjustment)
    )
  }

  private async adjustWallet(walletOpts: WalletOpts, adjustment: Adjustment) {
    const idStr = this.makeIdStr(walletOpts)
    const timestamp = new Date().getTime()
    await dbDriver.wallet.save({ sessionId: this.sessionId, ...walletOpts, timestamp, ...adjustment })

    const wallet = this.wallets.get(idStr)

    wallet.asset += adjustment.asset
    wallet.currency += adjustment.currency

    this.saveWallet(walletOpts)
  }

  private async saveWallet(walletOpts: WalletOpts) {
    const idStr = this.makeIdStr(walletOpts)
    const timestamp = new Date().getTime()
    const wallet = this.wallets.get(idStr)
    await dbDriver.wallet.save({ sessionId: this.sessionId, ...walletOpts, timestamp, ...wallet })
  }

  private makeIdStr({ exchange, symbol, strategy }: WalletOpts) {
    return `${exchange}.${symbol}.${strategy}`
  }
}
