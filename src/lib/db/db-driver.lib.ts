import { MongoLib } from './mongo.lib'

type DbType = 'mongo' // | 'pg' | 'sqlite' | 'mysql'

class DbDriver {
  private db: MongoLib

  public async connect(dbType: DbType) {
    switch (dbType) {
      case 'mongo':
        this.db = new MongoLib()
        break
      // Add new database engine support here
      default:
        throw new Error(`${dbType} not yet supported.`)
    }
    await this.db.connect()
    this.db.init()
  }

  get trade() {
    return this.db.trade
  }

  get session() {
    return this.db.session
  }

  get marker() {
    return this.db.marker
  }

  get order() {
    return this.db.order
  }

  get wallet() {
    return this.db.wallet
  }

  get adjustment() {
    return this.db.adjustment
  }

  get exchange() {
    return this.db.exchange
  }

  get strategy() {
    return this.db.strategy
  }
}

export const dbDriver = new DbDriver()
