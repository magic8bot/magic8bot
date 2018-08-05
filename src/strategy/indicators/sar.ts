/**
 * @description Parabolic SAR
 * @author @tsrnc2
 *
 * @example Formula taken from https://stockcharts.com
 * Because the formulas for rising and falling SAR are different,
 * it is easier to divide the calculation into two parts
 * Rising SAR
 *
 * Prior SAR: The SAR value for the previous period.
 *
 * Extreme Point (EP): The highest high of the current uptrend.
 *
 * Acceleration Factor (AF): Starting at .02, AF increases by .02(accel) each
 * time the extreme point makes a new high. AF can reach a maximum of
 *   .20(maxAccel), no matter how long the uptrend extends.
 *
 * Current SAR = Prior SAR + Prior AF(Prior EP - Prior SAR)
 *
 *   The Acceleration Factor is multiplied by the difference between the
 * Extreme Point and the prior period's SAR. This is then added to the
 * prior period's SAR. Note however that SAR can never be above the
 * prior two periods' lows. Should SAR be above one of those lows,
 * use the lowest of the two for SAR.
 *
 * Falling SAR
 *
 * Prior SAR: The SAR value for the previous period.
 *
 * Extreme Point (EP): The lowest low of the current downtrend.
 *
 * Acceleration Factor (AF): Starting at .02(startAccel), AF increases by .02(accel) each
 * time the extreme point makes a new low. AF can reach a maximum of
 *  .20(maxAccel), no matter how long the downtrend extends.
 *
 * Current SAR = Prior SAR - Prior AF(Prior SAR - Prior EP)
 *
 *   The Acceleration Factor is multiplied by the difference between the
 * Prior period's SAR and the Extreme Point. This is then subtracted
 * from the prior period's SAR. Note however that SAR can never be below
 * the prior two periods' highs. Should SAR be below one of those highs,
 * use the highest of the two for SAR.
 */
export class SAR {
    private af: number
    private ep: number
    private sar: number
    private uptrend: boolean
    private startAccel: number
    private accel: number
    private maxAccel: number
    
    constructor(periods: Record<string, number>[], startAccel: number, accel: number, maxAccel: number) {
        this.af = startAccel
        this.ep = periods[0].high
        this.sar = 0
        this.uptrend = true
        this.startAccel = startAccel
        this.accel = accel
        this.maxAccel = maxAccel
    }

    public calculate(periods: Record<string, number>[]): number {
        if (periods.length < 2) {
            return null
        }

        if (this.uptrend) {
            if (this.sar <= periods[0].high) {
                this.uptrend = false
                this.ep = Math.max(periods[0].high, periods[1].high)
                this.af = this.startAccel
            } else {
                this.ep = Math.min(periods[0].low, periods[0].low, this.ep)
                this.af += this.accel
            }
        } else {
            if (this.sar >= periods[0].high) {
                this.uptrend = true
                this.ep = Math.min(periods[0].low, periods[1].low)
                this.af = this.startAccel
            } else {
                this.ep = Math.max(periods[0].high, periods[1].high, this.ep)
                this.af += this.accel
            }
        }
        if (this.af > this.maxAccel) {
            this.af = this.maxAccel
        }
        if (this.uptrend) {
             this.sar += (this.af * (this.ep - this.sar))
        } else {
             this.sar -= (this.af * (this.sar - this.ep))
        }

        if ((periods[0].high > this.sar) || periods[1].high > this.sar)  {
            this.sar = Math.max(periods[0].high, periods[1].high)
        }
        return this.sar
    }
}
