// Trend Continuation Factor, by M.H. Pee
export const tsf = (s, key, length, sourceKey) => {
  if (!sourceKey) sourceKey = 'close'
  if (s.lookback[0] !== undefined) {
    const xChange = s.period[sourceKey] - s.lookback[0][sourceKey]
    const xPlusChange = xChange > 0 ? xChange : 0
    const xMinusChange = xChange < 0 ? -1 * xChange : 0
    s.period.xPlusCF =
      xPlusChange === 0 ? 0 : (s.lookback[0].xPlusCF !== undefined ? s.lookback[0].xPlusCF : 1) + xPlusChange
    s.period.xMinusCF =
      xMinusChange === 0 ? 0 : (s.lookback[0].xMinusCF !== undefined ? s.lookback[0].xMinusCF : 1) + xMinusChange
    s.period.xPlus = xPlusChange - s.period.xMinusCF
    s.period.xMinus = xMinusChange - s.period.xPlusCF
  }
  if (s.lookback.length > length) {
    let xPlusTCF = 0
    let xMinusTCF = 0
    for (let i = length - 1; i >= 0; i--) {
      xPlusTCF += s.lookback[i].xPlus
      xMinusTCF += s.lookback[i].xMinus
    }
    s.period[key] = { plus: xPlusTCF, minus: xMinusTCF }
  }
}
