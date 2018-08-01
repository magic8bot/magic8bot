/**
 * @description Highest value
 * @author @shawn8901
 *
 * @example Calculates the highest value for a given timeframe
 * If the highest should be calculated from a Record use Highest.calculate, if
 * it should be calculated on custom values, use Highest.calculateValue
 */
export class Highest {
    public static calculate(periods: Record<string, number>[], length: number, source = 'close') {
        const values = periods.slice(0, length)
            .filter((v) => typeof v[source] === 'number')
            .map((v) => v[source])
        return this.calculateValue(values, length)
    }

    public static calculateValue(values: number[], length) {
        if (values.length < length) return null
        return Math.max(...values)
    }
}
