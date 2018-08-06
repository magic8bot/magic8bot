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
export interface SarOptions {
    af: number
    ep: number
    sar: number
    uptrend: boolean
}

export class SAR {
    public static calculate(sarState: SarOptions, periods: Record<string, number>[], startAccel = 0.02, accel = 0.02, maxAccel = 0.2): number {
        if (periods.length < 2) {
            return null
        }
        // Determine trend and adjust Acceleration Factor (af) based on pervious state
        // if previous sar is less then the current high its a downtrend
        // if previous sar is greater then current high its a uptrend
        // set any new Extreme Points (ep)
        if (sarState.uptrend) {
            if (sarState.sar <= periods[0].high) {
                sarState.uptrend = false
                sarState.ep = Math.max(periods[0].high, periods[1].high)
                sarState.af = startAccel
            } else {
                sarState.ep = Math.min(periods[0].low, periods[1].low, sarState.ep)
                sarState.af += accel
            }
        } else {
            if (sarState.sar >= periods[0].high) {
                sarState.uptrend = true
                sarState.ep = Math.min(periods[0].low, periods[1].low)
                sarState.af = startAccel
            } else {
                sarState.ep = Math.max(periods[0].high, periods[1].high, sarState.ep)
                sarState.af += accel
            }
        }
        // make sure af is within limits
        if (sarState.af > maxAccel) {
            sarState.af = maxAccel
        }
        // check trend and perform the correct formula
        // if uptrend else its downtrend
        if (sarState.uptrend) {
             sarState.sar += (sarState.af * (sarState.ep - sarState.sar))
        } else {
             sarState.sar -= (sarState.af * (sarState.sar - sarState.ep))
        }
        // sar cannot be higher then the current high of last 2 periods
        // else sar equals the high of last 2 periods
        if (Math.max(periods[0].high, periods[1].high) > sarState.sar) {
            sarState.sar = Math.max(periods[0].high, periods[1].high)
        }
        return sarState.sar
    }
}
