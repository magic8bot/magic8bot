import { candles } from './spec.helper'
import { CCI } from './cci'

describe('CCI', () => {

    it('should return null, if not enough data', () => {
        expect(CCI.calculate(candles.slice(0, 3), 4)).toBeNull()
    })

    it('Calculate the right value', () => {
        expect(CCI.calculate(candles.slice(0, 5), 4)).toEqual(27.860696517413054)
    })
})
