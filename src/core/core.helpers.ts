import { ExchangeStore, StrategyStore, WalletStore } from '@store'
import { ExchangeCollection, StrategyCollection, wsServer, ExchangeConfig } from '@lib'
import { logger } from '@util'
import get from 'lodash.get'

export class CoreHelpers {
  public async getExchanges() {
    const exchanges = await ExchangeStore.instance.loadAll()
    return this.mapStrategiesToExchanges(exchanges)
  }

  public checkAddExchangeParams(exchangeConfig: ExchangeConfig) {
    if (!exchangeConfig.exchange) return this.error('field \'exchange\' is required')
    if (!exchangeConfig.tradePollInterval) return this.error('field \'tradePollInterval\' is required')
    if (exchangeConfig.exchange === 'chaos') return false
    if (!get(exchangeConfig, 'auth.apiKey')) return this.error('field \'auth.apiKey\' is required')
    if (!get(exchangeConfig, 'auth.secret')) return this.error('field \'auth.secret\' is required')
    return false
  }

  public error(error: string) {
    logger.error(error)
    return { error: `Core Error: ${error}` }
  }

  private async mapStrategiesToExchanges(exchanges: Partial<ExchangeCollection>[]) {
    return Promise.all(exchanges.map((exchange) => this.mapStrategyToExchange(exchange)))
  }

  private async mapStrategyToExchange(exchange: Partial<ExchangeCollection>) {
    const strategies = await this.getStrategies(exchange.exchange)
    return { ...exchange, strategies }
  }

  private async getStrategies(exchange: string) {
    const strategies = await StrategyStore.instance.loadAllForExchange(exchange)
    return this.mapWalletsToStrategies(strategies)
  }

  private mapWalletsToStrategies(strategies: StrategyCollection[]) {
    return Promise.all(strategies.map((strategy) => this.mapWalletToStrategy(strategy)))
  }

  private async mapWalletToStrategy(strategy: StrategyCollection) {
    const wallet = await this.getWallet(strategy.exchange, strategy.symbol, strategy.strategy)
    return { ...strategy, wallet }
  }

  private getWallet(exchange: string, symbol: string, strategy: string) {
    return WalletStore.instance.loadWallet({ exchange, symbol, strategy })
  }
}
