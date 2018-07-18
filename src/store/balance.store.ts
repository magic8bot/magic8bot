import { Collection } from 'mongodb'
import { observable, action, transaction } from 'mobx'

import { mongoService } from '../services/mongo.service'

interface WalletItem {
  start: number
  current: number
}

interface BalanceCollection {
  selector: string
  sessionId: string
  time: number
  currency: WalletItem
  asset: WalletItem
  price: WalletItem
}

export class BalanceStore {
  @observable public currency: WalletItem
  @observable public asset: WalletItem
  @observable public price: WalletItem

  private collection: Collection<BalanceCollection> = mongoService.connection.collection('beta_balances')

  constructor(private readonly sessionId: string, private readonly selector: string) {
    this.collection.createIndex({ selector: 1 })
    this.collection.createIndex({ sessionId: 1})
    this.collection.createIndex({ time: 1})
  }

  @action
  async newBalance(currency: number, asset: number, price: number) {
    await transaction(async () => {
      this.currency = { start: currency, current: currency }
      this.asset = { start: asset, current: asset }
      this.price = { start: price, current: price }

      await this.save()
    })
  }

  @action
  async loadBalance() {
    const { sessionId, selector } = this
    const balance = await this.collection.findOne({ query: { sessionId, selector }, $orderBy: { time: -1 } })
    if (!balance) throw new Error(`Couldn\'t load balance for session (${sessionId}) and selector (${selector}).`)

    const { currency, asset, price } = balance

    transaction(() => {
      this.currency = currency
      this.asset = asset
      this.price = price
    })
  }

  async save() {
    await this.collection.save({
      selector: this.selector,
      sessionId: this.sessionId,
      time: +new Date(),
      currency: this.currency,
      asset: this.asset,
      price: this.price,
    })
  }

  @action
  async update(currency: number, asset: number, price: number) {
    await transaction(async () => {
      this.currency.current = currency
      this.asset.current = asset
      this.price.current = price

      await this.save()
    })
  }
}
