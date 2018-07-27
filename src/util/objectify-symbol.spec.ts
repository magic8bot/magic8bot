import { objectifySymbol, Symbol } from './objectify-symbol';
describe('objectify-symbol', () => {
  it('should objectify symbol from string', () => {
    const objSymbol = objectifySymbol('testexchange.ASSET-CURRENCY')

    expect(objSymbol.exchangeId).toEqual('testexchange')
    expect(objSymbol.productId).toEqual('ASSET-CURRENCY')
    expect(objSymbol.asset).toEqual('ASSET')
    expect(objSymbol.currency).toEqual('CURRENCY')
    expect(objSymbol.normalized).toEqual('testexchange.ASSET-CURRENCY')
  })

  it('should return same symbol from if object passed', () => {
    const objSymbol: Symbol = {
      exchangeId: 'testexchange',
      productId: 'ASSET-CURRENCY',
      asset: 'ASSET',
      currency: 'CURRENCY',
      normalized: 'testexchange.ASSET-CURRENCY',
    }

    expect(objSymbol.exchangeId).toEqual('testexchange')
    expect(objSymbol.productId).toEqual('ASSET-CURRENCY')
    expect(objSymbol.asset).toEqual('ASSET')
    expect(objSymbol.currency).toEqual('CURRENCY')
  })

  it('should fail on invalid symbol', () => {
    expect(() => objectifySymbol('InvalidSymbol')).toThrowError()
    expect(() => objectifySymbol('Invalid.Sym.bol')).toThrowError()
    expect(() => objectifySymbol('Invalid-Sym.bol')).toThrowError()
    expect(() => objectifySymbol('Invalid-Sym-bol')).toThrowError()
  })
})
