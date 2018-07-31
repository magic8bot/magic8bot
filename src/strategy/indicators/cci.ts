import { Average } from './average';

/**
 * @description Commodity Channel Index
 * @author @shawn8901
 *
 * @example CCI Calculation
 * CCI = (Typical Price  -  20-period SMA of TP) / (.015 x Mean Deviation)
 * Typical Price (TP) = (High + Low + Close)/3
 * Constant = .015
 * There are four steps to calculating the Mean Deviation. First, subtract the most recent 20-period average of the
 * typical price from each period's typical price. Second, take the absolute values of these numbers. Third,
 * sum the absolute values. Fourth, divide by the total number of periods (20).
 */
export class CCI {

    public static calculate(periods: Record<string, number>[], length: number, c = 0.015) {
        if (periods.length <= length) {
            return null
        }

        const [period] = periods
        const calcWindow = periods.slice(0, length)

        const tp = this.calculateTP(period)
        const tps = calcWindow.map((curPeriod) => this.calculateTP(curPeriod))
        const avgTp = Average.calculateValue(tps, length)
        const meanDev = Average.calculateValue(tps.map((curTp) => Math.abs(curTp - avgTp)), length)
        return (tp - avgTp) / (c * meanDev)
    }

    private static calculateTP({ high, low, close }: Record<string, number>) {
        return (high + low + close) / 3;
    }

}
