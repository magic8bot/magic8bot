import { Engine } from './engine'
import { sessionStore, TradeStore } from '@stores'
import { Conf, ExchangeConf } from '@m8bTypes'
import { ExchangeProvider } from '@exchange'

export class Core {
  constructor(private readonly conf: Conf) {}

  public async init() {
    const { exchanges, session_id, reset_profit } = this.conf

    // @todo(notVitaliy): Fix this shit... eventually
    if (!session_id || reset_profit) {
      await sessionStore.newSession()
    } else {
      await sessionStore.loadSession(session_id)
    }

    const exchangeProvider = new ExchangeProvider(exchanges)
    const tradeStore = new TradeStore()

    exchanges.forEach(async (exchangeConf) => {
      const engine = new Engine(exchangeProvider, tradeStore, this.mergeConfig(exchangeConf), this.conf.mode !== 'live')
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
