import { normalizeSymbol } from './normalize-symbol'

const symbolValidator = new RegExp('^([a-z0-9]*).(([A-Z0-9]*)-([A-Z0-9]*))$')

export interface Symbol {
  exchangeId: string
  productId: string
  asset: string
  currency: string
  normalized: string
}

export const objectifySymbol = (symbol): Symbol => {
  let rtn

  if (typeof symbol === 'string') {
    const s = normalizeSymbol(symbol)
    const validatedSymbol = symbolValidator.exec(s)
    if (validatedSymbol === null || validatedSymbol.length !== 5) {
      throw new Error(`Symbol ${symbol} (normalized: ${s}) is not valid`)
    }
    validatedSymbol.shift()
    const [exchangeId, productId, asset, currency] = validatedSymbol

    rtn = { exchangeId, productId, asset, currency, normalized: s }
  } else if (typeof symbol === 'object') {
    rtn = symbol
  }

  return rtn
}
