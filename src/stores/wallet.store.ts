import { dbDriver, Balance, Wallet, eventBus, EVENT, OrderItem } from '@lib'
import { sessionStore } from './session.store'

interface WalletOpts {
  exchange: string
  selector: string
  strategy: string
}

export class WalletStore {
  private sessionId: string = sessionStore.sessionId
  private wallets: Map<string, Wallet> = new Map()

  public addWallet(walletOpts: WalletOpts) {
    const idStr = this.makeIdStr(walletOpts)
    if (this.wallets.has(idStr)) return

    const { exchange, selector } = walletOpts

    eventBus.subscribe({ event: EVENT.ORDER_START, exchange, selector }, (order: OrderItem) =>
      this.onOrder('start', walletOpts, order)
    )

    eventBus.subscribe({ event: EVENT.ORDER_CANCEL, exchange, selector }, (order: OrderItem) =>
      this.onOrder('cancel', walletOpts, order)
    )

    eventBus.subscribe({ event: EVENT.ORDER_PARTIAL, exchange, selector }, (order: OrderItem) =>
      this.onOrder('partial', walletOpts, order)
    )

    eventBus.subscribe({ event: EVENT.ORDER_COMPLETE, exchange, selector }, (order: OrderItem) =>
      this.onOrder('complete', walletOpts, order)
    )

    this.wallets.set(idStr, null)
  }

  public async initWallet(walletOpts: WalletOpts, { currency, asset }: Balance, share: number) {
    const wallet: Wallet = { init: { currency, asset }, current: { currency, asset } }
    const idStr = this.makeIdStr(walletOpts)
    this.wallets.set(idStr, wallet)

    await this.saveWallet(walletOpts)
  }

  public async loadWallet({ exchange, selector, strategy }: WalletOpts) {
    const wallet = await dbDriver.wallet.findOne({ sessionId: this.sessionId, exchange, selector, strategy })

    const idStr = this.makeIdStr({ exchange, selector, strategy })
    const { init, current } = wallet
    this.wallets.set(idStr, { init, current })
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

  private async saveWallet({ exchange, selector, strategy }: WalletOpts) {
    const idStr = this.makeIdStr({ exchange, selector, strategy })
    const wallet = this.wallets.get(idStr)
    await dbDriver.wallet.save({ sessionId: this.sessionId, exchange, selector, strategy, ...wallet })
  }

  private makeIdStr({ exchange, selector, strategy }: WalletOpts) {
    return `${exchange}.${selector}.${strategy}`
  }
}
