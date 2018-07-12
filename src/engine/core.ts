import { EventEmitter } from 'events'
import { terminal, ScreenBuffer } from 'terminal-kit'
import { progressBar } from '../gui'

import { timebucket } from '../util/timebucket'
import objectifySelector from '../util/objectify-selector'

import { Engine } from './engine'
import { SessionStore } from '../store/session.store'
import { Conf, EngineConf, Strategy, ExchangeConf } from '@zbTypes'
import { Exchange } from './exchange'
import { TradeStore } from '../store/trade.store'
import { TradesService } from '../services/trades.service'

interface EnginesMap {
  tradeStore: TradeStore
  events: EventEmitter
  engines: {
    config: EngineConf
    engine: Engine
  }[]
}

interface ExchangesMap {
  exchange: Exchange
  pairs: Map<string, EnginesMap>
}

export class Core {
  private startTime: number

  private exchangeEngines: Map<string, ExchangesMap> = new Map()

  private sessionStore: SessionStore
  private terminal

  constructor(private readonly conf: Conf) {
    this.sessionStore = new SessionStore()
    const { period_length, min_periods } = this.conf
    this.startTime = timebucket()
      .resize(period_length)
      .subtract(min_periods * 2)
      .toMilliseconds()

    this.terminal = terminal
  }

  async init() {
    const { exchanges, session_id, reset_profit } = this.conf

    if (!session_id || reset_profit) {
      await this.sessionStore.newSession()
    } else {
      await this.sessionStore.loadSession(session_id)
    }

    exchanges.forEach((strategy) => this.initExchange(strategy))
    this.backfill()
  }

  private initExchange({ name, auth, options: { base, strategies } }: ExchangeConf) {
    if (!this.exchangeEngines.has(name)) {
      const exchange = new Exchange(name, auth, this.conf.mode === 'paper')
      this.exchangeEngines.set(name, { exchange, pairs: new Map() })
    }

    const config = { ...this.conf, ...base }
    const { exchange } = this.exchangeEngines.get(name)

    strategies.forEach((strategy) => this.startEngine(config, name, exchange, strategy))
  }

  private startEngine(config, name: string, exchange: Exchange, strategy: Strategy) {
    const { selector, strategyName, ...stratConf } = strategy
    const engineConf = { ...config, ...stratConf } as EngineConf
    const selectorStr = `${exchange.name.toLowerCase()}.${selector}`
    const selectorObj = objectifySelector(selectorStr)

    const { pairs } = this.exchangeEngines.get(name)

    if (!pairs.has(selector)) {
      const opts = { selector: selectorObj, startTime: this.startTime }
      const tradesService = new TradesService(exchange, opts)
      const events = this.createTradeEvents(selectorStr)
      const tradeStore = new TradeStore(selectorStr, tradesService, events)

      pairs.set(selector, { tradeStore, events, engines: [] })
    }

    const { tradeStore, engines } = pairs.get(selector)
    const engine = new Engine(strategyName, exchange, engineConf, tradeStore)

    engines.push({ engine, config: engineConf })
  }

  private buffers = {}

  private createTradeEvents(selector: string) {
    const events = new EventEmitter()
    const buffer = ScreenBuffer.create({ dst: terminal })
    this.buffers[selector] = buffer
    const offset = Object.keys(this.buffers).length

    events.on('start', () => {
      const bar = progressBar({
        eta: true,
        title: selector,
        percent: true,
        dst: buffer,
      })
      buffer.draw()

      events.on('update', (percent: number) => {
        bar.update(percent)
        buffer.draw()
      })

      events.on('done', () => bar.update(1))
    })

    return events
  }

  async backfill() {
    terminal.fullscreen()
    terminal.hideCursor()
    this.exchangeEngines.forEach(({ pairs }) => {
      pairs.forEach(({ tradeStore, engines }) => {
        const days = engines.map(({ config }) => config.days).reduce((a, b) => a + b)
        tradeStore.backfill(days)
      })
    })
  }
}
