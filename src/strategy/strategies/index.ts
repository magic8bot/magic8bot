import { logger } from '@util'
export const strategyLoader = (strategyName: string) => {
  try {
    if (strategyName === null || strategyName === undefined || !strategyName.length) throw new Error('No strategy given.')
    logger.verbose(`Loading ${strategyName}....`)
    const strategyModule = require(`./${strategyName}`)
    if (!strategyModule.strategy) throw Error("Wrong exported strategy. Export Strategy as field 'strategy'.")
    logger.verbose(`Loaded ${strategyName} successfully.`)
    return strategyModule.strategy
  } catch (e) {
    throw new Error(`Strategy-Module ${strategyName} has thrown an error when loaded! Error-Message: ${e}`)
  }
}

export * from './base-strategy'
