const NodeEnvironment = require('jest-environment-node')
const path = require('path')
const fs = require('fs')

const globalConfigPath = path.join(__dirname, 'globalConfig.json')

module.exports = class MongoEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config)
  }

  async setup() {
    const globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'))

    const { MongoClient } = require('mongodb')
    const connection = await MongoClient.connect(
      globalConfig.mongoUri,
      { useNewUrlParser: true }
    )

    this.global.db = await connection.db(globalConfig.mongoDBName)

    await super.setup()
  }

  async teardown() {
    await super.teardown()
  }

  runScript(script) {
    return super.runScript(script)
  }
}
