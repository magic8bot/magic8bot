import { candles } from './spec.helper';
import { Lowest } from './lowest';

describe('Lowest', () => {
    it('should calculate the highest close (default)', () => {
        expect(Lowest.calculate(candles.slice(0, 5), 4)).toEqual(17.48)
    })

    it('should calculate the highest open', () => {
        expect(Lowest.calculate(candles.slice(0, 5), 4, 'open')).toEqual(17.74)
    })

    it ('should return null, if not enough data', () => {
        expect(Lowest.calculate(candles.slice(0, 3), 4, 'close')).toBeNull()
    })
})
