import { MongoClient, Db, Collection } from 'mongodb'

import { MongoConf } from '@m8bTypes'
import { TradeCollection, Marker, SessionCollection, OrderCollection, Options } from './db.types'

export class MongoLib {
  private connection: Db

  private sessionCollection: Collection<SessionCollection>
  private optionCollection: Collection<Options>
  private tradeCollection: Collection<TradeCollection>
  private markerCollection: Collection<Marker>
  private orderCollection: Collection<OrderCollection>

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

  private createIndexes() {
    this.sessionCollection.createIndex({ sessionId: 1 })
    this.optionCollection.createIndex({ sessionId: 1 })
    this.tradeCollection.createIndex({ selector: 1 })
    this.tradeCollection.createIndex({ time: 1 })
    this.markerCollection.createIndex('to')
    this.markerCollection.createIndex('from')
    this.markerCollection.createIndex('time')
    this.orderCollection.createIndex({ selector: 1 })
    this.orderCollection.createIndex({ sessionId: 1 })
    this.orderCollection.createIndex({ time: 1 })
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
