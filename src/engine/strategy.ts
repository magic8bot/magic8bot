import { StrategyConf } from '@m8bTypes'
import { eventBus, EVENT } from '@lib'
import { PeriodStore, WalletStore } from '@stores'

import { BaseStrategy, strategyLoader } from '@strategy'
import { Balances } from 'ccxt'

export class StrategyEngine {
  public strategyName: string

  private strategy: BaseStrategy
  private periodStore: PeriodStore
  private lastSignal: 'buy' | 'sell' = null

  constructor(
    private readonly walletStore: WalletStore,
    private readonly exchangeName: string,
    private readonly symbol: string,
    private readonly strategyConf: StrategyConf
  ) {
    const { strategyName, period } = strategyConf
    this.strategyName = strategyName

    eventBus.subscribe(
      { event: EVENT.STRAT_SIGNAL, exchange: exchangeName, symbol, strategy: strategyName },
      ({ signal }) => this.onSignal(signal)
    )

    this.strategy = strategyLoader[strategyName]
    this.periodStore = new PeriodStore(period, exchangeName, symbol, strategyName)
  }

  public async init(balances: Balances) {
    const walletOpts = {
      exchange: this.exchangeName,
      symbol: this.symbol,
      strategy: this.strategyName,
    }

    const [a, c] = this.symbol.split('/')
    const adjustment = { asset: balances[a].total, currency: balances[c].total }
    await this.walletStore.initWallet(walletOpts, adjustment)
  }

  public run() {
    this.strategy.prerollDone()
    this.tick()
  }

  public async tick() {
    //
  }

  private onSignal(signal: 'buy' | 'sell', force = false) {
    if (!signal || (signal === this.lastSignal && !force)) return
    this.lastSignal = signal

    // do the trade
  }
}
