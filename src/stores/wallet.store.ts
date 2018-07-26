import { dbDriver, Balance, Wallet, eventBus, EVENT, OrderItem } from '@lib'
import { sessionStore } from './session.store'

interface WalletOpts {
  exchange: string
  symbol: string
  strategy: string
}

export class WalletStore {
  private sessionId: string = sessionStore.sessionId
  private wallets: Map<string, Wallet> = new Map()

  public async initWallet(walletOpts: WalletOpts, share: number) {
    await this.loadOrNewWallet(walletOpts)
    this.subcribeToWalletEvents(walletOpts)
  }

  public async updateWallet(walletOpts: WalletOpts, { currency, asset }: Balance) {
    const wallet: Wallet = { init: { currency, asset }, current: { currency, asset } }
    const idStr = this.makeIdStr(walletOpts)
    this.wallets.set(idStr, wallet)

    await this.saveWallet(walletOpts)
  }

  private async loadOrNewWallet(walletOpts: WalletOpts) {
    const wallet = await this.loadWallet(walletOpts)
    if (!wallet) await this.newWallet(walletOpts)
  }

  private async newWallet(walletOpts: WalletOpts) {
    const idStr = this.makeIdStr(walletOpts)
    this.wallets.set(idStr, { init: { asset: null, currency: null }, current: { asset: null, currency: null } })
    await this.saveWallet(walletOpts)
  }

  private async loadWallet({ exchange, symbol, strategy }: WalletOpts) {
    return dbDriver.wallet.findOne({ sessionId: this.sessionId, exchange, symbol, strategy })
  }

  private subcribeToWalletEvents(walletOpts: WalletOpts) {
    const { exchange, symbol } = walletOpts

    eventBus.subscribe({ event: EVENT.ORDER_START, exchange, symbol }, (order: OrderItem) =>
      this.onOrder('start', walletOpts, order)
    )

    eventBus.subscribe({ event: EVENT.ORDER_CANCEL, exchange, symbol }, (order: OrderItem) =>
      this.onOrder('cancel', walletOpts, order)
    )

    eventBus.subscribe({ event: EVENT.ORDER_PARTIAL, exchange, symbol }, (order: OrderItem) =>
      this.onOrder('partial', walletOpts, order)
    )

    eventBus.subscribe({ event: EVENT.ORDER_COMPLETE, exchange, symbol }, (order: OrderItem) =>
      this.onOrder('complete', walletOpts, order)
    )
  }

  private onOrder(eventType: 'start' | 'cancel' | 'partial' | 'complete', walletOpts: WalletOpts, order: OrderItem) {
    const idStr = this.makeIdStr(walletOpts)
    const wallet = this.wallets.get(idStr)

    if (eventType === 'start') this.onOrderStart(wallet, order)
    else if (eventType === 'cancel') this.onOrderCancel(wallet, order)
    else this.onOrderComplete(wallet, order)

    this.saveWallet(walletOpts)
  }

  private onOrderStart(wallet: Wallet, order: OrderItem) {
    if (order.type === 'buy') wallet.current.currency -= order.size * order.price
    else wallet.current.asset -= order.size
  }

  private onOrderCancel(wallet: Wallet, order: OrderItem) {
    if (order.type === 'buy') wallet.current.currency += order.size * order.price
    else wallet.current.asset += order.size
  }

  private onOrderComplete(wallet: Wallet, order: OrderItem) {
    if (order.type === 'buy') wallet.current.asset += order.size
    else wallet.current.currency += order.size * order.price - order.fee
  }

  private async saveWallet({ exchange, symbol, strategy }: WalletOpts) {
    const idStr = this.makeIdStr({ exchange, symbol, strategy })
    const wallet = this.wallets.get(idStr)
    await dbDriver.wallet.save({ sessionId: this.sessionId, exchange, symbol, strategy, ...wallet })
  }

  private makeIdStr({ exchange, symbol, strategy }: WalletOpts) {
    return `${exchange}.${symbol}.${strategy}`
  }
}
