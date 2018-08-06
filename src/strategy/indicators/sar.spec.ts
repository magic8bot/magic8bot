import { SAR, SarOptions } from './sar'
import { candles } from './spec.helper'

describe('SAR', () => {
  let sarValue: SarOptions = {
    af: 0.02,
    ep: candles[18].high,
    sar: candles[18].high,
    uptrend: true,
  }
  it('should calculate the correct uptrend sar', () => {
    sarValue.sar = SAR.calculate(sarValue, candles.slice(0, 18))
    expect(sarValue.sar).toEqual(18.79)
  })
  sarValue = {
    af: 0.02,
    ep: candles[45].high,
    sar: candles[45].high,
    uptrend: true,
  }
  it('should calculate the correct downtrend sar', () => {
    sarValue.sar = SAR.calculate(sarValue, candles.slice(35, 45))
    expect(sarValue.sar).toEqual(19.93)
  })
  sarValue = {
    af: 0.02,
    ep: candles[45].high,
    sar: candles[45].high,
    uptrend: true,
  }
  it('should calculate the correct sar with trend reversal', () => {
    sarValue.sar = SAR.calculate(sarValue, candles.slice(15, 45))
    expect(sarValue.sar).toEqual(19.8334)
  })
  it('should return null with less then 2 candles', () => {
    sarValue.sar = SAR.calculate(sarValue, candles.slice(1, 1))
    expect(sarValue.sar).toEqual(null)
  })
  sarValue = {
    af: 0.03,
    ep: candles[15].high,
    sar: candles[15].high,
    uptrend: true,
  }
  it('should return correct sar with alternitive settings', () => {
    sarValue.sar = SAR.calculate(sarValue, candles.slice(1, 15), 0.03, 0.03, .3)
    // @todo Figure out what this value should actually be
    expect(sarValue.sar).toEqual(18.62)
  })
  // @todo add a test for extream af will need to add custom candles
})
