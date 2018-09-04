import { Balances, Balance } from 'ccxt'
import { EventBusListener } from '@magic8bot/event-bus'

import { StrategyConf, Signal } from '@m8bTypes'
import { eventBus, EVENT, StrategyConfig, Adjustment } from '@lib'

import { PeriodStore, WalletStore } from '@store'
import { BaseStrategy, strategyLoader } from '@strategy'
import { ExchangeProvider } from '@exchange'
import { OrderEngine } from '@engine'

import { logger } from '@util'

enum STRAT_STATE {
  STOPPED,
  RUNNING,
}

export class StrategyCore {
  private strategy: string
  private exchange: string
  private symbol: string

  private baseStrategy: BaseStrategy

  private orderEngine: OrderEngine
  private lastSignal: Signal = null

  private signalListener: EventBusListener<{ signal: Signal }>

  private state: STRAT_STATE = STRAT_STATE.STOPPED

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

  public isRunning() {
    return this.state === STRAT_STATE.RUNNING
  }

  public start() {
    if (this.state === STRAT_STATE.RUNNING) return
    this.state = STRAT_STATE.RUNNING

    this.baseStrategy.prerollDone()

    const { exchange, symbol, strategy } = this
    PeriodStore.instance.start({ exchange, symbol, strategy })
    logger.info(`Starting Strategy ${strategy}`)
  }

  public stop() {
    if (this.state === STRAT_STATE.STOPPED) return
    this.state = STRAT_STATE.STOPPED

    const { exchange, symbol, strategy } = this
    PeriodStore.instance.stop({ exchange, symbol, strategy })
    logger.info(`Stopping Strategy ${strategy}`)
  }

  public async adjustWallet(adjustment: Adjustment) {
    const walletOpts = { exchange: this.exchange, symbol: this.symbol, strategy: this.strategy }
    await WalletStore.instance.initWallet(walletOpts, adjustment)
  }

  private onSignal(signal: Signal, force = false) {
    if (this.state === STRAT_STATE.STOPPED) return

    logger.info(`${this.strategy} sent ${signal}-signal (force: ${force})`)
    if (!signal || (signal === this.lastSignal && !force)) {
      logger.silly(`Signal ${signal} is skipped because its the same as the last-signal and not forced.`)
      return
    }
    this.lastSignal = signal

    if (signal === 'buy') this.orderEngine.executeBuy()
    else if (signal === 'sell') this.orderEngine.executeSell()
  }
}
