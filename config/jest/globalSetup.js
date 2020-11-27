const MongodbMemoryServer = require('mongodb-memory-server').default
const path = require('path')
const fs = require('fs')

const globalConfigPath = path.join(__dirname, 'globalConfig.json')

const mongod = new MongodbMemoryServer({
  instance: {
    dbName: 'jest',
  },
})

module.exports = async () => {
  const mongoConfig = {
    mongoDBName: 'jest',
    mongoUri: await mongod.getConnectionString(),
  }

  fs.writeFileSync(globalConfigPath, JSON.stringify(mongoConfig))

  global.__MONGOD__ = mongod
  process.env.MONGO_URL = mongoConfig.mongoUri
}
