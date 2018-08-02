import semver from 'semver'
import { magic8bot } from './conf'
import { Conf } from '@m8bTypes'
import { Core, dbDriver, wsServer } from '@lib'

const checkSharePercent = ({ exchanges }: Conf) => {
  exchanges.forEach(({ exchangeName, options: { strategies } }) => {
    const shares: Record<string, number> = {}

    strategies.forEach(({ symbol, share }) => {
      const [asset, currency] = symbol.split('/')
      if (!shares[asset]) shares[asset] = 0
      if (!shares[currency]) shares[currency] = 0

      shares[asset] += share.asset
      shares[currency] += share.currency
    })

    const errors = Object.entries(shares)
      .filter(([key, value]) => value > 1)
      .reduce((acc, [key, value]) => {
        acc.push(`${key} @ ${value}`)
        return acc
      }, [])

    if (errors.length) {
      console.error(`Exchange ${exchangeName} ${errors.join(', ')} over 100% share`)
      process.exit()
    }
  })
}

if (semver.gt('10.0.0', process.versions.node)) {
  console.error('You are running a node.js version older than 10.x.x, please upgrade via https://nodejs.org/en/')
  process.exit(1)
}

const run = async () => {
  try {
    checkSharePercent(magic8bot.conf)

    await dbDriver.connect(
      'mongo',
      magic8bot.mongo
    )

    wsServer.init()
    const core = new Core(magic8bot.conf)
    await core.init()
  } catch (e) {
    console.error(e)
  }
}

run()
