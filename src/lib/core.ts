import { ExchangeEngine } from '@engine'
import { SessionStore } from '@stores'
import { Conf, ExchangeConf } from '@m8bTypes'
import { ExchangeProvider } from '@exchange'

export class Core {
  constructor(private readonly conf: Conf) {}

  public async init() {
    const { exchanges, reset_profit } = this.conf

    // @todo(notVitaliy): Fix this shit... eventually
    if (reset_profit) {
      await SessionStore.instance.newSession()
    } else {
      await SessionStore.instance.loadSession()
    }

    const exchangeProvider = new ExchangeProvider(exchanges)

    exchanges.forEach((exchangeConf) => {
      const engine = new ExchangeEngine(exchangeProvider, this.mergeConfig(exchangeConf), this.conf.mode !== 'live')
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
