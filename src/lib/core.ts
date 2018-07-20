import { Engine } from './engine'
import { SessionStore } from '@stores'
import { Conf, ExchangeConf } from '@m8bTypes'

export class Core {
  private sessionStore: SessionStore

  constructor(private readonly conf: Conf) {
    this.sessionStore = new SessionStore()
  }

  async init() {
    const { exchanges, session_id, reset_profit } = this.conf

    // @todo(notVitaliy): Fix this shit... eventually
    if (!session_id || reset_profit) {
      await this.sessionStore.newSession()
    } else {
      await this.sessionStore.loadSession(session_id)
    }

    exchanges.forEach(async (exchangeConf) => {
      const engine = new Engine(this.mergeConfig(exchangeConf), this.conf.mode !== 'live')
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
