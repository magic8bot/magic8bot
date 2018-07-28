import { Engine } from './engine'
import { sessionStore, TradeStore, MarkerStore, WalletStore } from '@stores'
import { Conf, ExchangeConf } from '@m8bTypes'
import { ExchangeProvider } from '@exchange'

export class Core {
  constructor(private readonly conf: Conf) {}

  public async init() {
    const { exchanges, reset_profit } = this.conf

    // @todo(notVitaliy): Fix this shit... eventually
    if (reset_profit) {
      await sessionStore.newSession()
    } else {
      await sessionStore.loadSession()
    }

    const exchangeProvider = new ExchangeProvider(exchanges)
    const walletStore = new WalletStore()
    const tradeStore = new TradeStore()
    const markerStore = new MarkerStore()

    exchanges.forEach((exchangeConf) => {
      const engine = new Engine(
        exchangeProvider,
        walletStore,
        tradeStore,
        markerStore,
        this.mergeConfig(exchangeConf),
        this.conf.mode !== 'live'
      )
      engine.init()
    })
  }

  private mergeConfig(exchangeConf: ExchangeConf): ExchangeConf {
    const { mode, session_id, exchanges, ...baseConf } = this.conf
    return {
      ...exchangeConf,
      options: {
        base: { ...baseConf, ...exchangeConf.options.base },
        strategies: exchangeConf.options.strategies,
      },
    }
  }
}
