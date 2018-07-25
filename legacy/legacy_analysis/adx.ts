// ADX + DI
export const adx = (s, key, length) => {
  if (s.lookback[0] !== undefined) {
    const trueRange = Math.max(
      Math.max(s.period.high - s.period.low, Math.abs(s.period.high - s.lookback[0].close)),
      Math.abs(s.period.low - s.lookback[0].close)
    )
    const directionalMovementPlus =
      s.period.high - s.lookback[0].high > s.lookback[0].low - s.period.low
        ? Math.max(s.period.high - s.lookback[0].high, 0)
        : 0
    const directionalMovementMinus =
      s.lookback[0].low - s.period.low > s.period.high - s.lookback[0].high
        ? Math.max(s.lookback[0].low - s.period.low, 0)
        : 0

    s.period.SmoothedTrueRange =
      s.lookback[0].SmoothedTrueRange === undefined
        ? trueRange
        : s.lookback[0].SmoothedTrueRange - s.lookback[0].SmoothedTrueRange / length + trueRange
    s.period.SmoothedDirectionalMovementPlus =
      s.lookback[0].SmoothedDirectionalMovementPlus === undefined
        ? directionalMovementPlus
        : s.lookback[0].SmoothedDirectionalMovementPlus -
          s.lookback[0].SmoothedDirectionalMovementPlus / length +
          directionalMovementPlus
    s.period.SmoothedDirectionalMovementMinus =
      s.lookback[0].SmoothedDirectionalMovementMinus === undefined
        ? directionalMovementMinus
        : s.lookback[0].SmoothedDirectionalMovementMinus -
          s.lookback[0].SmoothedDirectionalMovementMinus / length +
          directionalMovementMinus

    s.period.DIPlus = (s.period.SmoothedDirectionalMovementPlus / s.period.SmoothedTrueRange) * 100
    s.period.DIMinus = (s.period.SmoothedDirectionalMovementMinus / s.period.SmoothedTrueRange) * 100
  }
  if (s.lookback.length > length) {
    const ADX = s.lookback.slice(0, length).reduce((sum, cur) => {
      const DX = (Math.abs(cur.DIPlus - cur.DIMinus) / (cur.DIPlus + cur.DIMinus)) * 100
      return sum + DX
    }, 0)

    s.period[key] = ADX / length
  }
}
