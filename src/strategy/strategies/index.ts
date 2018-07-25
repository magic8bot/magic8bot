import { Macd } from './macd'

export const strategyLoader = (strategyName: string) => {
  switch (strategyName) {
    case 'macd':
      return Macd

    default:
      throw new Error(`${strategyName} not implemented yet.`)
  }
}

export * from './base-strategy'
