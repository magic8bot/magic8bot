import { candles } from './spec.helper'
import { Momentum } from './momentum'

describe('Lowest', () => {
    it('should calculate the momentum close', () => {
        expect(Momentum.calculate(candles.slice(0, 3), 2)).toEqual(0.240000000000002)
    })

    it('should calculate the momentum for alternate OHLC', () => {
        expect(Momentum.calculate(candles.slice(0, 3), 2, 'open')).toEqual(-0.7100000000000009)
    })

    it('should calculate the momentum for number-series (p.e. other indicator)', () => {
        const values = [16.52, 17.05, 19.5]
        expect(Momentum.calculateValue(values, 2)).toEqual(-2.9800000000000004)
    })

    it('should return zero, if not enough data', () => {
        expect(Momentum.calculate(candles.slice(0, 1), 2)).toEqual(0)
    })
})
