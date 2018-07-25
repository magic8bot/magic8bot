import { MongoClient, Db, Collection } from 'mongodb'

import { MongoConf } from '@m8bTypes'
import { TradeCollection, Marker, SessionCollection, OrderCollection, Options, WalletCollection } from './db.types'

export class MongoLib {
  private connection: Db

  private sessionCollection: Collection<SessionCollection>
  private optionCollection: Collection<Options>
  private tradeCollection: Collection<TradeCollection>
  private markerCollection: Collection<Marker>
  private orderCollection: Collection<OrderCollection>
  private walletCollection: Collection<WalletCollection>

  public async connect({ username, password, authMechanism, host, port, replicaSet, db, connectionString }: MongoConf) {
    const conStr = connectionString
      ? connectionString
      : this.makeConnectionString(username, password, host, port, db, replicaSet, authMechanism)

    const mongo = await MongoClient.connect(
      conStr,
      { useNewUrlParser: true }
    )

    this.connection = mongo.db(db)
  }

  public init() {
    this.sessionCollection = this.connection.collection('sessions')
    this.optionCollection = this.connection.collection('options')
    this.tradeCollection = this.connection.collection('trades')
    this.markerCollection = this.connection.collection('markers')
    this.orderCollection = this.connection.collection('orders')
    this.walletCollection = this.connection.collection('wallets')

    this.createIndexes()
  }

  get trade() {
    return this.tradeCollection
  }

  get session() {
    return this.sessionCollection
  }

  get option() {
    return this.optionCollection
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

  private createIndexes() {
    this.sessionCollection.createIndex({ sessionId: 1 })

    this.optionCollection.createIndex({ sessionId: 1 })

    this.tradeCollection.createIndex([{ selector: 1 }, { time: 1 }])

    this.markerCollection.createIndex([{ to: 1 }, { from: 1 }, { time: 1 }])

    this.orderCollection.createIndex([{ sessionId: 1 }, { selector: 1 }, { time: 1 }])

    this.walletCollection.createIndex([{ sessionId: 1 }, { exchange: 1 }, { selector: 1 }, { strategy: 1 }])
  }

  private makeConnectionString(
    username: string,
    password: string,
    host: string,
    port: number,
    db: string,
    replicaSet: string,
    authMechanism: string
  ) {
    const uname = encodeURIComponent(username)
    const pword = password ? encodeURIComponent(password) : ''
    const authStr = !username ? '' : !pword ? `${uname}@` : `${uname}:${pword}@`
    const baseStr = `mongodb://${authStr}${host}:${port}/${db}`

    // prettier-ignore
    return replicaSet && authMechanism
      ? `${baseStr}?replicaSet=${replicaSet}&authMechanism=${authMechanism}`
      : replicaSet ? `${baseStr}?replicaSet=${replicaSet}`
      : authMechanism ? `${baseStr}?authMechanism=${authMechanism}`
      : baseStr
  }
}
