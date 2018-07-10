import crypto from 'crypto'
import { Collection } from 'mongodb'

import { mongoService } from '../services/mongo.service'

import { BalanceStore } from './balance.store'
import { OrderStore } from './order.store'
import { TradeStore } from './trade.store'
import { PeriodStore } from './period.store'
import { OptionStore, Options } from './option.store'

interface SessionCollection {
  sessionId: string
  selector: string
  start_time: number
  last_run: number
}

interface SessionOpts {
  balance: {
    currency: number
    asset: number
    price: number
  }
}

export class SessionStore {
  public options: Options
  public balanceStore: BalanceStore
  public orderStore: OrderStore
  public tradeStore: TradeStore
  public periodStore: PeriodStore

  private sessionId: string
  private collection: Collection<SessionCollection> = mongoService.connection.collection('beta_sessions')

  constructor(private readonly selector: string, optionStore: OptionStore) {
    this.options = optionStore.options
    this.collection.createIndex({ sessionId: 1 })
    this.collection.createIndex({ selector: 1 })
  }

  async newSession(opts: SessionOpts) {
    this.sessionId = crypto.randomBytes(4).toString('hex')
    const now = +new Date()

    const session = {
      sessionId: this.sessionId,
      selector: this.selector,
      start_time: now,
      last_run: now,
    }

    await this.collection.save(session)

    const { balance } = opts
    await this.initBalance(balance)
    await this.initOrders()
    await this.initTrades()
  }

  async loadSession(sessionId: string) {
    const session = await this.collection.findOne({ sessionId })
    if (!session) throw new Error(`Invalid session id: ${sessionId}`)

    await this.collection.updateOne({ sessionId }, { last_run: +new Date() })
  }

  async initBalance({ currency, asset, price }: SessionOpts['balance']) {
    this.balanceStore = new BalanceStore(this.sessionId, this.selector)
    try {
      await this.balanceStore.loadBalance()
    } catch {
      await this.balanceStore.newBalance(currency, asset, price)
    }
  }

  async initOrders() {
    this.orderStore = new OrderStore(this.sessionId, this.selector)
    await this.orderStore.loadOrders()
  }

  async initTrades() {
    this.tradeStore = new TradeStore(this.selector)
    await this.tradeStore.loadTrades()
  }

  async initPeriods() {
    this.periodStore = new PeriodStore(this.options.period)
    this.periodStore.initPeriods(this.tradeStore.trades)
  }
}
