import { StrategyConf, Base } from '@m8bTypes'
import { TradeStore } from '@store'
import { ExchangeProvider } from '@exchange'

import { StrategyCore } from '@core'
import { TradeEngine } from '@engine'
import { logger } from '@util'
import { wsServer, ExchangeConfig, StrategyConfig } from '@lib'

export class ExchangeCore {
  private exchange: string
  private strategies: Set<string> = new Set()
  private strategyCores: Map<string, StrategyCore> = new Map()

  private tradeEngine: TradeEngine
  private readonly tradeStore = TradeStore.instance

  constructor(private readonly exchangeProvider: ExchangeProvider, { exchange, tradePollInterval }: ExchangeConfig) {
    this.exchange = exchange
    this.tradeEngine = new TradeEngine(this.exchangeProvider, exchange, tradePollInterval)

    wsServer.registerAction(`exchange-${exchange}-add-strategy`, (strategyConfig: StrategyConfig) => {
      this.addStrategy(strategyConfig)
    })

    wsServer.registerAction(`exchange-${exchange}-get-balance`, async () => {
      const balance = await this.getBalance()
      wsServer.broadcast(`exchange-${exchange}-balance`, { balance })
    })

    wsServer.registerAction(`exchange-${exchange}-sync-trades-start`, async ({ symbol, days }) => {
      this.tradeEngine.start(symbol, days)
    })

    wsServer.registerAction(`exchange-${exchange}-sync-trades-stop`, async ({ symbol }) => {
      this.tradeEngine.stop(symbol)
    })
  }

  public async addStrategy(strategyConfig: StrategyConfig) {
    const { strategy } = strategyConfig
    if (this.strategies.has(strategy)) return this.error(`Add Strategy Error: duplicate strategy: ${strategy}`)

    this.strategyCores.set(strategy, new StrategyCore(this.exchangeProvider, strategyConfig))
  }

  public async getBalance() {
    return this.exchangeProvider.getBalances(this.exchange)
  }

  private error(error: string) {
    logger.error(error)
    wsServer.broadcast('error', { error })
    return false
  }
}
