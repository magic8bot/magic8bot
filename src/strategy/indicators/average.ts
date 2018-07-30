/**
 * @description Average value
 * @author @shawn8901
 *
 * @example Calculates the average for a given timeframe
 * If the average should be calculated from a Record use Average.calculate, if
 * it should be calculated on custom values, use Average.calculateValue
 */
export class Average {
    public static calculate(periods: Record<string, number>[], length: number, source = 'close') {
        const values = periods.slice(0, length)
            .filter((v) => typeof v[source] === 'number')
            .map((v) => v[source])
        return this.calculateValue(values, length)
    }

    public static calculateValue(values: number[], length) {
        if (values.length < length) return null
        return values.reduce((sum, value) => sum + value) / length
    }
}
