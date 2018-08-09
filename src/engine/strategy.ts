import { Balances, Balance } from 'ccxt'
import { EventBusListener } from '@magic8bot/event-bus'

import { StrategyConf } from '@m8bTypes'
import { eventBus, EVENT } from '@lib'
import { PeriodStore, WalletStore } from '@stores'
import { BaseStrategy, strategyLoader } from '@strategy'
import { ExchangeProvider } from '@exchange'

import { OrderEngine } from './order'
import { logger } from '@util'

export class StrategyEngine {
  public strategyName: string

  private strategy: BaseStrategy
  private orderEngine: OrderEngine
  private lastSignal: 'buy' | 'sell' = null

  private signalListener: EventBusListener<{ signal: 'buy' | 'sell' }>

  constructor(
    private readonly exchangeProvider: ExchangeProvider,
    private readonly exchangeName: string,
    private readonly symbol: string,
    private readonly strategyConf: StrategyConf
  ) {
    const { strategyName, period } = strategyConf
    this.strategyName = strategyName

    this.signalListener = eventBus.get(EVENT.STRAT_SIGNAL)(exchangeName)(symbol)(strategyName).listen
    this.signalListener(({ signal }) => this.onSignal(signal))

    this.strategy = new (strategyLoader(strategyName))(this.exchangeName, this.symbol, this.strategyConf)
    PeriodStore.instance.addSymbol(exchangeName, symbol, strategyName, { period, lookbackSize: 250 })

    this.orderEngine = new OrderEngine(this.exchangeProvider, this.exchangeName, this.symbol, this.strategyConf)
  }

  public async init(balances: Balances) {
    const walletOpts = {
      exchange: this.exchangeName,
      symbol: this.symbol,
      strategy: this.strategyName,
    }

    const [a, c] = this.symbol.split('/')
    const assetBalance = balances[a] ? balances[a] : ({ free: 0, total: 0, used: 0 } as Balance)
    const currencyBalance = balances[c] ? balances[c] : ({ free: 0, total: 0, used: 0 } as Balance)

    const adjustment = { asset: assetBalance.total * this.strategyConf.share.asset, currency: currencyBalance.total * this.strategyConf.share.currency }
    await WalletStore.instance.initWallet(walletOpts, { ...adjustment, type: 'init' })
  }

  public run() {
    logger.info(`Starting Strategy ${this.strategyName}`)
    this.strategy.prerollDone()
  }

  private onSignal(signal: 'buy' | 'sell', force = false) {
    logger.info({ signal })
    if (!signal || (signal === this.lastSignal && !force)) return
    this.lastSignal = signal

    if (signal === 'buy') this.orderEngine.executeBuy()
    else if (signal === 'sell') this.orderEngine.executeSell()
  }
}
