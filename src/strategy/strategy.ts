import { StrategyConf } from '@m8bTypes'
import { eventBus, EVENT } from '@lib'
import { PeriodStore, WalletStore } from '@stores'

import { strategyLoader, BaseStrategy } from './strategies'

export class StrategyProvider {
  private strategy: BaseStrategy
  private strategyName: string
  private periodStore: PeriodStore
  private lastSignal: 'buy' | 'sell' = null

  constructor(
    private readonly walletStore: WalletStore,
    private readonly exchange: string,
    private readonly symbol: string,
    private readonly strategyConf: StrategyConf
  ) {
    const { strategyName, period } = strategyConf
    this.strategyName = strategyName

    eventBus.subscribe({ event: EVENT.STRAT_SIGNAL, exchange, symbol, strategy: strategyName }, ({ signal }) =>
      this.onSignal(signal)
    )

    this.strategy = strategyLoader[strategyName]
    this.periodStore = new PeriodStore(period, exchange, symbol, strategyName)
  }

  public get prerollDone() {
    return this.strategy.prerollDone
  }

  public async init() {
    const walletOpts = {
      exchange: this.exchange,
      symbol: this.symbol,
      strategy: this.strategyName,
    }

    await this.walletStore.initWallet(walletOpts, this.strategyConf.share)
  }

  public async tick() {
    //
  }

  private onSignal(signal: 'buy' | 'sell') {
    if (!signal || signal === this.lastSignal) return
    this.lastSignal = signal
  }
}
