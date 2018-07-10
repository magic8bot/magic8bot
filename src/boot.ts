import EventEmitter from 'events'

import Config from './config'
import { IZenbotConfig } from '@types'

import { mongoService } from './services/mongo.service'

export default async () => {
  const zenbot: IZenbotConfig = Config()

  zenbot.conf.eventBus = new EventEmitter()
  await mongoService.connect(zenbot.conf.mongo)
  zenbot.conf.db = { mongo: mongoService.connection }

  return zenbot
}
