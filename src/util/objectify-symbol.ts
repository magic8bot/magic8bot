import { normalizeSymbol } from './normalize-symbol'

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

    const exchangeId = s.split('.')[0]
    const productId = s.split('.')[1]
    const asset = productId.split('/')[0]
    const currency = productId.split('/')[1]

    rtn = { exchangeId, productId, asset, currency, normalized: s }
  } else if (typeof symbol === 'object') {
    rtn = symbol
  }

  return rtn
}
