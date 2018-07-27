import { normalizeSymbol } from './normalize-symbol';

describe('normalize-Symbol', () => {
  it('should normalize symbol from upper string', () => {
    const normalized = normalizeSymbol('TESTEXCHANGE.ASSET-CURRENCY')
    expect(normalized).toEqual('testexchange.ASSET-CURRENCY')
  })

  it('should normalize symbol from lower string', () => {
    const normalized = normalizeSymbol('testexchange.asset-currency')
    expect(normalized).toEqual('testexchange.ASSET-CURRENCY')
  })

  it('should normalize symbol from camelCase string', () => {
    const normalized = normalizeSymbol('TestExchange.Asset-Currency')
    expect(normalized).toEqual('testexchange.ASSET-CURRENCY')
  })

  it('should throw error on symbol without .', () => {
    const symbolName = 'InvalidSymbolName'
    expect(() => normalizeSymbol(symbolName)).toThrowError(`Invalid Symbol ${symbolName}`)
  })

  it('should throw error on symbol with more .', () => {
    const symbolName = 'Invalid.Symbol.Name'
    expect(() => normalizeSymbol(symbolName)).toThrowError(`Invalid Symbol ${symbolName}`)
  })
})
