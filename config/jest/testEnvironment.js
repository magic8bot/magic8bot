const NodeEnvironment = require('jest-environment-node')
const path = require('path')
const fs = require('fs')

const globalConfigPath = path.join(__dirname, 'globalConfig.json')

module.exports = class MongoEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config)
  }

  setup() {
    const globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'))
    const { MongoClient } = require('mongodb')

    return MongoClient.connect(
      globalConfig.mongoUri,
      { useNewUrlParser: true }
    )
      .then((connection) => {
        return connection.db(globalConfig.mongoDBName)
      })
      .then((db) => {
        this.global.db = db
      })
      .then(() => {
        super.setup()
      })
  }

  async teardown() {
    await super.teardown()
  }

  runScript(script) {
    return super.runScript(script)
  }
}
