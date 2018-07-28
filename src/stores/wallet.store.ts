import { dbDriver, Wallet, eventBus, EVENT, OrderItem } from '@lib'
import { sessionStore } from './session.store'

export interface WalletOpts {
  exchange: string
  symbol: string
  strategy: string
}

export class WalletStore {
  private sessionId: string = sessionStore.sessionId
  private wallets: Map<string, Wallet> = new Map()

  public async initWallet(walletOpts: WalletOpts) {
    const wallet = await this.loadOrNewWallet(walletOpts)
    this.subcribeToWalletEvents(walletOpts)
    return wallet
  }

  public async updateWallet(walletOpts: WalletOpts, { currency, asset }: Wallet) {
    const wallet = { currency, asset }
    const idStr = this.makeIdStr(walletOpts)
    this.wallets.set(idStr, wallet)

    await this.saveWallet(walletOpts)
  }

  public getWallet(walletOpts: WalletOpts) {
    const idStr = this.makeIdStr(walletOpts)
    return this.wallets.get(idStr)
  }

  private async loadOrNewWallet(walletOpts: WalletOpts) {
    const wallet = await this.loadWallet(walletOpts)
    return wallet ? wallet : this.newWallet()
  }

  private newWallet(): Wallet {
    return { asset: null, currency: null }
  }

  private async loadWallet({ exchange, symbol, strategy }: WalletOpts): Promise<Wallet> {
    const wallet = await dbDriver.wallet.findOne({ sessionId: this.sessionId, exchange, symbol, strategy })
    // console.log({ wallet })
    // process.exit()

    if (!wallet) return null

    const { asset, currency } = wallet
    return { asset, currency }
  }

  private subcribeToWalletEvents(walletOpts: WalletOpts) {
    const { exchange, symbol, strategy } = walletOpts

    eventBus.subscribe({ event: EVENT.ORDER_START, exchange, symbol, strategy }, (order: OrderItem) =>
      this.onOrder('start', walletOpts, order)
    )

    eventBus.subscribe({ event: EVENT.ORDER_CANCEL, exchange, symbol, strategy }, (order: OrderItem) =>
      this.onOrder('cancel', walletOpts, order)
    )

    eventBus.subscribe({ event: EVENT.ORDER_PARTIAL, exchange, symbol, strategy }, (order: OrderItem) =>
      this.onOrder('partial', walletOpts, order)
    )

    eventBus.subscribe({ event: EVENT.ORDER_COMPLETE, exchange, symbol, strategy }, (order: OrderItem) =>
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
    if (order.side === 'buy') wallet.currency -= order.size * order.price
    else wallet.asset -= order.size
  }

  private onOrderCancel(wallet: Wallet, order: OrderItem) {
    if (order.side === 'buy') wallet.currency += order.size * order.price
    else wallet.asset += order.size
  }

  private onOrderComplete(wallet: Wallet, order: OrderItem) {
    if (order.side === 'buy') wallet.asset += order.size
    else wallet.currency += order.size * order.price
  }

  private async saveWallet({ exchange, symbol, strategy }: WalletOpts) {
    const idStr = this.makeIdStr({ exchange, symbol, strategy })
    const time = new Date().getTime()
    const wallet = this.wallets.get(idStr)
    await dbDriver.wallet.save({ sessionId: this.sessionId, exchange, symbol, strategy, time, ...wallet })
  }

  private makeIdStr({ exchange, symbol, strategy }: WalletOpts) {
    return `${exchange}.${symbol}.${strategy}`
  }
}
