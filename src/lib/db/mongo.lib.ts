import { MongoClient, Db, Collection } from 'mongodb'

import { TradeCollection, Marker, SessionCollection, OrderCollection, Options, WalletCollection, AdjustmentCollection, ExchangeCollection, StrategyCollection } from './db.types'

export class MongoLib {
  private connection: Db

  private sessionCollection: Collection<SessionCollection>
  private tradeCollection: Collection<TradeCollection>
  private markerCollection: Collection<Marker>
  private orderCollection: Collection<OrderCollection>
  private walletCollection: Collection<WalletCollection>
  private adjustmentCollection: Collection<AdjustmentCollection>
  private exchangeCollection: Collection<ExchangeCollection>
  private strategyCollection: Collection<StrategyCollection>

  public async connect() {
    const mongo = await MongoClient.connect(
      this.makeConnectionString(),
      { useNewUrlParser: true }
    )

    this.connection = mongo.db(process.env.MONGO_DB)
  }

  public init() {
    this.sessionCollection = this.connection.collection('sessions')
    this.tradeCollection = this.connection.collection('trades')
    this.markerCollection = this.connection.collection('markers')
    this.orderCollection = this.connection.collection('orders')
    this.walletCollection = this.connection.collection('wallets')
    this.adjustmentCollection = this.connection.collection('adjustments')
    this.exchangeCollection = this.connection.collection('exchanges')
    this.strategyCollection = this.connection.collection('strategies')

    this.createIndexes()
  }

  get trade() {
    return this.tradeCollection
  }

  get session() {
    return this.sessionCollection
  }

  get marker() {
    return this.markerCollection
  }

  get order() {
    return this.orderCollection
  }

  get wallet() {
    return this.walletCollection
  }

  get adjustment() {
    return this.adjustmentCollection
  }

  get exchange() {
    return this.exchangeCollection
  }

  get strategy() {
    return this.strategyCollection
  }

  private createIndexes() {
    this.sessionCollection.createIndex({ sessionId: 1 })

    this.tradeCollection.createIndex({ id: 1 }, { unique: true })
    this.tradeCollection.createIndex({ exchange: 1, symbol: 1, timestamp: 1 })

    this.markerCollection.createIndex({ exchange: 1, symbol: 1, to: 1 })
    this.markerCollection.createIndex({ exchange: 1, symbol: 1, from: 1 })

    this.orderCollection.createIndex({ sessionId: 1 })
    this.orderCollection.createIndex({ sessionId: 1, exchange: 1, symbol: 1, timestamp: 1 })

    this.walletCollection.createIndex({ sessionId: 1 })
    this.walletCollection.createIndex({ sessionId: 1, exchange: 1, symbol: 1, strategy: 1 })

    this.adjustmentCollection.createIndex({ sessionId: 1 })
    this.adjustmentCollection.createIndex({ sessionId: 1, exchange: 1, symbol: 1, strategy: 1, timestamp: 1 })

    this.exchangeCollection.createIndex({ sessionId: 1 })
    this.exchangeCollection.createIndex({ sessionId: 1, exchange: 1 })

    this.strategyCollection.createIndex({ sessionId: 1 })
    this.strategyCollection.createIndex({ sessionId: 1, exchange: 1 })
    this.strategyCollection.createIndex({ sessionId: 1, exchange: 1, symbol: 1, strategy: 1 })
  }

  private makeConnectionString() {
    this.checkForEnvVars()
    const uname = process.env.MONGO_USERNAME ? encodeURIComponent(process.env.MONGO_USERNAME) : null
    const pword = process.env.MONGO_PASSWORD ? encodeURIComponent(process.env.MONGO_PASSWORD) : null
    const authStr = !uname ? '' : !pword ? `${uname}@` : `${uname}:${pword}@`
    const baseStr = `mongodb://${authStr}${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}`

    if (!(process.env.MONGO_REPLICA_SET && process.env.MONGO_AUTH_MECHANISM)) return baseStr
    if (process.env.MONGO_REPLICA_SET) return `${baseStr}?replicaSet=${process.env.MONGO_REPLICA_SET}`
    if (process.env.MONGO_AUTH_MECHANISM) return `${baseStr}?authMechanism=${process.env.MONGO_AUTH_MECHANISM}`

    return `${baseStr}?replicaSet=${process.env.MONGO_REPLICA_SET}&authMechanism=${process.env.MONGO_AUTH_MECHANISM}`
  }

  private checkForEnvVars() {
    if (!process.env.MONGO_HOST) throw new Error(`MONGO_HOST is not set.`)
    if (!process.env.MONGO_PORT) throw new Error(`MONGO_PORT is not set.`)
    if (!process.env.MONGO_DB) throw new Error(`MONGO_DB is not set.`)
  }
}
