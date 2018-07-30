/**
 * @description Lowest value
 * @author @shawn8901
 *
 * @example Calculates the lowest value for a given timeframe
 * If the lowest should be calculated from a Record use Lowest.calculate, if
 * it should be calculated on custom values, use Lowest.calculateValue
 */
export class Lowest {
    public static calculate(periods: Record<string, number>[], length: number, source = 'close') {
        const values = periods.slice(0, length)
            .filter((v) => typeof v[source] === 'number')
            .map((v) => v[source])
        return this.calculateValue(values, length)
    }

    public static calculateValue(values: number[], length) {
        if (values.length < length) return null
        return Math.min(...values)
    }
}
