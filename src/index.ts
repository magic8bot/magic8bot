import semver from 'semver'

import { zenbot } from './conf'

import { Conf } from '@zbTypes'
import { mongoService } from './services/mongo.service'

import { Core } from './engine'
// import { window } from './output'

const checkSharePercent = ({ exchanges }: Conf) => {
  exchanges.forEach(({ exchangeName, options: { strategies } }) => {
    const share = strategies.reduce((acc, { share }) => (acc += share), 0)
    if (share > 1) throw new Error(`Exchange ${exchangeName} over 100% share at ${share} --- ctrl+c to exit`)
  })
}

if (semver.gt('10.0.0', process.versions.node)) {
  console.error('You are running a node.js version older than 10.x.x, please upgrade via https://nodejs.org/en/')
  process.exit(1)
}

const run = async () => {
  try {
    checkSharePercent(zenbot.conf)

    await mongoService.connect(zenbot.mongo)
    const core = new Core(zenbot.conf)
    await core.init()
  } catch (e) {
    // window.setStatus(e.message)
  }
}

run()
