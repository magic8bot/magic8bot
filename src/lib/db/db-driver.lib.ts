import { MongoConf } from '@m8bTypes'
import { MongoLib } from './mongo.lib'

type DbType = 'mongo' // | 'pg' | 'sqlite' | 'mysql'

class DbDriver {
  private db: MongoLib

  public async connect(dbType: DbType, dbConfig: MongoConf) {
    if (dbType === 'mongo') this.db = new MongoLib()
    else throw new Error(`${dbType} not yet supported.`)

    await this.db.connect(dbConfig)
    this.db.init()
  }

  get trade() {
    return this.db.trade
  }

  get session() {
    return this.db.session
  }

  get option() {
    return this.db.option
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
}

export const dbDriver = new DbDriver()
