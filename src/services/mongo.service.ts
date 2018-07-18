import { MongoClient, Db } from 'mongodb'
import { MongoConf } from '@zbTypes'

class MongoService {
  public connection: Db

  async connect({ username, password, authMechanism, host, port, replicaSet, db, connectionString }: MongoConf) {
    const conStr = connectionString
      ? connectionString
      : this.makeConnectionString(username, password, host, port, db, replicaSet, authMechanism)

    const mongo = await MongoClient.connect(
      conStr,
      { useNewUrlParser: true }
    )

    this.connection = mongo.db(db)
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

export const mongoService = new MongoService()
