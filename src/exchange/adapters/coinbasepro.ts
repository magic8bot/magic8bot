import { Trade } from 'ccxt'
import { ExchangeAdapter, tradePollIntervalField, authField, Field } from './base'

const secretField: Field = {
  name: 'password',
  type: 'password',
  prettyName: 'API password',
  description: 'The password you set for this API key/secret pair.',
}

// Making typescript happy
const authTypes = typeof authField.type !== 'string' ? [...authField.type] : null

const coinbaseproAuthFields: Field = {
  name: authField.name,
  type: [...authTypes, secretField],
}

export const coinbasepro: ExchangeAdapter = {
  fields: [tradePollIntervalField, coinbaseproAuthFields],
  description: 'US based digital asset exchange with trading UI, FIX API and REST API.',

  scan: 'back',
  ratelimit: 1000 / 3,

  mapTradeParams: (after: number) => {
    if (after === null) return null
    return { after }
  },

  getTradeCursor: (trade: Trade) => {
    return Number(trade.id)
  },
}
