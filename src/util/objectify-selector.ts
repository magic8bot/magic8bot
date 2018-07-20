import { normalizeSelector } from './normalize-selector'

export interface Selector {
  exchangeId: string
  productId: string
  asset: string
  currency: string
  normalized: string
}

export const objectifySelector = (selector): Selector => {
  let rtn

  if (typeof selector === 'string') {
    const s = normalizeSelector(selector)

    const exchangeId = s.split('.')[0]
    const productId = s.split('.')[1]
    const asset = productId.split('-')[0]
    const currency = productId.split('-')[1]

    rtn = { exchangeId, productId, asset, currency, normalized: s }
  } else if (typeof selector === 'object') {
    rtn = selector
  }

  return rtn
}
