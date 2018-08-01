import { candles } from './spec.helper';
import { Average } from './average';

describe('Average', () => {
    it('should calculate the highest close (default)', () => {
        expect(Average.calculate(candles.slice(0, 5), 4)).toEqual(18.2025)
    })

    it('should calculate the highest open', () => {
        expect(Average.calculate(candles.slice(0, 5), 4, 'open')).toEqual(18.07)
    })

    it('should return null, if not enough data', () => {
        expect(Average.calculate(candles.slice(0, 3), 4, 'close')).toBeNull()
    })
})
