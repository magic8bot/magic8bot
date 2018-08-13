import { Balances, Balance } from 'ccxt'
import { EventBusListener } from '@magic8bot/event-bus'

import { StrategyConf, Signal } from '@m8bTypes'
import { eventBus, EVENT, StrategyConfig } from '@lib'

import { PeriodStore, WalletStore } from '@store'
import { BaseStrategy, strategyLoader } from '@strategy'
import { ExchangeProvider } from '@exchange'
import { OrderEngine } from '@engine'

import { logger } from '@util'

export class StrategyCore {
  private strategy: string
  private exchange: string
  private symbol: string

  private baseStrategy: BaseStrategy

  private orderEngine: OrderEngine
  private lastSignal: Signal = null

  private signalListener: EventBusListener<{ signal: Signal }>

  constructor(private readonly exchangeProvider: ExchangeProvider, private readonly strategyConfig: StrategyConfig) {
    const { exchange, symbol, strategy, period } = strategyConfig
    this.exchange = exchange
    this.symbol = symbol
    this.strategy = strategy

    this.signalListener = eventBus.get(EVENT.STRAT_SIGNAL)(exchange)(symbol)(strategy).listen
    this.signalListener(({ signal }) => this.onSignal(signal))

    this.baseStrategy = new (strategyLoader(strategy))(exchange, symbol, this.strategyConfig)

    const storeOpts = { exchange, symbol, strategy }
    PeriodStore.instance.addSymbol(storeOpts, { period, lookbackSize: 250 })

    this.orderEngine = new OrderEngine(this.exchangeProvider, strategyConfig)
  }

  public async init(balances: Balances) {
    // const walletOpts = {
    //   exchange: this.exchange,
    //   symbol: this.symbol,
    //   strategy: this.strategy,
    // }
    // const [a, c] = this.symbol.split('/')
    // const assetBalance = balances[a] ? balances[a] : ({ free: 0, total: 0, used: 0 } as Balance)
    // const currencyBalance = balances[c] ? balances[c] : ({ free: 0, total: 0, used: 0 } as Balance)
    // const adjustment = { asset: assetBalance.total * this.strategyConfig.share.asset, currency: currencyBalance.total * this.strategyConfig.share.currency }
    // await WalletStore.instance.initWallet(walletOpts, { ...adjustment, type: 'init' })
  }

  public run() {
    this.baseStrategy.prerollDone()

    const { exchange, symbol, strategy } = this
    PeriodStore.instance.startPeriodEmitter({ exchange, symbol, strategy })
    logger.info(`Starting Strategy ${this.strategy}`)
  }

  private onSignal(signal: 'buy' | 'sell', force = false) {
    logger.info(`${this.strategy} sent ${signal}-signal (force: ${force})`)
    if (!signal || (signal === this.lastSignal && !force)) return
    this.lastSignal = signal

    if (signal === 'buy') this.orderEngine.executeBuy()
    else if (signal === 'sell') this.orderEngine.executeSell()
  }
}
