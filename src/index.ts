import dotenv from 'dotenv'
dotenv.config()

import semver from 'semver'

import { dbDriver } from '@magic8bot/db'

import { wsServer } from '@lib'
import { core } from '@core'
import { logger } from '@util'

if (semver.gt('10.0.0', process.versions.node)) {
  console.error('You are running a node.js version older than 10.x.x, please upgrade via https://nodejs.org/en/')
  process.exit(1)
}

const run = async () => {
  try {
    logger.info('Starting magic8bot...')

    await dbDriver.connect('mongo')

    wsServer.init()
    await core.init()
  } catch (e) {
    console.error(e)
  }
}

run()
