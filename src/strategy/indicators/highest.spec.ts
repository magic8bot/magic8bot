import { candles } from './spec.helper';
import { Highest } from './highest';

describe('Highest', () => {
    it('should calculate the highest close (default)', () => {
        expect(Highest.calculate(candles.slice(0, 5), 4)).toEqual(18.83)
    })

    it('should calculate the highest open', () => {
        expect(Highest.calculate(candles.slice(0, 5), 4, 'open')).toEqual(18.54)
    })

    it ('should return null, if not enough data', () => {
        expect(Highest.calculate(candles.slice(0, 3), 4, 'close')).toBeNull()
    })
})
